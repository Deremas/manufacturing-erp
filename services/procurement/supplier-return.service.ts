import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { postSupplierReturnDocument } from "@/services/inventory/module-integration.service";
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

export interface SupplierReturnLineInput {
  grnItemId?: string | null;
  itemId: string;
  uomId?: string | null;
  returnQty?: number;
  unitCost?: number;
  reason?: string;
  remarks?: string;
}

export interface SupplierReturnSummary {
  id: string;
  returnNo: string;
  returnDate: string;
  supplierId: string;
  supplierName: string;
  grnId: string | null;
  grnNo: string | null;
  returnLocationId: string;
  returnLocationName: string;
  reason: string;
  status: ProcurementStatus;
  totalAmount: number;
  itemCount: number;
  remarks: string;
}

export interface SupplierReturnDetail extends SupplierReturnSummary {
  items: Array<{
    id: string;
    grnItemId: string | null;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomId: string | null;
    uomName: string | null;
    receivedQty: number | null;
    previouslyReturnedQty: number | null;
    availableReturnQty: number | null;
    returnQty: number;
    unitCost: number;
    lineTotal: number;
    reason: string;
    remarks: string;
  }>;
}

interface SupplierReturnPayload {
  returnDate: string;
  supplierId: string;
  grnId?: string | null;
  returnLocationId: string;
  reason: string;
  remarks?: string;
  status?: ProcurementStatus;
  approverId?: string | null;
  createdById: string;
  updatedById?: string | null;
  lineItems: SupplierReturnLineInput[];
}

function validateItems(items: SupplierReturnLineInput[]) {
  const valid = items.filter((item) => item.itemId && Number(item.returnQty ?? 0) > 0);
  if (valid.length === 0) {
    throw new Error("At least one supplier return item with quantity greater than zero is required");
  }

  return valid.map((item) => {
    const returnQty = Number(item.returnQty ?? 0);
    const unitCost = Number(item.unitCost ?? 0);
    return {
      ...item,
      returnQty,
      unitCost,
      lineTotal: returnQty * unitCost,
    };
  });
}

function totals(items: ReturnType<typeof validateItems>) {
  return items.reduce(
    (sum, item) => ({
      subtotal: sum.subtotal + item.lineTotal,
      taxAmount: sum.taxAmount,
      totalAmount: sum.totalAmount + item.lineTotal,
    }),
    { subtotal: 0, taxAmount: 0, totalAmount: 0 },
  );
}

async function validateAgainstReceipt(grnId: string | null | undefined, items: ReturnType<typeof validateItems>) {
  if (!grnId) return;

  const grnItems = await sql<
    Array<{
      id: string;
      quantityReceived: number;
      totalReturned: number;
    }>
  >`
    SELECT
      gri.id,
      gri."quantityReceived",
      COALESCE(SUM(sri."returnQty"), 0)::double precision AS "totalReturned"
    FROM "GoodsReceiptItem" gri
    LEFT JOIN "SupplierReturnItem" sri ON sri."grnItemId" = gri.id
    LEFT JOIN "SupplierReturn" sr ON sr.id = sri."returnId" AND sr.status <> 'CANCELLED'
    WHERE gri."goodsReceiptId" = ${grnId}
    GROUP BY gri.id, gri."quantityReceived"
  `;

  const receiptMap = new Map(
    grnItems.map((row) => [row.id, { receivedQty: Number(row.quantityReceived ?? 0), returnedQty: Number(row.totalReturned ?? 0) }]),
  );

  for (const item of items) {
    if (!item.grnItemId) {
      throw new Error("Supplier return lines linked to a GRN must include the source GRN item");
    }
    const source = receiptMap.get(item.grnItemId);
    if (!source) {
      throw new Error("Supplier return item references a GRN line that does not exist");
    }
    const availableQty = source.receivedQty - source.returnedQty;
    if (item.returnQty > availableQty) {
      throw new Error("Return quantity cannot exceed available received quantity");
    }
  }
}

