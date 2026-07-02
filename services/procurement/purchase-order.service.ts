import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  approveProcurementApproval,
  normalizeProcurementStatus,
  nextProcurementDocumentNumber,
  rejectProcurementApproval,
  syncProcurementApproval,
  type ProcurementStatus,
  type Tx,
  writeProcurementAudit,
  writeProcurementHistory,
} from "@/services/procurement/procurement-shared.service";

export interface PurchaseOrderLineInput {
  prItemId?: string | null;
  itemId: string;
  uomId?: string | null;
  orderedQty?: number;
  unitPrice?: number;
  taxCodeId?: string | null;
  taxRate?: number;
  remarks?: string;
}

export interface PurchaseOrderSummary {
  id: string;
  poNo: string;
  poDate: string;
  supplierId: string;
  supplierName: string;
  prId: string | null;
  requisitionNo: string | null;
  deliveryLocationId: string;
  deliveryLocationName: string;
  expectedDeliveryDate: string | null;
  paymentTerms: string;
  status: ProcurementStatus;
  itemCount: number;
  totalAmount: number;
  remarks: string;
}

export interface PurchaseOrderDetail extends PurchaseOrderSummary {
  items: Array<{
    id: string;
    prItemId: string | null;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomId: string | null;
    uomName: string | null;
    orderedQty: number;
    receivedQty: number;
    returnedQty: number;
    unitPrice: number;
    taxCodeId: string | null;
    taxCodeName: string | null;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    remarks: string;
  }>;
  relatedGrns: Array<{ id: string; grnNo: string; status: string; totalAmount: number }>;
}

interface PurchaseOrderPayload {
  poDate: string;
  supplierId: string;
  prId?: string | null;
  deliveryLocationId: string;
  expectedDeliveryDate?: string | null;
  paymentTerms?: string;
  remarks?: string;
  status?: ProcurementStatus;
  approverId?: string | null;
  createdById: string;
  updatedById?: string | null;
  lineItems: PurchaseOrderLineInput[];
}

