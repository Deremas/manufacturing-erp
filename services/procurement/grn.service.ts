import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { postProcurementReceiptDocument } from "@/services/inventory/module-integration.service";
import {
  approveProcurementApproval,
  ensureProcurementCanPost,
  nextProcurementDocumentNumber,
  normalizeProcurementStatus,
  rejectProcurementApproval,
  syncProcurementApproval,
  type ProcurementStatus,
  type Tx,
  writeProcurementAudit,
  writeProcurementHistory,
} from "@/services/procurement/procurement-shared.service";

export interface GoodsReceiptLineInput {
  poItemId?: string | null;
  itemId: string;
  uomId?: string | null;
  orderedQty?: number;
  previouslyReceivedQty?: number;
  receivedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  unitCost?: number;
  taxAmount?: number;
  remarks?: string;
}

export interface GoodsReceiptSummary {
  id: string;
  grnNo: string;
  grnDate: string;
  poId: string | null;
  poNo: string | null;
  supplierId: string;
  supplierName: string;
  receivingLocationId: string;
  locationName: string;
  status: ProcurementStatus;
  remarks: string;
  createdById: string;
  createdByName: string;
  itemCount: number;
  totalAmount: number;
}

export interface GoodsReceiptDetail extends GoodsReceiptSummary {
  deliveryNoteNo: string;
  supplierInvoiceNo: string;
  vehiclePlate: string;
  deliveredBy: string;
  receivedById: string | null;
  receivedByName: string | null;
  subtotal: number;
  taxAmount: number;
  items: Array<{
    id: string;
    poItemId: string | null;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomId: string | null;
    uomName: string | null;
    orderedQty: number;
    previouslyReceivedQty: number;
    remainingQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    unitCost: number;
    taxAmount: number;
    lineTotal: number;
    remarks: string;
  }>;
}

interface GoodsReceiptPayload {
  grnDate: string;
  poId?: string | null;
  supplierId: string;
  receivingLocationId: string;
  deliveryNoteNo?: string;
  supplierInvoiceNo?: string;
  vehiclePlate?: string;
  deliveredBy?: string;
  receivedById?: string | null;
  remarks?: string;
  status?: ProcurementStatus;
  approverId?: string | null;
  createdById: string;
  updatedById?: string | null;
  lineItems: GoodsReceiptLineInput[];
}

function validateLineItems(items: GoodsReceiptLineInput[]) {
  const filtered = items.filter((item) => item.itemId && Number(item.receivedQty ?? item.acceptedQty ?? 0) > 0);
  if (filtered.length === 0) {
    throw new Error("At least one GRN line with received quantity greater than zero is required");
  }

  return filtered.map((item) => {
    const orderedQty = Number(item.orderedQty ?? 0);
    const previouslyReceivedQty = Number(item.previouslyReceivedQty ?? 0);
    const receivedQty = Number(item.receivedQty ?? item.acceptedQty ?? 0);
    const acceptedQty = Number(item.acceptedQty ?? receivedQty);
    const rejectedQty = Number(item.rejectedQty ?? Math.max(receivedQty - acceptedQty, 0));
    const unitCost = Number(item.unitCost ?? 0);
    const taxAmount = Number(item.taxAmount ?? 0);
    if (receivedQty <= 0) {
      throw new Error("Received quantity must be greater than zero");
    }
    if (acceptedQty < 0 || rejectedQty < 0) {
      throw new Error("Accepted and rejected quantities cannot be negative");
    }
    if (acceptedQty + rejectedQty !== receivedQty) {
      throw new Error("Accepted quantity plus rejected quantity must equal received quantity");
    }

    return {
      ...item,
      orderedQty,
      previouslyReceivedQty,
      receivedQty,
      acceptedQty,
      rejectedQty,
      unitCost,
      taxAmount,
      lineTotal: acceptedQty * unitCost + taxAmount,
    };
  });
}

function totals(items: ReturnType<typeof validateLineItems>) {
  return items.reduce(
    (sum, item) => ({
      subtotal: sum.subtotal + item.acceptedQty * item.unitCost,
      taxAmount: sum.taxAmount + item.taxAmount,
      totalAmount: sum.totalAmount + item.lineTotal,
    }),
    { subtotal: 0, taxAmount: 0, totalAmount: 0 },
  );
}

async function ensureDraftEditable(tx: Tx, id: string) {
  const rows = await tx<Array<{ status: ProcurementStatus }>>`
    SELECT status
    FROM "GoodsReceipt"
    WHERE id = ${id}
    LIMIT 1
  `;

  const current = rows[0];
  if (!current) {
    throw new Error("Goods receipt not found");
  }
  if (current.status === "POSTED" || current.status === "CANCELLED") {
    throw new Error("Posted or cancelled goods receipt cannot be edited");
  }
}