async function writeItems(tx: Tx, returnId: string, items: ReturnType<typeof validateItems>) {
  for (const item of items) {
    await tx`
      INSERT INTO "SupplierReturnItem" (
        id, "returnId", "grnItemId", "itemId", "uomId", "returnQty", "unitCost", "taxAmount", "lineTotal", reason, remarks
      )
      VALUES (
        ${randomUUID()},
        ${returnId},
        ${item.grnItemId ?? null},
        ${item.itemId},
        ${item.uomId ?? null},
        ${item.returnQty},
        ${item.unitCost},
        0,
        ${item.lineTotal},
        ${item.reason ?? null},
        ${item.remarks ?? null}
      )
    `;
  }
}

export async function listSupplierReturns(): Promise<SupplierReturnSummary[]> {
  try {
    return await sql<Array<SupplierReturnSummary>>`
      SELECT
        sr.id,
        sr."returnNo",
        sr."returnDate"::text,
        sr."supplierId",
        s.name AS "supplierName",
        sr."grnId",
        gr."grnNo",
        sr."returnLocationId",
        l."locationName" AS "returnLocationName",
        sr.reason,
        sr.status,
        sr."totalAmount",
        COALESCE(COUNT(sri.id), 0)::int AS "itemCount",
        COALESCE(sr.remarks, '') AS remarks
      FROM "SupplierReturn" sr
      INNER JOIN "Supplier" s ON s.id = sr."supplierId"
      INNER JOIN "Location" l ON l.id = sr."returnLocationId"
      LEFT JOIN "GoodsReceipt" gr ON gr.id = sr."grnId"
      LEFT JOIN "SupplierReturnItem" sri ON sri."returnId" = sr.id
      GROUP BY sr.id, s.name, gr."grnNo", l."locationName"
      ORDER BY sr."returnDate" DESC, sr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getSupplierReturnById(id: string): Promise<SupplierReturnDetail | null> {
  try {
    const rows = await sql<Array<SupplierReturnSummary>>`
      SELECT
        sr.id,
        sr."returnNo",
        sr."returnDate"::text,
        sr."supplierId",
        s.name AS "supplierName",
        sr."grnId",
        gr."grnNo",
        sr."returnLocationId",
        l."locationName" AS "returnLocationName",
        sr.reason,
        sr.status,
        sr."totalAmount",
        COALESCE(COUNT(sri.id), 0)::int AS "itemCount",
        COALESCE(sr.remarks, '') AS remarks
      FROM "SupplierReturn" sr
      INNER JOIN "Supplier" s ON s.id = sr."supplierId"
      INNER JOIN "Location" l ON l.id = sr."returnLocationId"
      LEFT JOIN "GoodsReceipt" gr ON gr.id = sr."grnId"
      LEFT JOIN "SupplierReturnItem" sri ON sri."returnId" = sr.id
      WHERE sr.id = ${id}
      GROUP BY sr.id, s.name, gr."grnNo", l."locationName"
      LIMIT 1
    `;

    const header = rows[0];
    if (!header) return null;

    const items = await sql<SupplierReturnDetail["items"]>`
      SELECT
        sri.id,
        sri."grnItemId",
        sri."itemId",
        i."itemCode",
        i."itemName",
        sri."uomId",
        u.name AS "uomName",
        gri."quantityReceived" AS "receivedQty",
        COALESCE((
          SELECT SUM(other."returnQty")
          FROM "SupplierReturnItem" other
          INNER JOIN "SupplierReturn" sr2 ON sr2.id = other."returnId"
          WHERE other."grnItemId" = sri."grnItemId"
            AND other.id <> sri.id
            AND sr2.status <> 'CANCELLED'
        ), 0)::double precision AS "previouslyReturnedQty",
        CASE
          WHEN sri."grnItemId" IS NULL THEN NULL
          ELSE (gri."quantityReceived" - COALESCE((
            SELECT SUM(other."returnQty")
            FROM "SupplierReturnItem" other
            INNER JOIN "SupplierReturn" sr2 ON sr2.id = other."returnId"
            WHERE other."grnItemId" = sri."grnItemId"
              AND other.id <> sri.id
              AND sr2.status <> 'CANCELLED'
          ), 0))::double precision
        END AS "availableReturnQty",
        sri."returnQty",
        sri."unitCost",
        sri."lineTotal",
        COALESCE(sri.reason, '') AS reason,
        COALESCE(sri.remarks, '') AS remarks
      FROM "SupplierReturnItem" sri
      INNER JOIN "Item" i ON i.id = sri."itemId"
      LEFT JOIN "Unit" u ON u.id = sri."uomId"
      LEFT JOIN "GoodsReceiptItem" gri ON gri.id = sri."grnItemId"
      WHERE sri."returnId" = ${id}
      ORDER BY i."itemCode" ASC
    `;

    return { ...header, items };
  } catch {
    return null;
  }
}

export async function getSupplierReturnPrefillFromReceipt(grnId: string) {
  const headers = await sql<
    Array<{
      id: string;
      grnNo: string;
      supplierId: string;
      locationId: string;
    }>
  >`
    SELECT id, "grnNo", "supplierId", "locationId"
    FROM "GoodsReceipt"
    WHERE id = ${grnId}
      AND status = 'POSTED'
    LIMIT 1
  `;

  const header = headers[0];
  if (!header) return null;

  const items = await sql<
    Array<{
      grnItemId: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      uomId: string | null;
      uomName: string | null;
      receivedQty: number;
      previouslyReturnedQty: number;
      availableReturnQty: number;
      unitCost: number;
    }>
  >`
    SELECT
      gri.id AS "grnItemId",
      gri."itemId",
      i."itemCode",
      i."itemName",
      i."uomId",
      u.name AS "uomName",
      gri."quantityReceived" AS "receivedQty",
      COALESCE((
        SELECT SUM(sri."returnQty")
        FROM "SupplierReturnItem" sri
        INNER JOIN "SupplierReturn" sr ON sr.id = sri."returnId"
        WHERE sri."grnItemId" = gri.id
          AND sr.status <> 'CANCELLED'
      ), 0)::double precision AS "previouslyReturnedQty",
      GREATEST(
        gri."quantityReceived" - COALESCE((
          SELECT SUM(sri."returnQty")
          FROM "SupplierReturnItem" sri
          INNER JOIN "SupplierReturn" sr ON sr.id = sri."returnId"
          WHERE sri."grnItemId" = gri.id
            AND sr.status <> 'CANCELLED'
        ), 0),
        0
      )::double precision AS "availableReturnQty",
      gri."unitCost"
    FROM "GoodsReceiptItem" gri
    INNER JOIN "Item" i ON i.id = gri."itemId"
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    WHERE gri."goodsReceiptId" = ${grnId}
    ORDER BY i."itemCode" ASC
  `;

  return { header, items: items.filter((item) => Number(item.availableReturnQty ?? 0) > 0) };
}

export async function createSupplierReturn(payload: SupplierReturnPayload) {
  const items = validateItems(payload.lineItems);
  await validateAgainstReceipt(payload.grnId, items);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const returnNo = await nextProcurementDocumentNumber(tx, "SRET", "Supplier Return");

    await tx`
      INSERT INTO "SupplierReturn" (
        id, "returnNo", "returnDate", "supplierId", "grnId", "returnLocationId", reason, status,
        subtotal, "taxAmount", "totalAmount", remarks, "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${returnNo},
        ${new Date(payload.returnDate)},
        ${payload.supplierId},
        ${payload.grnId ?? null},
        ${payload.returnLocationId},
        ${payload.reason},
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
      referenceType: "procurement.supplier-return",
      referenceId: id,
      documentType: "supplier-return",
      status,
      requestedById: payload.createdById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.supplier-return", "CREATE", id, payload);
    await writeProcurementHistory(tx, "procurement.supplier-return", id, "CREATE", payload.createdById, payload.remarks);
    return { id, returnNo };
  });
}

