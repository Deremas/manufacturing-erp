import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/procurement/routes";
import {
  approveProcurementApproval,
  assertCanSubmitProcurementStatus,
  normalizeProcurementStatus,
  resolveProcurementDocumentNumber,
  rejectProcurementApproval,
  syncProcurementApproval,
  type ProcurementStatus,
  type Tx,
  writeProcurementAudit,
  writeProcurementHistory,
} from "@/services/procurement/procurement-shared.service";
import {
  calculateProcurementLineAmounts,
  getProcurementTaxSettings,
  mergeVatRemarks,
} from "@/services/procurement/procurement-tax.service";

export interface PurchaseOrderLineInput {
  prItemId?: string | null;
  itemId: string;
  uomId?: string | null;
  orderedQty?: number;
  unitPrice?: number;
  taxCodeId?: string | null;
  taxRate?: number;
  remarks?: string;
  receiptType?: "INVENTORY" | "ASSET" | "SERVICE";
}

export interface PurchaseOrderSummary {
  id: string;
  publicId: number;
  poNo: string;
  poDate: string;
  supplierId: string;
  supplierName: string;
  prId: string | null;
  prPublicId?: number | null;
  requisitionNo: string | null;
  deliveryLocationId: string;
  deliveryLocationName: string;
  expectedDeliveryDate: string | null;
  paymentTerms: string;
  requestType: "INVENTORY_PURCHASE" | "MAINTENANCE_SPARE" | "ASSET_PURCHASE" | "EXTERNAL_SERVICE";
  status: ProcurementStatus;
  itemCount: number;
  subtotal: number;
  taxAmount: number;
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
    receiptType: "INVENTORY" | "ASSET" | "SERVICE";
  }>;
  relatedGrns: Array<{ id: string; publicId: number; grnNo: string; status: string; totalAmount: number }>;
}

interface PurchaseOrderPayload {
  poDate: string;
  supplierId: string;
  prId?: string | null;
  deliveryLocationId: string;
  expectedDeliveryDate?: string | null;
  paymentTerms?: string;
  requestType?: PurchaseOrderSummary["requestType"];
  remarks?: string;
  status?: ProcurementStatus;
  poNo?: string | null;
  approverId?: string | null;
  createdById: string;
  updatedById?: string | null;
  lineItems: PurchaseOrderLineInput[];
}

