import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  approveProcurementApproval,
  nextProcurementDocumentNumber,
  normalizeProcurementStatus,
  rejectProcurementApproval,
  syncProcurementApproval,
  type ProcurementStatus,
  type Tx,
  writeProcurementAudit,
  writeProcurementHistory,
} from "@/services/procurement/procurement-shared.service";
import { syncSupplierInvoiceFinancePosting } from "@/services/procurement/procurement-finance.service";

export interface SupplierInvoiceLineInput {
  itemId: string;
  uomId?: string | null;
  quantity?: number;
  unitPrice?: number;
  taxAmount?: number;
  remarks?: string;
}

export interface SupplierInvoiceSummary {
  id: string;
  invoiceNo: string;
  supplierInvoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  supplierId: string;
  supplierName: string;
  poId: string | null;
  poNo: string | null;
  grnId: string | null;
  grnNo: string | null;
  status: ProcurementStatus;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  itemCount: number;
  remarks: string;
}

export interface SupplierInvoiceDetail extends SupplierInvoiceSummary {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomId: string | null;
    uomName: string | null;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    lineTotal: number;
    remarks: string;
  }>;
}

interface SupplierInvoicePayload {
  supplierInvoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  supplierId: string;
  poId?: string | null;
  grnId?: string | null;
  remarks?: string;
  status?: ProcurementStatus;
  approverId?: string | null;
  recordedById: string;
  lineItems: SupplierInvoiceLineInput[];
}

function validateItems(items: SupplierInvoiceLineInput[]) {
  const valid = items.filter((item) => item.itemId && Number(item.quantity ?? 0) > 0);
  if (valid.length === 0) {
    throw new Error("At least one invoice item with quantity greater than zero is required");
  }
  return valid.map((item) => {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    const taxAmount = Number(item.taxAmount ?? 0);
    return {
      ...item,
      quantity,
      unitPrice,
      taxAmount,
      lineTotal: quantity * unitPrice + taxAmount,
    };
  });
}

function totals(items: ReturnType<typeof validateItems>) {
  return items.reduce(
    (sum, item) => ({
      subtotal: sum.subtotal + item.quantity * item.unitPrice,
      taxAmount: sum.taxAmount + item.taxAmount,
      totalAmount: sum.totalAmount + item.lineTotal,
    }),
    { subtotal: 0, taxAmount: 0, totalAmount: 0 },
  );
}

async function writeItems(tx: Tx, invoiceId: string, items: ReturnType<typeof validateItems>) {
  for (const item of items) {
    await tx`
      INSERT INTO "SupplierInvoiceItem" (
        id, "invoiceId", "itemId", "uomId", quantity, "unitPrice", "taxAmount", "lineTotal", remarks
      )
      VALUES (
        ${randomUUID()},
        ${invoiceId},
        ${item.itemId},
        ${item.uomId ?? null},
        ${item.quantity},
        ${item.unitPrice},
        ${item.taxAmount},
        ${item.lineTotal},
        ${item.remarks ?? null}
      )
    `;
  }
}

export async function listSupplierInvoices(): Promise<SupplierInvoiceSummary[]> {
  try {
    return await sql<Array<SupplierInvoiceSummary>>`
      SELECT
        si.id,
        si."invoiceNo",
        si."supplierInvoiceNo",
        si."invoiceDate"::text,
        si."dueDate"::text AS "dueDate",
        si."supplierId",
        s.name AS "supplierName",
        si."poId",
        po."poNo",
        si."grnId",
        gr."grnNo",
        si.status,
        si."totalAmount",
        si."amountPaid",
        si."balanceDue",
        COALESCE(COUNT(sii.id), 0)::int AS "itemCount",
        COALESCE(si.remarks, '') AS remarks
      FROM "SupplierInvoice" si
      INNER JOIN "Supplier" s ON s.id = si."supplierId"
      LEFT JOIN "PurchaseOrder" po ON po.id = si."poId"
      LEFT JOIN "GoodsReceipt" gr ON gr.id = si."grnId"
      LEFT JOIN "SupplierInvoiceItem" sii ON sii."invoiceId" = si.id
      GROUP BY si.id, s.name, po."poNo", gr."grnNo"
      ORDER BY si."invoiceDate" DESC, si."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getSupplierInvoiceById(id: string): Promise<SupplierInvoiceDetail | null> {
  try {
    const rows = await sql<Array<SupplierInvoiceSummary>>`
      SELECT
        si.id,
        si."invoiceNo",
        si."supplierInvoiceNo",
        si."invoiceDate"::text,
        si."dueDate"::text AS "dueDate",
        si."supplierId",
        s.name AS "supplierName",
        si."poId",
        po."poNo",
        si."grnId",
        gr."grnNo",
        si.status,
        si."totalAmount",
        si."amountPaid",
        si."balanceDue",
        COALESCE(COUNT(sii.id), 0)::int AS "itemCount",
        COALESCE(si.remarks, '') AS remarks
      FROM "SupplierInvoice" si
      INNER JOIN "Supplier" s ON s.id = si."supplierId"
      LEFT JOIN "PurchaseOrder" po ON po.id = si."poId"
      LEFT JOIN "GoodsReceipt" gr ON gr.id = si."grnId"
      LEFT JOIN "SupplierInvoiceItem" sii ON sii."invoiceId" = si.id
      WHERE si.id = ${id}
      GROUP BY si.id, s.name, po."poNo", gr."grnNo"
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;

    const items = await sql<SupplierInvoiceDetail["items"]>`
      SELECT
        sii.id,
        sii."itemId",
        i."itemCode",
        i."itemName",
        sii."uomId",
        u.name AS "uomName",
        sii.quantity,
        sii."unitPrice",
        sii."taxAmount",
        sii."lineTotal",
        COALESCE(sii.remarks, '') AS remarks
      FROM "SupplierInvoiceItem" sii
      INNER JOIN "Item" i ON i.id = sii."itemId"
      LEFT JOIN "Unit" u ON u.id = sii."uomId"
      WHERE sii."invoiceId" = ${id}
      ORDER BY i."itemCode" ASC
    `;

    return { ...header, items };
  } catch {
    return null;
  }
}