async function validateAgainstPurchaseOrder(poId: string | null | undefined, items: ReturnType<typeof validateLineItems>) {
  if (!poId) {
    return;
  }

  const poItems = await sql<
    Array<{
      id: string;
      itemId: string;
      orderedQty: number;
      receivedQty: number;
    }>
  >`
    SELECT
      poi.id,
      poi."itemId",
      poi."orderedQty",
      poi."receivedQty"
    FROM "PurchaseOrderItem" poi
    WHERE poi."poId" = ${poId}
  `;

  const poMap = new Map(poItems.map((row) => [row.id, row]));

  for (const item of items) {
    if (!item.poItemId) {
      continue;
    }
    const poItem = poMap.get(item.poItemId);
    if (!poItem) {
      throw new Error("GRN item references a purchase order line that does not exist");
    }
    if (poItem.itemId !== item.itemId) {
      throw new Error("GRN item does not match the referenced purchase order item");
    }
    const maxReceivable = Number(poItem.orderedQty ?? 0) - Number(item.previouslyReceivedQty ?? poItem.receivedQty ?? 0);
    if (item.receivedQty > maxReceivable) {
      throw new Error("Received quantity cannot exceed the remaining purchase order quantity");
    }
  }
}

async function writeItems(tx: Tx, grnId: string, items: ReturnType<typeof validateLineItems>) {
  for (const item of items) {
    await tx`
      INSERT INTO "GoodsReceiptItem" (
        id, "goodsReceiptId", "poItemId", "itemId", "uomId", "orderedQty", "previouslyReceivedQty",
        "quantityReceived", "acceptedQty", "rejectedQty", "unitCost", "taxAmount", "lineTotal", remarks
      )
      VALUES (
        ${randomUUID()},
        ${grnId},
        ${item.poItemId ?? null},
        ${item.itemId},
        ${item.uomId ?? null},
        ${item.orderedQty},
        ${item.previouslyReceivedQty},
        ${item.receivedQty},
        ${item.acceptedQty},
        ${item.rejectedQty},
        ${item.unitCost},
        ${item.taxAmount},
        ${item.lineTotal},
        ${item.remarks ?? null}
      )
    `;
  }
}

async function syncPurchaseOrderReceiptStatus(tx: Tx, poId: string) {
  await tx`
    UPDATE "PurchaseOrderItem" poi
    SET "receivedQty" = COALESCE(agg."receivedQty", 0)
    FROM (
      SELECT
        gri."poItemId" AS id,
        COALESCE(SUM(gri."acceptedQty"), 0)::double precision AS "receivedQty"
      FROM "GoodsReceiptItem" gri
      INNER JOIN "GoodsReceipt" gr ON gr.id = gri."goodsReceiptId"
      WHERE gr."poId" = ${poId}
        AND gr.status = 'POSTED'
        AND gri."poItemId" IS NOT NULL
      GROUP BY gri."poItemId"
    ) agg
    WHERE poi.id = agg.id
  `;

  await tx`
    UPDATE "PurchaseOrderItem"
    SET "receivedQty" = 0
    WHERE "poId" = ${poId}
      AND id NOT IN (
        SELECT DISTINCT "poItemId"
        FROM "GoodsReceiptItem" gri
        INNER JOIN "GoodsReceipt" gr ON gr.id = gri."goodsReceiptId"
        WHERE gr."poId" = ${poId}
          AND gr.status = 'POSTED'
          AND gri."poItemId" IS NOT NULL
      )
  `;

  const rows = await tx<Array<{ totalItems: number; fullyReceivedItems: number; receivedItems: number }>>`
    SELECT
      COUNT(*)::int AS "totalItems",
      COUNT(*) FILTER (WHERE "receivedQty" >= "orderedQty")::int AS "fullyReceivedItems",
      COUNT(*) FILTER (WHERE "receivedQty" > 0)::int AS "receivedItems"
    FROM "PurchaseOrderItem"
    WHERE "poId" = ${poId}
  `;

  const stats = rows[0];
  const nextStatus =
    Number(stats?.receivedItems ?? 0) <= 0
      ? "APPROVED"
      : Number(stats?.fullyReceivedItems ?? 0) >= Number(stats?.totalItems ?? 0)
        ? "RECEIVED"
        : "PARTIALLY_RECEIVED";

  await tx`
    UPDATE "PurchaseOrder"
    SET status = ${nextStatus}, "updatedAt" = NOW()
    WHERE id = ${poId}
      AND status <> 'CANCELLED'
      AND status <> 'CLOSED'
  `;
}