async function validateItems(items: PurchaseOrderLineInput[]) {
  const taxSettings = await getProcurementTaxSettings();
  const valid = items.filter((item) => item.itemId && Number(item.orderedQty ?? 0) > 0);
  if (valid.length === 0) {
    throw new Error("At least one purchase order item with quantity greater than zero is required");
  }

  return valid.map((item) => {
    const orderedQty = Number(item.orderedQty ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    const amounts = calculateProcurementLineAmounts(orderedQty, unitPrice, taxSettings);
    return {
      ...item,
      orderedQty,
      unitPrice,
      taxCodeId: taxSettings.taxCodeId,
      taxRate: amounts.taxRate,
      taxAmount: amounts.taxAmount,
      lineSubtotal: amounts.lineSubtotal,
      lineTotal: amounts.lineTotal,
    };
  });
}

function totals(items: Awaited<ReturnType<typeof validateItems>>) {
  return items.reduce(
    (sum, item) => ({
      subtotal: sum.subtotal + item.lineSubtotal,
      taxAmount: sum.taxAmount + item.taxAmount,
      totalAmount: sum.totalAmount + item.lineTotal,
    }),
    { subtotal: 0, taxAmount: 0, totalAmount: 0 },
  );
}

async function loadRequisitionRemainingQty(prId: string, excludePoId?: string | null) {
  return sql<
    Array<{
      id: string;
      remainingQty: number;
      requestType: PurchaseOrderSummary["requestType"];
      status: string;
    }>
  >`
    SELECT
      pri.id,
      GREATEST(
        COALESCE(NULLIF(pri."approvedQty", 0), pri."requestedQty")
          - COALESCE((
            SELECT SUM(poi."orderedQty")
            FROM "PurchaseOrderItem" poi
            INNER JOIN "PurchaseOrder" po ON po.id = poi."poId"
            WHERE poi."prItemId" = pri.id
              AND po.status NOT IN ('CANCELLED', 'REJECTED')
              AND (
                ${excludePoId ?? null}::text IS NULL
                OR po.id <> ${excludePoId ?? null}
              )
          ), 0),
        0
      )::double precision AS "remainingQty",
      pr."requestType",
      pr.status
    FROM "PurchaseRequisitionItem" pri
    INNER JOIN "PurchaseRequisition" pr ON pr.id = pri."requisitionId"
    WHERE pri."requisitionId" = ${prId}
  `;
}

function isRequisitionConvertibleStatus(status: string) {
  return !["CANCELLED", "CLOSED", "DRAFT", "SUBMITTED", "REJECTED"].includes(String(status).toUpperCase());
}

async function healRequisitionApprovedQty(prId: string) {
  await sql`
    UPDATE "PurchaseRequisitionItem" pri
    SET "approvedQty" = pri."requestedQty"
    FROM "PurchaseRequisition" pr
    WHERE pri."requisitionId" = pr.id
      AND pr.id = ${prId}
      AND pr.status NOT IN ('CANCELLED', 'CLOSED', 'DRAFT', 'SUBMITTED', 'REJECTED')
      AND COALESCE(pri."approvedQty", 0) <= 0
  `;
}

async function validateAgainstRequisition(
  prId: string | null | undefined,
  items: Awaited<ReturnType<typeof validateItems>>,
  requestedType?: PurchaseOrderSummary["requestType"],
  excludePoId?: string | null,
) {
  if (!prId) return requestedType ?? "INVENTORY_PURCHASE";

  await healRequisitionApprovedQty(prId);
  await repairRequisitionConversionStatus(prId);

  const prItems = await loadRequisitionRemainingQty(prId, excludePoId);

  if (!prItems[0]) throw new Error("Approved purchase requisition not found");
  if (!isRequisitionConvertibleStatus(prItems[0].status)) {
    throw new Error("Purchase requisition must be approved before creating a purchase order");
  }
  if (!prItems.some((row) => Number(row.remainingQty) > 0)) {
    throw new Error("Purchase requisition has no remaining quantity to convert");
  }

  const remainingById = new Map(prItems.map((row) => [row.id, Number(row.remainingQty ?? 0)]));
  for (const item of items) {
    if (!item.prItemId) continue;
    if (!remainingById.has(item.prItemId)) {
      throw new Error("One or more order lines are not linked to the selected purchase requisition");
    }
    const remaining = remainingById.get(item.prItemId) ?? 0;
    if (item.orderedQty > remaining + 1e-9) {
      throw new Error(
        `Ordered quantity (${item.orderedQty}) cannot exceed approved requisition quantity remaining (${remaining})`,
      );
    }
  }
  return prItems[0].requestType;
}

async function writeItems(tx: Tx, poId: string, items: Awaited<ReturnType<typeof validateItems>>) {
  for (const item of items) {
    await tx`
      INSERT INTO "PurchaseOrderItem" (
        id, "poId", "prItemId", "itemId", "uomId", "orderedQty", "receivedQty", "returnedQty",
        "unitPrice", "taxCodeId", "taxRate", "taxAmount", "lineTotal", remarks
        , "receiptType"
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
        , ${item.receiptType ?? "INVENTORY"}
      )
    `;
  }
}

async function syncRequisitionConversionStatus(tx: Tx, prId: string) {
  const [counts] = await Promise.all([
    tx<Array<{ totalItems: number; itemsWithRemaining: number }>>`
      SELECT
        COUNT(pri.id)::int AS "totalItems",
        COUNT(*) FILTER (
          WHERE GREATEST(
            COALESCE(NULLIF(pri."approvedQty", 0), pri."requestedQty")
              - COALESCE((
                SELECT SUM(poi."orderedQty")
                FROM "PurchaseOrderItem" poi
                INNER JOIN "PurchaseOrder" po ON po.id = poi."poId"
                WHERE poi."prItemId" = pri.id
                  AND po.status NOT IN ('CANCELLED', 'REJECTED')
              ), 0),
            0
          ) > 0
        )::int AS "itemsWithRemaining"
      FROM "PurchaseRequisitionItem" pri
      WHERE pri."requisitionId" = ${prId}
    `,
  ]);

  const totalItems = Number(counts[0]?.totalItems ?? 0);
  const itemsWithRemaining = Number(counts[0]?.itemsWithRemaining ?? 0);
  const nextStatus =
    totalItems > 0 && itemsWithRemaining <= 0
      ? "CONVERTED"
      : itemsWithRemaining > 0 && itemsWithRemaining < totalItems
        ? "PARTIALLY_CONVERTED"
        : "APPROVED";

  await tx`
    UPDATE "PurchaseRequisition"
    SET status = ${nextStatus}
    WHERE id = ${prId}
      AND status NOT IN ('CANCELLED', 'CLOSED', 'DRAFT', 'SUBMITTED', 'REJECTED')
  `;
}

export async function repairRequisitionConversionStatus(prId: string) {
  await sql.begin(async (tx) => {
    await syncRequisitionConversionStatus(tx, prId);
  });
}

export async function canConvertPurchaseRequisition(
  prId: string,
  excludePoId?: string | null,
): Promise<boolean> {
  await healRequisitionApprovedQty(prId);
  await repairRequisitionConversionStatus(prId);

  const items = await loadRequisitionRemainingQty(prId, excludePoId);
  if (!items[0]) return false;
  if (!isRequisitionConvertibleStatus(items[0].status)) return false;
  return items.some((row) => Number(row.remainingQty) > 0);
}

export async function listPurchaseOrders(): Promise<PurchaseOrderSummary[]> {
  try {
    return await sql<Array<PurchaseOrderSummary>>`
      SELECT
        po.id,
        po."publicId",
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
        po."requestType",
        po.status,
        COALESCE(COUNT(poi.id), 0)::int AS "itemCount",
        po.subtotal,
        po."taxAmount",
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

export async function getPurchaseOrderById(key: string): Promise<PurchaseOrderDetail | null> {
  try {
    const rows = await sql<Array<PurchaseOrderSummary>>`
      SELECT
        po.id,
        po."publicId",
        po."poNo",
        po."poDate"::text,
        po."supplierId",
        s.name AS "supplierName",
        po."prId",
        pr."publicId" AS "prPublicId",
        pr."requisitionNo",
        po."deliveryLocationId",
        l."locationName" AS "deliveryLocationName",
        po."expectedDeliveryDate"::text AS "expectedDeliveryDate",
        COALESCE(po."paymentTerms", '') AS "paymentTerms",
        po."requestType",
        po.status,
        COALESCE(COUNT(poi.id), 0)::int AS "itemCount",
        po.subtotal,
        po."taxAmount",
        po."totalAmount",
        COALESCE(po.remarks, '') AS remarks
      FROM "PurchaseOrder" po
      INNER JOIN "Supplier" s ON s.id = po."supplierId"
      INNER JOIN "Location" l ON l.id = po."deliveryLocationId"
      LEFT JOIN "PurchaseRequisition" pr ON pr.id = po."prId"
      LEFT JOIN "PurchaseOrderItem" poi ON poi."poId" = po.id
      WHERE ${isPublicIdParam(key) ? sql`po."publicId" = ${Number(key)}` : sql`po.id = ${key}`}
      GROUP BY po.id, s.name, pr."publicId", pr."requisitionNo", l."locationName"
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
          , poi."receiptType"
        FROM "PurchaseOrderItem" poi
        INNER JOIN "Item" i ON i.id = poi."itemId"
        LEFT JOIN "Unit" u ON u.id = poi."uomId"
        LEFT JOIN "TaxCode" tc ON tc.id = poi."taxCodeId"
        WHERE poi."poId" = ${header.id}
        ORDER BY i."itemCode" ASC
      `,
      sql<PurchaseOrderDetail["relatedGrns"]>`
        SELECT
          gr.id,
          gr."publicId",
          gr."grnNo",
          gr.status,
          COALESCE(gr."totalAmount", 0) AS "totalAmount"
        FROM "GoodsReceipt" gr
        WHERE gr."poId" = ${header.id}
        ORDER BY gr."grnDate" DESC
      `,
    ]);

    return { ...header, items, relatedGrns };
  } catch {
    return null;
  }
}

export async function getPurchaseOrderPrefillFromRequisition(prId: string) {
  const convertible = await canConvertPurchaseRequisition(prId);
  if (!convertible) {
    return null;
  }

  const requisition = await sql<
    Array<{
      id: string;
      requisitionNo: string;
      locationId: string;
      locationName: string;
      neededByDate: string | null;
      requestType: PurchaseOrderSummary["requestType"];
    }>
  >`
    SELECT
      pr.id,
      pr."requisitionNo",
      pr."locationId",
      l."locationName" AS "locationName",
      pr."neededByDate"::text AS "neededByDate",
      pr."requestType"
    FROM "PurchaseRequisition" pr
    INNER JOIN "Location" l ON l.id = pr."locationId"
    WHERE pr.id = ${prId}
      AND pr.status NOT IN ('CANCELLED', 'CLOSED', 'DRAFT', 'SUBMITTED', 'REJECTED')
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
      GREATEST(
        COALESCE(NULLIF(pri."approvedQty", 0), pri."requestedQty")
          - COALESCE((
            SELECT SUM(poi."orderedQty")
            FROM "PurchaseOrderItem" poi
            INNER JOIN "PurchaseOrder" po ON po.id = poi."poId"
            WHERE poi."prItemId" = pri.id
              AND po.status NOT IN ('CANCELLED', 'REJECTED')
          ), 0),
        0
      )::double precision AS "orderedQty",
      pri."estimatedUnitPrice" AS "unitPrice"
    FROM "PurchaseRequisitionItem" pri
    INNER JOIN "Item" i ON i.id = pri."itemId"
    LEFT JOIN "Unit" u ON u.id = pri."uomId"
    WHERE pri."requisitionId" = ${prId}
    ORDER BY i."itemCode" ASC
  `;

  const remainingItems = items.filter((item) => Number(item.orderedQty) > 0);
  if (remainingItems.length === 0) {
    return null;
  }

  return { header, items: remainingItems };
}

export type ConvertiblePurchaseRequisition = {
  id: string;
  requisitionNo: string;
  locationId: string;
  locationName: string;
  neededByDate: string | null;
  requestType: PurchaseOrderSummary["requestType"];
};

export async function listConvertiblePurchaseRequisitions(): Promise<ConvertiblePurchaseRequisition[]> {
  return sql<ConvertiblePurchaseRequisition[]>`
    SELECT
      pr.id,
      pr."requisitionNo",
      pr."locationId",
      l."locationName" AS "locationName",
      pr."neededByDate"::text AS "neededByDate",
      pr."requestType"
    FROM "PurchaseRequisition" pr
    INNER JOIN "Location" l ON l.id = pr."locationId"
    WHERE pr.status NOT IN ('CANCELLED', 'CLOSED', 'DRAFT', 'SUBMITTED', 'REJECTED')
      AND EXISTS (
        SELECT 1
        FROM "PurchaseRequisitionItem" pri
        WHERE pri."requisitionId" = pr.id
          AND GREATEST(
            COALESCE(NULLIF(pri."approvedQty", 0), pri."requestedQty")
              - COALESCE((
                SELECT SUM(poi."orderedQty")
                FROM "PurchaseOrderItem" poi
                INNER JOIN "PurchaseOrder" po ON po.id = poi."poId"
                WHERE poi."prItemId" = pri.id
                  AND po.status NOT IN ('CANCELLED', 'REJECTED')
              ), 0),
            0
          ) > 0
      )
    ORDER BY pr."requisitionDate" DESC, pr."createdAt" DESC
  `;
}

export async function createPurchaseOrder(payload: PurchaseOrderPayload) {
  if (!payload.deliveryLocationId?.trim()) {
    throw new Error("Receiving location is required");
  }
  const taxSettings = await getProcurementTaxSettings();
  const validatedItems = await validateItems(payload.lineItems);
  const requestType = await validateAgainstRequisition(payload.prId, validatedItems, payload.requestType);
  const receiptType: PurchaseOrderLineInput["receiptType"] = requestType === "ASSET_PURCHASE" ? "ASSET" : requestType === "EXTERNAL_SERVICE" ? "SERVICE" : "INVENTORY";
  const items = validatedItems.map((item) => ({ ...item, receiptType }));
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const poNo = await resolveProcurementDocumentNumber(tx, "PO", "Purchase Order", payload.poNo, {
      isTaken: async (documentNo) => {
        const rows = await tx<Array<{ id: string }>>`
          SELECT id FROM "PurchaseOrder" WHERE "poNo" = ${documentNo} LIMIT 1
        `;
        return Boolean(rows[0]);
      },
    });

    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "PurchaseOrder" (
        id, "poNo", "poDate", "supplierId", "prId", "deliveryLocationId", "expectedDeliveryDate", "paymentTerms",
        status, subtotal, "taxAmount", "discountAmount", "totalAmount", remarks,
        "requestType",
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
        ${mergeVatRemarks(payload.remarks, taxSettings.treatment)},
        ${requestType},
        ${payload.createdById},
        ${payload.updatedById ?? payload.createdById},
        NOW(),
        NOW()
      )
      RETURNING "publicId"
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
      assignedApproverId: null,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.po", "CREATE", id, payload);
    await writeProcurementHistory(tx, "procurement.po", id, "CREATE", payload.createdById, payload.remarks);
    return { id, poNo, publicId: inserted[0]?.publicId };
  });
}

export async function updatePurchaseOrder(id: string, payload: PurchaseOrderPayload) {
  if (!payload.deliveryLocationId?.trim()) {
    throw new Error("Receiving location is required");
  }
  const taxSettings = await getProcurementTaxSettings();
  const validatedItems = await validateItems(payload.lineItems);
  const requestType = await validateAgainstRequisition(payload.prId, validatedItems, payload.requestType, id);
  const receiptType: PurchaseOrderLineInput["receiptType"] = requestType === "ASSET_PURCHASE" ? "ASSET" : requestType === "EXTERNAL_SERVICE" ? "SERVICE" : "INVENTORY";
  const items = validatedItems.map((item) => ({ ...item, receiptType }));
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: ProcurementStatus; prId: string | null; poNo: string }>>`
      SELECT status, "prId", "poNo"
      FROM "PurchaseOrder"
      WHERE id = ${id}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) throw new Error("Purchase order not found");
    if (existing.status === "RECEIVED" || existing.status === "POSTED" || existing.status === "CANCELLED" || existing.status === "CLOSED") {
      throw new Error("Received, posted, cancelled, or closed purchase order cannot be edited");
    }

    const nextNo = String(payload.poNo ?? existing.poNo).trim() || existing.poNo;
    if (nextNo !== existing.poNo) {
      const clash = await tx<Array<{ id: string }>>`
        SELECT id FROM "PurchaseOrder" WHERE "poNo" = ${nextNo} AND id <> ${id} LIMIT 1
      `;
      if (clash[0]) throw new Error("PO number already exists");
    }

    await tx`
      UPDATE "PurchaseOrder"
      SET
        "poNo" = ${nextNo},
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
        remarks = ${mergeVatRemarks(payload.remarks, taxSettings.treatment)},
        "requestType" = ${requestType},
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
      assignedApproverId: null,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.po", "UPDATE", id, payload);
    await writeProcurementHistory(tx, "procurement.po", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function approvePurchaseOrder(id: string, userId: string, comment?: string) {
  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  await approveProcurementApproval("procurement.po", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseOrder"
      SET status = 'APPROVED', "approvedById" = ${userId}, "approvedAt" = NOW(), "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.po", "APPROVE", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.po", id, "APPROVE", userId, comment ?? order.poNo);
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
    if (order.prId) {
      await syncRequisitionConversionStatus(tx, order.prId);
    }
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
    if (order.prId) {
      await syncRequisitionConversionStatus(tx, order.prId);
    }
  });
  return { id };
}

export async function submitPurchaseOrder(
  id: string,
  userId: string,
  input?: { approverId?: string; comment?: string },
) {
  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  assertCanSubmitProcurementStatus(order.status);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseOrder"
      SET status = 'SUBMITTED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.po",
      referenceId: id,
      documentType: "purchase-order",
      status: "SUBMITTED",
      requestedById: userId,
      assignedApproverId: null,
      comment: input?.comment,
    });
    await writeProcurementAudit(tx, userId, "procurement.po", "SUBMIT", id, { id, ...input });
    await writeProcurementHistory(tx, "procurement.po", id, "SUBMIT", userId, input?.comment ?? order.poNo);
  });
  return { id };
}