export async function getSupplierInvoicePrefill(input: { poId?: string; grnId?: string }) {
  if (input.grnId) {
    const headerRows = await sql<Array<{ grnId: string; grnNo: string; supplierId: string; poId: string | null; poNo: string | null }>>`
      SELECT gr.id AS "grnId", gr."grnNo", gr."supplierId", gr."poId", po."poNo"
      FROM "GoodsReceipt" gr
      LEFT JOIN "PurchaseOrder" po ON po.id = gr."poId"
      WHERE gr.id = ${input.grnId}
        AND gr.status = 'POSTED'
      LIMIT 1
    `;
    const header = headerRows[0];
    if (!header) return null;

    const items = await sql<Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      uomId: string | null;
      uomName: string | null;
      quantity: number;
      unitPrice: number;
      taxAmount: number;
    }>>`
      SELECT
        gri."itemId",
        i."itemCode",
        i."itemName",
        gri."uomId",
        u.name AS "uomName",
        gri."acceptedQty" AS quantity,
        gri."unitCost" AS "unitPrice",
        COALESCE(gri."taxAmount", 0) AS "taxAmount"
      FROM "GoodsReceiptItem" gri
      INNER JOIN "Item" i ON i.id = gri."itemId"
      LEFT JOIN "Unit" u ON u.id = gri."uomId"
      WHERE gri."goodsReceiptId" = ${input.grnId}
        AND COALESCE(gri."acceptedQty", 0) > 0
      ORDER BY i."itemCode" ASC
    `;

    return { header, items };
  }

  if (input.poId) {
    const headerRows = await sql<Array<{ poId: string; poNo: string; supplierId: string }>>`
      SELECT id AS "poId", "poNo", "supplierId"
      FROM "PurchaseOrder"
      WHERE id = ${input.poId}
        AND status IN ('APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED')
      LIMIT 1
    `;
    const header = headerRows[0];
    if (!header) return null;

    const items = await sql<Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      uomId: string | null;
      uomName: string | null;
      quantity: number;
      unitPrice: number;
      taxAmount: number;
    }>>`
      SELECT
        poi."itemId",
        i."itemCode",
        i."itemName",
        poi."uomId",
        u.name AS "uomName",
        poi."orderedQty" AS quantity,
        poi."unitPrice",
        poi."taxAmount"
      FROM "PurchaseOrderItem" poi
      INNER JOIN "Item" i ON i.id = poi."itemId"
      LEFT JOIN "Unit" u ON u.id = poi."uomId"
      WHERE poi."poId" = ${input.poId}
      ORDER BY i."itemCode" ASC
    `;

    return { header, items };
  }

  return null;
}