function validateItems(items: PurchaseOrderLineInput[]) {
  const valid = items.filter((item) => item.itemId && Number(item.orderedQty ?? 0) > 0);
  if (valid.length === 0) {
    throw new Error("At least one purchase order item with quantity greater than zero is required");
  }

  return valid.map((item) => {
    const orderedQty = Number(item.orderedQty ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    const taxRate = Number(item.taxRate ?? 0);
    const taxable = orderedQty * unitPrice;
    const taxAmount = taxable * (taxRate / 100);
    return {
      ...item,
      orderedQty,
      unitPrice,
      taxRate,
      taxAmount,
      lineTotal: taxable + taxAmount,
    };
  });
}

function totals(items: ReturnType<typeof validateItems>) {
  return items.reduce(
    (sum, item) => ({
      subtotal: sum.subtotal + (item.orderedQty * item.unitPrice),
      taxAmount: sum.taxAmount + item.taxAmount,
      totalAmount: sum.totalAmount + item.lineTotal,
    }),
    { subtotal: 0, taxAmount: 0, totalAmount: 0 },
  );
}

async function validateAgainstRequisition(prId: string | null | undefined, items: ReturnType<typeof validateItems>) {
  if (!prId) return;
  const prItems = await sql<Array<{ id: string; approvedQty: number }>>`
    SELECT id, "approvedQty"
    FROM "PurchaseRequisitionItem"
    WHERE "requisitionId" = ${prId}
  `;
  const approvedById = new Map(prItems.map((row) => [row.id, Number(row.approvedQty ?? 0)]));
  for (const item of items) {
    if (item.prItemId && approvedById.has(item.prItemId) && item.orderedQty > (approvedById.get(item.prItemId) ?? 0)) {
      throw new Error("Ordered quantity cannot exceed approved requisition quantity");
    }
  }
}

async function writeItems(tx: Tx, poId: string, items: ReturnType<typeof validateItems>) {
  for (const item of items) {
    await tx`
      INSERT INTO "PurchaseOrderItem" (
        id, "poId", "prItemId", "itemId", "uomId", "orderedQty", "receivedQty", "returnedQty",
        "unitPrice", "taxCodeId", "taxRate", "taxAmount", "lineTotal", remarks
      )
      VALUES (
        ${randomUUID()},
        ${poId},
        ${item.prItemId ?? null},
        ${item.itemId},
        ${item.uomId ?? null},
        ${item.orderedQty},
        0,
        0,
        ${item.unitPrice},
        ${item.taxCodeId ?? null},
        ${item.taxRate},
        ${item.taxAmount},
        ${item.lineTotal},
        ${item.remarks ?? null}
      )
    `;
  }
}

async function syncRequisitionConversionStatus(tx: Tx, prId: string) {
  const [counts] = await Promise.all([
    tx<Array<{ totalItems: number; convertedItems: number }>>`
      SELECT
        COUNT(pri.id)::int AS "totalItems",
        COUNT(DISTINCT poi."prItemId")::int AS "convertedItems"
      FROM "PurchaseRequisitionItem" pri
      LEFT JOIN "PurchaseOrderItem" poi ON poi."prItemId" = pri.id
      WHERE pri."requisitionId" = ${prId}
    `,
  ]);

  const stats = counts[0];
  const nextStatus =
    Number(stats?.convertedItems ?? 0) <= 0
      ? "APPROVED"
      : Number(stats?.convertedItems ?? 0) < Number(stats?.totalItems ?? 0)
        ? "PARTIALLY_CONVERTED"
        : "CONVERTED";

  await tx`
    UPDATE "PurchaseRequisition"
    SET status = ${nextStatus}
    WHERE id = ${prId}
      AND status <> 'CANCELLED'
      AND status <> 'CLOSED'
  `;
}

export async function listPurchaseOrders(): Promise<PurchaseOrderSummary[]> {
  try {
    return await sql<Array<PurchaseOrderSummary>>`
      SELECT
        po.id,
        po."poNo",
        po."poDate"::text,
        po."supplierId",
        s.name AS "supplierName",
        po."prId",
        pr."requisitionNo",
        po."deliveryLocationId",
        l."locationName" AS "deliveryLocationName",
        po."expectedDeliveryDate"::text AS "expectedDeliveryDate",
        COALESCE(po."paymentTerms", '') AS "paymentTerms",
        po.status,
        COALESCE(COUNT(poi.id), 0)::int AS "itemCount",
        po."totalAmount",
        COALESCE(po.remarks, '') AS remarks
      FROM "PurchaseOrder" po
      INNER JOIN "Supplier" s ON s.id = po."supplierId"
      INNER JOIN "Location" l ON l.id = po."deliveryLocationId"
      LEFT JOIN "PurchaseRequisition" pr ON pr.id = po."prId"
      LEFT JOIN "PurchaseOrderItem" poi ON poi."poId" = po.id
      GROUP BY po.id, s.name, pr."requisitionNo", l."locationName"
      ORDER BY po."poDate" DESC, po."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderDetail | null> {
  try {
    const rows = await sql<Array<PurchaseOrderSummary>>`
      SELECT
        po.id,
        po."poNo",
        po."poDate"::text,
        po."supplierId",
        s.name AS "supplierName",
        po."prId",
        pr."requisitionNo",
        po."deliveryLocationId",
        l."locationName" AS "deliveryLocationName",
        po."expectedDeliveryDate"::text AS "expectedDeliveryDate",
        COALESCE(po."paymentTerms", '') AS "paymentTerms",
        po.status,
        COALESCE(COUNT(poi.id), 0)::int AS "itemCount",
        po."totalAmount",
        COALESCE(po.remarks, '') AS remarks
      FROM "PurchaseOrder" po
      INNER JOIN "Supplier" s ON s.id = po."supplierId"
      INNER JOIN "Location" l ON l.id = po."deliveryLocationId"
      LEFT JOIN "PurchaseRequisition" pr ON pr.id = po."prId"
      LEFT JOIN "PurchaseOrderItem" poi ON poi."poId" = po.id
      WHERE po.id = ${id}
      GROUP BY po.id, s.name, pr."requisitionNo", l."locationName"
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;

    const [items, relatedGrns] = await Promise.all([
      sql<PurchaseOrderDetail["items"]>`
        SELECT
          poi.id,
          poi."prItemId",
          poi."itemId",
          i."itemCode",
          i."itemName",
          poi."uomId",
          u.name AS "uomName",
          poi."orderedQty",
          poi."receivedQty",
          poi."returnedQty",
          poi."unitPrice",
          poi."taxCodeId",
          tc."taxName" AS "taxCodeName",
          poi."taxRate",
          poi."taxAmount",
          poi."lineTotal",
          COALESCE(poi.remarks, '') AS remarks
        FROM "PurchaseOrderItem" poi
        INNER JOIN "Item" i ON i.id = poi."itemId"
        LEFT JOIN "Unit" u ON u.id = poi."uomId"
        LEFT JOIN "TaxCode" tc ON tc.id = poi."taxCodeId"
        WHERE poi."poId" = ${id}
        ORDER BY i."itemCode" ASC
      `,
      sql<PurchaseOrderDetail["relatedGrns"]>`
        SELECT
          gr.id,
          gr."grnNo",
          gr.status,
          COALESCE(gr."totalAmount", 0) AS "totalAmount"
        FROM "GoodsReceipt" gr
        WHERE gr."poId" = ${id}
        ORDER BY gr."grnDate" DESC
      `,
    ]);

    return { ...header, items, relatedGrns };
  } catch {
    return null;
  }
}

export async function getPurchaseOrderPrefillFromRequisition(prId: string) {
  const requisition = await sql<
    Array<{
      id: string;
      requisitionNo: string;
      locationId: string;
      neededByDate: string | null;
    }>
  >`
    SELECT id, "requisitionNo", "locationId", "neededByDate"::text AS "neededByDate"
    FROM "PurchaseRequisition"
    WHERE id = ${prId}
      AND status IN ('APPROVED', 'PARTIALLY_CONVERTED')
    LIMIT 1
  `;
  const header = requisition[0];
  if (!header) {
    return null;
  }

  const items = await sql<
    Array<{
      prItemId: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      uomId: string | null;
      uomName: string | null;
      orderedQty: number;
      unitPrice: number;
    }>
  >`
    SELECT
      pri.id AS "prItemId",
      pri."itemId",
      i."itemCode",
      i."itemName",
      pri."uomId",
      u.name AS "uomName",
      GREATEST(pri."approvedQty" - COALESCE(SUM(poi."orderedQty"), 0), 0)::double precision AS "orderedQty",
      pri."estimatedUnitPrice" AS "unitPrice"
    FROM "PurchaseRequisitionItem" pri
    INNER JOIN "Item" i ON i.id = pri."itemId"
    LEFT JOIN "Unit" u ON u.id = pri."uomId"
    LEFT JOIN "PurchaseOrderItem" poi ON poi."prItemId" = pri.id
    WHERE pri."requisitionId" = ${prId}
    GROUP BY pri.id, i."itemCode", i."itemName", u.name
    HAVING GREATEST(pri."approvedQty" - COALESCE(SUM(poi."orderedQty"), 0), 0) > 0
    ORDER BY i."itemCode" ASC
  `;

  return { header, items };
}

export async function createPurchaseOrder(payload: PurchaseOrderPayload) {
  const items = validateItems(payload.lineItems);
  await validateAgainstRequisition(payload.prId, items);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const poNo = await nextProcurementDocumentNumber(tx, "PO", "Purchase Order");

    await tx`
      INSERT INTO "PurchaseOrder" (
        id, "poNo", "poDate", "supplierId", "prId", "deliveryLocationId", "expectedDeliveryDate", "paymentTerms",
        status, subtotal, "taxAmount", "discountAmount", "totalAmount", remarks,
        "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${poNo},
        ${new Date(payload.poDate)},
        ${payload.supplierId},
        ${payload.prId ?? null},
        ${payload.deliveryLocationId},
        ${payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : null},
        ${payload.paymentTerms ?? null},
        ${status},
        ${amountTotals.subtotal},
        ${amountTotals.taxAmount},
        0,
        ${amountTotals.totalAmount},
        ${payload.remarks ?? null},
        ${payload.createdById},
        ${payload.updatedById ?? payload.createdById},
        NOW(),
        NOW()
      )
    `;

    await writeItems(tx, id, items);
    if (payload.prId) {
      await syncRequisitionConversionStatus(tx, payload.prId);
    }
    await syncProcurementApproval(tx, {
      referenceType: "procurement.po",
      referenceId: id,
      documentType: "purchase-order",
      status,
      requestedById: payload.createdById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.po", "CREATE", id, payload);
    await writeProcurementHistory(tx, "procurement.po", id, "CREATE", payload.createdById, payload.remarks);
    return { id, poNo };
  });
}

export async function updatePurchaseOrder(id: string, payload: PurchaseOrderPayload) {
  const items = validateItems(payload.lineItems);
  await validateAgainstRequisition(payload.prId, items);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: ProcurementStatus; prId: string | null }>>`
      SELECT status, "prId"
      FROM "PurchaseOrder"
      WHERE id = ${id}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) throw new Error("Purchase order not found");
    if (existing.status === "RECEIVED" || existing.status === "POSTED" || existing.status === "CANCELLED" || existing.status === "CLOSED") {
      throw new Error("Received, posted, cancelled, or closed purchase order cannot be edited");
    }

    await tx`
      UPDATE "PurchaseOrder"
      SET
        "poDate" = ${new Date(payload.poDate)},
        "supplierId" = ${payload.supplierId},
        "prId" = ${payload.prId ?? null},
        "deliveryLocationId" = ${payload.deliveryLocationId},
        "expectedDeliveryDate" = ${payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : null},
        "paymentTerms" = ${payload.paymentTerms ?? null},
        status = ${status},
        subtotal = ${amountTotals.subtotal},
        "taxAmount" = ${amountTotals.taxAmount},
        "discountAmount" = 0,
        "totalAmount" = ${amountTotals.totalAmount},
        remarks = ${payload.remarks ?? null},
        "updatedById" = ${payload.updatedById ?? payload.createdById},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "PurchaseOrderItem" WHERE "poId" = ${id}`;
    await writeItems(tx, id, items);
    if (existing.prId) {
      await syncRequisitionConversionStatus(tx, existing.prId);
    }
    if (payload.prId && payload.prId !== existing.prId) {
      await syncRequisitionConversionStatus(tx, payload.prId);
    }
    await syncProcurementApproval(tx, {
      referenceType: "procurement.po",
      referenceId: id,
      documentType: "purchase-order",
      status,
      requestedById: payload.createdById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.po", "UPDATE", id, payload);
    await writeProcurementHistory(tx, "procurement.po", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function approvePurchaseOrder(id: string, userId: string) {
  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  await approveProcurementApproval("procurement.po", id, userId);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseOrder"
      SET status = 'APPROVED', "approvedById" = ${userId}, "approvedAt" = NOW(), "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.po", "APPROVE", id, { id });
    await writeProcurementHistory(tx, "procurement.po", id, "APPROVE", userId, order.poNo);
  });
  return { id };
}

export async function rejectPurchaseOrder(id: string, userId: string, comment?: string) {
  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  await rejectProcurementApproval("procurement.po", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseOrder"
      SET status = 'REJECTED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.po", "REJECT", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.po", id, "REJECT", userId, comment ?? order.poNo);
  });
  return { id };
}

export async function cancelPurchaseOrder(id: string, userId: string) {
  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  if (order.status === "RECEIVED" || order.status === "PARTIALLY_RECEIVED" || order.status === "CLOSED") {
    throw new Error("Received or closed purchase order cannot be cancelled");
  }
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseOrder"
      SET status = 'CANCELLED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.po",
      referenceId: id,
      documentType: "purchase-order",
      status: "CANCELLED",
      requestedById: userId,
    });
    await writeProcurementAudit(tx, userId, "procurement.po", "CANCEL", id, { id });
    await writeProcurementHistory(tx, "procurement.po", id, "CANCEL", userId, order.poNo);
  });
  return { id };
}