export async function listGoodsReceipts(): Promise<GoodsReceiptSummary[]> {
  try {
    return await sql<Array<GoodsReceiptSummary>>`
      SELECT
        gr.id,
        gr."grnNo",
        gr."grnDate"::text,
        gr."poId",
        po."poNo",
        gr."supplierId",
        s.name AS "supplierName",
        gr."receivingLocationId",
        l."locationName" AS "locationName",
        gr.status,
        COALESCE(gr.remarks, '') AS remarks,
        gr."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(gri.id), 0)::int AS "itemCount",
        COALESCE(gr."totalAmount", 0) AS "totalAmount"
      FROM "GoodsReceipt" gr
      INNER JOIN "Supplier" s ON s.id = gr."supplierId"
      INNER JOIN "Location" l ON l.id = gr."receivingLocationId"
      INNER JOIN "User" u ON u.id = gr."createdById"
      LEFT JOIN "PurchaseOrder" po ON po.id = gr."poId"
      LEFT JOIN "GoodsReceiptItem" gri ON gri."goodsReceiptId" = gr.id
      GROUP BY gr.id, po."poNo", s.name, l."locationName", u.name
      ORDER BY gr."grnDate" DESC, gr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getGoodsReceiptById(id: string): Promise<GoodsReceiptDetail | null> {
  try {
    const rows = await sql<Array<GoodsReceiptDetail>>`
      SELECT
        gr.id,
        gr."grnNo",
        gr."grnDate"::text,
        gr."poId",
        po."poNo",
        gr."supplierId",
        s.name AS "supplierName",
        gr."receivingLocationId",
        l."locationName" AS "locationName",
        gr.status,
        COALESCE(gr.remarks, '') AS remarks,
        gr."createdById",
        createdBy.name AS "createdByName",
        COALESCE(COUNT(gri.id), 0)::int AS "itemCount",
        COALESCE(gr."deliveryNoteNo", '') AS "deliveryNoteNo",
        COALESCE(gr."supplierInvoiceNo", '') AS "supplierInvoiceNo",
        COALESCE(gr."vehiclePlate", '') AS "vehiclePlate",
        COALESCE(gr."deliveredBy", '') AS "deliveredBy",
        gr."receivedById",
        receiver.name AS "receivedByName",
        COALESCE(gr.subtotal, 0) AS subtotal,
        COALESCE(gr."taxAmount", 0) AS "taxAmount",
        COALESCE(gr."totalAmount", 0) AS "totalAmount"
      FROM "GoodsReceipt" gr
      INNER JOIN "Supplier" s ON s.id = gr."supplierId"
      INNER JOIN "Location" l ON l.id = gr."receivingLocationId"
      INNER JOIN "User" createdBy ON createdBy.id = gr."createdById"
      LEFT JOIN "User" receiver ON receiver.id = gr."receivedById"
      LEFT JOIN "PurchaseOrder" po ON po.id = gr."poId"
      LEFT JOIN "GoodsReceiptItem" gri ON gri."goodsReceiptId" = gr.id
      WHERE gr.id = ${id}
      GROUP BY gr.id, po."poNo", s.name, l."locationName", createdBy.name, receiver.name
      LIMIT 1
    `;

    const header = rows[0];
    if (!header) return null;

    const items = await sql<GoodsReceiptDetail["items"]>`
      SELECT
        gri.id,
        gri."poItemId",
        gri."itemId",
        i."itemCode",
        i."itemName",
        gri."uomId",
        u.name AS "uomName",
        COALESCE(gri."orderedQty", 0) AS "orderedQty",
        COALESCE(gri."previouslyReceivedQty", 0) AS "previouslyReceivedQty",
        GREATEST(COALESCE(gri."orderedQty", 0) - COALESCE(gri."previouslyReceivedQty", 0), 0)::double precision AS "remainingQty",
        COALESCE(gri."quantityReceived", 0) AS "receivedQty",
        COALESCE(gri."acceptedQty", COALESCE(gri."quantityReceived", 0)) AS "acceptedQty",
        COALESCE(gri."rejectedQty", 0) AS "rejectedQty",
        COALESCE(gri."unitCost", 0) AS "unitCost",
        COALESCE(gri."taxAmount", 0) AS "taxAmount",
        COALESCE(gri."lineTotal", (COALESCE(gri."acceptedQty", COALESCE(gri."quantityReceived", 0)) * COALESCE(gri."unitCost", 0))) AS "lineTotal",
        COALESCE(gri.remarks, '') AS remarks
      FROM "GoodsReceiptItem" gri
      INNER JOIN "Item" i ON i.id = gri."itemId"
      LEFT JOIN "Unit" u ON u.id = COALESCE(gri."uomId", i."uomId")
      WHERE gri."goodsReceiptId" = ${id}
      ORDER BY i."itemCode" ASC
    `;

    return { ...header, items };
  } catch {
    return null;
  }
}

export async function getGoodsReceiptPrefillFromPurchaseOrder(poId: string) {
  const headers = await sql<
    Array<{
      id: string;
      poNo: string;
      supplierId: string;
      deliveryLocationId: string;
    }>
  >`
    SELECT id, "poNo", "supplierId", "deliveryLocationId"
    FROM "PurchaseOrder"
    WHERE id = ${poId}
      AND status IN ('APPROVED', 'PARTIALLY_RECEIVED')
    LIMIT 1
  `;

  const header = headers[0];
  if (!header) return null;

  const items = await sql<
    Array<{
      poItemId: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      uomId: string | null;
      uomName: string | null;
      orderedQty: number;
      previouslyReceivedQty: number;
      remainingQty: number;
      unitCost: number;
      taxAmount: number;
    }>
  >`
    SELECT
      poi.id AS "poItemId",
      poi."itemId",
      i."itemCode",
      i."itemName",
      poi."uomId",
      u.name AS "uomName",
      poi."orderedQty",
      poi."receivedQty" AS "previouslyReceivedQty",
      GREATEST(poi."orderedQty" - poi."receivedQty", 0)::double precision AS "remainingQty",
      poi."unitPrice" AS "unitCost",
      poi."taxAmount"
    FROM "PurchaseOrderItem" poi
    INNER JOIN "Item" i ON i.id = poi."itemId"
    LEFT JOIN "Unit" u ON u.id = poi."uomId"
    WHERE poi."poId" = ${poId}
      AND GREATEST(poi."orderedQty" - poi."receivedQty", 0) > 0
    ORDER BY i."itemCode" ASC
  `;

  return { header, items };
}

export async function createGoodsReceipt(payload: GoodsReceiptPayload) {
  const items = validateLineItems(payload.lineItems);
  await validateAgainstPurchaseOrder(payload.poId, items);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const grnNo = await nextProcurementDocumentNumber(tx, "GRN", "Goods Receipt");

    await tx`
      INSERT INTO "GoodsReceipt" (
        id, "grnNo", "grnDate", "poId", "supplierId", "locationId", "receivingLocationId", "deliveryNoteNo",
        "supplierInvoiceNo", "vehiclePlate", "deliveredBy", "receivedById", status, subtotal, "taxAmount",
        "totalAmount", remarks, "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${grnNo},
        ${new Date(payload.grnDate)},
        ${payload.poId ?? null},
        ${payload.supplierId},
        ${payload.receivingLocationId},
        ${payload.receivingLocationId},
        ${payload.deliveryNoteNo ?? null},
        ${payload.supplierInvoiceNo ?? null},
        ${payload.vehiclePlate ?? null},
        ${payload.deliveredBy ?? null},
        ${payload.receivedById ?? null},
        ${status},
        ${amountTotals.subtotal},
        ${amountTotals.taxAmount},
        ${amountTotals.totalAmount},
        ${payload.remarks ?? null},
        ${payload.createdById},
        ${payload.updatedById ?? payload.createdById},
        NOW(),
        NOW()
      )
    `;

    await writeItems(tx, id, items);
    await syncProcurementApproval(tx, {
      referenceType: "procurement.grn",
      referenceId: id,
      documentType: "grn",
      status,
      requestedById: payload.createdById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.grn", "CREATE", id, payload);
    await writeProcurementHistory(tx, "procurement.grn", id, "CREATE", payload.createdById, payload.remarks);
    return { id, grnNo };
  });
}

export async function updateGoodsReceipt(id: string, payload: GoodsReceiptPayload) {
  const items = validateLineItems(payload.lineItems);
  await validateAgainstPurchaseOrder(payload.poId, items);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    await ensureDraftEditable(tx, id);

    await tx`
      UPDATE "GoodsReceipt"
      SET
        "grnDate" = ${new Date(payload.grnDate)},
        "poId" = ${payload.poId ?? null},
        "supplierId" = ${payload.supplierId},
        "locationId" = ${payload.receivingLocationId},
        "receivingLocationId" = ${payload.receivingLocationId},
        "deliveryNoteNo" = ${payload.deliveryNoteNo ?? null},
        "supplierInvoiceNo" = ${payload.supplierInvoiceNo ?? null},
        "vehiclePlate" = ${payload.vehiclePlate ?? null},
        "deliveredBy" = ${payload.deliveredBy ?? null},
        "receivedById" = ${payload.receivedById ?? null},
        status = ${status},
        subtotal = ${amountTotals.subtotal},
        "taxAmount" = ${amountTotals.taxAmount},
        "totalAmount" = ${amountTotals.totalAmount},
        remarks = ${payload.remarks ?? null},
        "updatedById" = ${payload.updatedById ?? payload.createdById},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await tx`DELETE FROM "GoodsReceiptItem" WHERE "goodsReceiptId" = ${id}`;
    await writeItems(tx, id, items);
    await syncProcurementApproval(tx, {
      referenceType: "procurement.grn",
      referenceId: id,
      documentType: "grn",
      status,
      requestedById: payload.createdById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.grn", "UPDATE", id, payload);
    await writeProcurementHistory(tx, "procurement.grn", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function approveGoodsReceipt(id: string, userId: string) {
  const receipt = await getGoodsReceiptById(id);
  if (!receipt) throw new Error("Goods receipt not found");
  if (receipt.status === "POSTED") throw new Error("Posted goods receipt cannot be approved again");
  if (receipt.status === "CANCELLED") throw new Error("Cancelled goods receipt cannot be approved");

  await approveProcurementApproval("procurement.grn", id, userId);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "GoodsReceipt"
      SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.grn", "APPROVE", id, { id });
    await writeProcurementHistory(tx, "procurement.grn", id, "APPROVE", userId, receipt.grnNo);
  });

  return { id };
}

export async function rejectGoodsReceipt(id: string, userId: string, comment?: string) {
  const receipt = await getGoodsReceiptById(id);
  if (!receipt) throw new Error("Goods receipt not found");
  if (receipt.status === "POSTED") throw new Error("Posted goods receipt cannot be rejected");

  await rejectProcurementApproval("procurement.grn", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "GoodsReceipt"
      SET status = 'REJECTED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.grn", "REJECT", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.grn", id, "REJECT", userId, comment ?? receipt.grnNo);
  });

  return { id };
}

export async function cancelGoodsReceipt(id: string, userId: string) {
  const receipt = await getGoodsReceiptById(id);
  if (!receipt) throw new Error("Goods receipt not found");
  if (receipt.status === "POSTED") throw new Error("Posted goods receipt cannot be cancelled");

  await sql.begin(async (tx) => {
    await tx`
      UPDATE "GoodsReceipt"
      SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.grn",
      referenceId: id,
      documentType: "grn",
      status: "CANCELLED",
      requestedById: userId,
    });
    await writeProcurementAudit(tx, userId, "procurement.grn", "CANCEL", id, { id });
    await writeProcurementHistory(tx, "procurement.grn", id, "CANCEL", userId, receipt.grnNo);
  });

  return { id };
}

export async function postGoodsReceipt(id: string, userId: string) {
  const receipt = await getGoodsReceiptById(id);
  if (!receipt) throw new Error("Goods receipt not found");
  if (receipt.status === "POSTED") return { id };
  if (receipt.status === "CANCELLED" || receipt.status === "REJECTED") {
    throw new Error("Cancelled or rejected goods receipt cannot be posted");
  }
  if (receipt.status !== "APPROVED") {
    throw new Error("Only approved goods receipts can be posted");
  }

  await ensureProcurementCanPost({
    documentType: "grn",
    referenceType: "procurement.grn",
    referenceId: id,
    status: receipt.status,
  });

  await sql.begin(async (tx) => {
    await postProcurementReceiptDocument({
      grnId: id,
      locationId: receipt.receivingLocationId,
      createdById: userId,
      remarks: receipt.remarks,
      lines: receipt.items
        .filter((item) => item.acceptedQty > 0)
        .map((item) => ({
          itemId: item.itemId,
          quantity: item.acceptedQty,
          unitCost: item.unitCost,
          remarks: item.remarks,
        })),
    }, { tx });

    await tx`
      UPDATE "GoodsReceipt"
      SET
        status = 'POSTED',
        "postedById" = ${userId},
        "postedAt" = NOW(),
        "updatedById" = ${userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    if (receipt.poId) {
      await syncPurchaseOrderReceiptStatus(tx, receipt.poId);
    }

    await writeProcurementAudit(tx, userId, "procurement.grn", "POST", id, { grnId: id, lineCount: receipt.items.length });
    await writeProcurementHistory(tx, "procurement.grn", id, "POST", userId, receipt.grnNo);
  });

  return { id };
}