export async function createSupplierInvoice(payload: SupplierInvoicePayload) {
  const items = validateItems(payload.lineItems);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const invoiceNo = await nextProcurementDocumentNumber(tx, "SINV", "Supplier Invoice");

    await tx`
      INSERT INTO "SupplierInvoice" (
        id, "invoiceNo", "supplierInvoiceNo", "invoiceDate", "dueDate", "supplierId", "poId", "grnId",
        status, subtotal, "taxAmount", "discountAmount", "totalAmount", "amountPaid", "balanceDue", "recordedById",
        remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${invoiceNo},
        ${payload.supplierInvoiceNo},
        ${new Date(payload.invoiceDate)},
        ${payload.dueDate ? new Date(payload.dueDate) : null},
        ${payload.supplierId},
        ${payload.poId ?? null},
        ${payload.grnId ?? null},
        ${status},
        ${amountTotals.subtotal},
        ${amountTotals.taxAmount},
        0,
        ${amountTotals.totalAmount},
        0,
        ${amountTotals.totalAmount},
        ${payload.recordedById},
        ${payload.remarks ?? null},
        NOW(),
        NOW()
      )
    `;
    await writeItems(tx, id, items);
    await syncProcurementApproval(tx, {
      referenceType: "procurement.invoice",
      referenceId: id,
      documentType: "invoice",
      status,
      requestedById: payload.recordedById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.recordedById, "procurement.invoice", "CREATE", id, payload);
    await writeProcurementHistory(tx, "procurement.invoice", id, "CREATE", payload.recordedById, payload.remarks);
    return { id, invoiceNo };
  });
}

export async function updateSupplierInvoice(id: string, payload: SupplierInvoicePayload) {
  const items = validateItems(payload.lineItems);
  const status = normalizeProcurementStatus(payload.status);
  const amountTotals = totals(items);

  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: ProcurementStatus; amountPaid: number }>>`
      SELECT status, "amountPaid"
      FROM "SupplierInvoice"
      WHERE id = ${id}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) throw new Error("Supplier invoice not found");
    if (existing.status === "PAID" || existing.status === "CANCELLED") {
      throw new Error("Paid or cancelled supplier invoice cannot be edited");
    }

    await tx`
      UPDATE "SupplierInvoice"
      SET
        "supplierInvoiceNo" = ${payload.supplierInvoiceNo},
        "invoiceDate" = ${new Date(payload.invoiceDate)},
        "dueDate" = ${payload.dueDate ? new Date(payload.dueDate) : null},
        "supplierId" = ${payload.supplierId},
        "poId" = ${payload.poId ?? null},
        "grnId" = ${payload.grnId ?? null},
        status = ${status},
        subtotal = ${amountTotals.subtotal},
        "taxAmount" = ${amountTotals.taxAmount},
        "totalAmount" = ${amountTotals.totalAmount},
        "balanceDue" = ${Math.max(amountTotals.totalAmount - Number(existing.amountPaid ?? 0), 0)},
        remarks = ${payload.remarks ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "SupplierInvoiceItem" WHERE "invoiceId" = ${id}`;
    await writeItems(tx, id, items);
    await syncProcurementApproval(tx, {
      referenceType: "procurement.invoice",
      referenceId: id,
      documentType: "invoice",
      status,
      requestedById: payload.recordedById,
      assignedApproverId: payload.approverId,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.recordedById, "procurement.invoice", "UPDATE", id, payload);
    await writeProcurementHistory(tx, "procurement.invoice", id, "UPDATE", payload.recordedById, payload.remarks);
    return { id };
  });
}

export async function approveSupplierInvoice(id: string, userId: string) {
  const invoice = await getSupplierInvoiceById(id);
  if (!invoice) throw new Error("Supplier invoice not found");
  await approveProcurementApproval("procurement.invoice", id, userId);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierInvoice"
      SET status = 'APPROVED', "approvedById" = ${userId}, "approvedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncSupplierInvoiceFinancePosting(tx, { invoiceId: id, userId });
    await writeProcurementAudit(tx, userId, "procurement.invoice", "APPROVE", id, { id });
    await writeProcurementHistory(tx, "procurement.invoice", id, "APPROVE", userId, invoice.invoiceNo);
    await writeProcurementHistory(tx, "procurement.invoice", id, "FINANCE_POST", userId, `Finance posting synced for ${invoice.invoiceNo}`);
  });
  return { id };
}

export async function rejectSupplierInvoice(id: string, userId: string, comment?: string) {
  const invoice = await getSupplierInvoiceById(id);
  if (!invoice) throw new Error("Supplier invoice not found");
  await rejectProcurementApproval("procurement.invoice", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierInvoice"
      SET status = 'REJECTED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.invoice", "REJECT", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.invoice", id, "REJECT", userId, comment ?? invoice.invoiceNo);
  });
  return { id };
}

export async function cancelSupplierInvoice(id: string, userId: string) {
  const invoice = await getSupplierInvoiceById(id);
  if (!invoice) throw new Error("Supplier invoice not found");
  if (invoice.amountPaid > 0) {
    throw new Error("Invoice with payments cannot be cancelled");
  }
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierInvoice"
      SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.invoice",
      referenceId: id,
      documentType: "invoice",
      status: "CANCELLED",
      requestedById: userId,
    });
    await writeProcurementAudit(tx, userId, "procurement.invoice", "CANCEL", id, { id });
    await writeProcurementHistory(tx, "procurement.invoice", id, "CANCEL", userId, invoice.invoiceNo);
  });
  return { id };
}