export async function updateSupplierReturn(id: string, payload: SupplierReturnPayload) {
  const items = validateItems(payload.lineItems);
  await validateAgainstReceipt(payload.grnId, items);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: ProcurementStatus }>>`
      SELECT status
      FROM "SupplierReturn"
      WHERE id = ${id}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) throw new Error("Supplier return not found");
    if (existing.status === "POSTED" || existing.status === "CANCELLED") {
      throw new Error("Posted or cancelled supplier return cannot be edited");
    }

    await tx`
      UPDATE "SupplierReturn"
      SET
        "returnDate" = ${new Date(payload.returnDate)},
        "supplierId" = ${payload.supplierId},
        "grnId" = ${payload.grnId ?? null},
        "returnLocationId" = ${payload.returnLocationId},
        reason = ${payload.reason},
        status = ${status},
        subtotal = ${amountTotals.subtotal},
        "taxAmount" = ${amountTotals.taxAmount},
        "totalAmount" = ${amountTotals.totalAmount},
        remarks = ${payload.remarks ?? null},
        "updatedById" = ${payload.updatedById ?? payload.createdById},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "SupplierReturnItem" WHERE "returnId" = ${id}`;
    await writeItems(tx, id, items);
    await syncProcurementApproval(tx, {
      referenceType: "procurement.supplier-return",
      referenceId: id,
      documentType: "supplier-return",
      status,
      requestedById: payload.createdById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.supplier-return", "UPDATE", id, payload);
    await writeProcurementHistory(tx, "procurement.supplier-return", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function approveSupplierReturn(id: string, userId: string) {
  const document = await getSupplierReturnById(id);
  if (!document) throw new Error("Supplier return not found");
  await approveProcurementApproval("procurement.supplier-return", id, userId);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierReturn"
      SET status = 'APPROVED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.supplier-return", "APPROVE", id, { id });
    await writeProcurementHistory(tx, "procurement.supplier-return", id, "APPROVE", userId, document.returnNo);
  });
  return { id };
}

export async function rejectSupplierReturn(id: string, userId: string, comment?: string) {
  const document = await getSupplierReturnById(id);
  if (!document) throw new Error("Supplier return not found");
  await rejectProcurementApproval("procurement.supplier-return", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierReturn"
      SET status = 'REJECTED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.supplier-return", "REJECT", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.supplier-return", id, "REJECT", userId, comment ?? document.returnNo);
  });
  return { id };
}

export async function cancelSupplierReturn(id: string, userId: string) {
  const document = await getSupplierReturnById(id);
  if (!document) throw new Error("Supplier return not found");
  if (document.status === "POSTED") {
    throw new Error("Posted supplier return cannot be cancelled");
  }
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierReturn"
      SET status = 'CANCELLED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.supplier-return",
      referenceId: id,
      documentType: "supplier-return",
      status: "CANCELLED",
      requestedById: userId,
    });
    await writeProcurementAudit(tx, userId, "procurement.supplier-return", "CANCEL", id, { id });
    await writeProcurementHistory(tx, "procurement.supplier-return", id, "CANCEL", userId, document.returnNo);
  });
  return { id };
}

export async function postSupplierReturn(id: string, userId: string) {
  const document = await getSupplierReturnById(id);
  if (!document) throw new Error("Supplier return not found");
  if (document.status === "POSTED") return { id };
  if (document.status === "CANCELLED" || document.status === "REJECTED") {
    throw new Error("Cancelled or rejected supplier return cannot be posted");
  }
  if (document.status !== "APPROVED") {
    throw new Error("Only approved supplier returns can be posted");
  }

  await ensureProcurementCanPost({
    documentType: "supplier-return",
    referenceType: "procurement.supplier-return",
    referenceId: id,
    status: document.status,
  });

  await sql.begin(async (tx) => {
    await postSupplierReturnDocument({
      supplierReturnId: id,
      locationId: document.returnLocationId,
      createdById: userId,
      remarks: document.remarks,
      lines: document.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.returnQty,
        unitCost: item.unitCost,
        remarks: item.remarks,
      })),
    }, { tx });

    await tx`
      UPDATE "SupplierReturn"
      SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW(), "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.supplier-return", "POST", id, { id, lineCount: document.items.length });
    await writeProcurementHistory(tx, "procurement.supplier-return", id, "POST", userId, document.returnNo);
  });

  return { id };
}
