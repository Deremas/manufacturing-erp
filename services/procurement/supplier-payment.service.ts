import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/procurement/routes";
import {
  approveProcurementApproval,
  assertCanSubmitProcurementStatus,
  nextProcurementDocumentNumber,
  normalizeProcurementStatus,
  rejectProcurementApproval,
  syncProcurementApproval,
  type ProcurementStatus,
  type Tx,
  writeProcurementAudit,
  writeProcurementHistory,
} from "@/services/procurement/procurement-shared.service";
import { syncSupplierPaymentFinancePosting } from "@/services/procurement/procurement-finance.service";

export interface SupplierPaymentSummary {
  id: string;
  publicId: number;
  paymentNo: string;
  paymentDate: string;
  supplierId: string;
  supplierName: string;
  invoiceId: string;
  invoicePublicId?: number | null;
  invoiceNo: string;
  paymentMethod: string;
  bankAccountId: string | null;
  bankAccountName: string | null;
  referenceNo: string;
  amount: number;
  status: ProcurementStatus;
  remarks: string;
}

export interface SupplierPaymentDetail extends SupplierPaymentSummary {
  invoiceBalanceBefore: number;
}

interface SupplierPaymentPayload {
  paymentDate: string;
  supplierId: string;
  invoiceId: string;
  paymentMethod: string;
  bankAccountId?: string | null;
  cashAccountId?: string | null;
  referenceNo?: string;
  amount: number;
  remarks?: string;
  status?: ProcurementStatus;
  approverId?: string | null;
  createdById: string;
}

function normalizePaymentMethod(value?: string) {
  const normalized = String(value ?? "BANK").trim().toUpperCase();
  switch (normalized) {
    case "CASH":
    case "BANK":
    case "CHEQUE":
    case "MOBILE_MONEY":
      return normalized;
    default:
      return "BANK";
  }
}

async function getInvoiceBalance(invoiceId: string) {
  const rows = await sql<Array<{ supplierId: string; balanceDue: number; status: ProcurementStatus; invoiceNo: string }>>`
    SELECT "supplierId", "balanceDue", status, "invoiceNo"
    FROM "SupplierInvoice"
    WHERE id = ${invoiceId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function applyPaymentToInvoice(tx: Tx, invoiceId: string) {
  const totals = await tx<Array<{ totalPaid: number; invoiceTotal: number }>>`
    SELECT
      COALESCE(SUM(sp.amount), 0)::double precision AS "totalPaid",
      si."totalAmount" AS "invoiceTotal"
    FROM "SupplierInvoice" si
    LEFT JOIN "SupplierPayment" sp ON sp."invoiceId" = si.id AND sp.status = 'APPROVED'
    WHERE si.id = ${invoiceId}
    GROUP BY si."totalAmount"
  `;
  const stats = totals[0];
  const totalPaid = Number(stats?.totalPaid ?? 0);
  const invoiceTotal = Number(stats?.invoiceTotal ?? 0);
  const balanceDue = Math.max(invoiceTotal - totalPaid, 0);
  const status = balanceDue <= 0 ? "PAID" : totalPaid > 0 ? "PARTIAL_PAID" : "APPROVED";

  await tx`
    UPDATE "SupplierInvoice"
    SET "amountPaid" = ${totalPaid}, "balanceDue" = ${balanceDue}, status = ${status}, "updatedAt" = NOW()
    WHERE id = ${invoiceId}
  `;
}

export async function listSupplierPayments(): Promise<SupplierPaymentSummary[]> {
  try {
    return await sql<Array<SupplierPaymentSummary>>`
      SELECT
        sp.id,
        sp."publicId",
        sp."paymentNo",
        sp."paymentDate"::text,
        sp."supplierId",
        s.name AS "supplierName",
        sp."invoiceId",
        si."invoiceNo",
        sp."paymentMethod"::text AS "paymentMethod",
        sp."bankAccountId",
        ba."accountName" AS "bankAccountName",
        COALESCE(sp."referenceNo", '') AS "referenceNo",
        sp.amount,
        sp.status,
        COALESCE(sp.remarks, '') AS remarks
      FROM "SupplierPayment" sp
      INNER JOIN "Supplier" s ON s.id = sp."supplierId"
      INNER JOIN "SupplierInvoice" si ON si.id = sp."invoiceId"
      LEFT JOIN "BankAccount" ba ON ba.id = sp."bankAccountId"
      ORDER BY sp."paymentDate" DESC, sp."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getSupplierPaymentById(key: string): Promise<SupplierPaymentDetail | null> {
  try {
    const rows = await sql<Array<SupplierPaymentDetail>>`
      SELECT
        sp.id,
        sp."publicId",
        sp."paymentNo",
        sp."paymentDate"::text,
        sp."supplierId",
        s.name AS "supplierName",
        sp."invoiceId",
        si."publicId" AS "invoicePublicId",
        si."invoiceNo",
        sp."paymentMethod"::text AS "paymentMethod",
        sp."bankAccountId",
        ba."accountName" AS "bankAccountName",
        COALESCE(sp."referenceNo", '') AS "referenceNo",
        sp.amount,
        sp.status,
        COALESCE(sp.remarks, '') AS remarks,
        (si."balanceDue" + CASE WHEN sp.status = 'APPROVED' THEN sp.amount ELSE 0 END)::double precision AS "invoiceBalanceBefore"
      FROM "SupplierPayment" sp
      INNER JOIN "Supplier" s ON s.id = sp."supplierId"
      INNER JOIN "SupplierInvoice" si ON si.id = sp."invoiceId"
      LEFT JOIN "BankAccount" ba ON ba.id = sp."bankAccountId"
      WHERE ${isPublicIdParam(key) ? sql`sp."publicId" = ${Number(key)}` : sql`sp.id = ${key}`}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function createSupplierPayment(payload: SupplierPaymentPayload) {
  if (Number(payload.amount ?? 0) <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }
  const invoice = await getInvoiceBalance(payload.invoiceId);
  if (!invoice) throw new Error("Supplier invoice not found");
  if (invoice.supplierId !== payload.supplierId) throw new Error("Payment supplier must match the selected invoice");
  if (invoice.status === "CANCELLED" || invoice.status === "PAID") throw new Error("Selected invoice is not open for payment");
  if (Number(payload.amount) > Number(invoice.balanceDue ?? 0)) throw new Error("Payment amount cannot exceed invoice balance");
  const status = normalizeProcurementStatus(payload.status);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const paymentNo = await nextProcurementDocumentNumber(tx, "SPAY", "Supplier Payment");

    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "SupplierPayment" (
        id, "paymentNo", "paymentDate", "supplierId", "invoiceId", "paymentMethod",
        "bankAccountId", "cashAccountId", "referenceNo", amount, remarks, status, "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${paymentNo},
        ${new Date(payload.paymentDate)},
        ${payload.supplierId},
        ${payload.invoiceId},
        ${normalizePaymentMethod(payload.paymentMethod)},
        ${payload.bankAccountId ?? null},
        ${payload.cashAccountId ?? null},
        ${payload.referenceNo ?? null},
        ${payload.amount},
        ${payload.remarks ?? null},
        ${status},
        ${payload.createdById},
        NOW(),
        NOW()
      )
      RETURNING "publicId"
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.payment",
      referenceId: id,
      documentType: "payment",
      status,
      requestedById: payload.createdById,
      assignedApproverId: null,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.payment", "CREATE", id, payload);
    await writeProcurementHistory(tx, "procurement.payment", id, "CREATE", payload.createdById, payload.remarks);
    return { id, paymentNo, publicId: inserted[0]?.publicId };
  });
}

export async function updateSupplierPayment(id: string, payload: SupplierPaymentPayload) {
  if (Number(payload.amount ?? 0) <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }
  const existing = await getSupplierPaymentById(id);
  if (!existing) throw new Error("Supplier payment not found");
  if (existing.status === "APPROVED" || existing.status === "CANCELLED") {
    throw new Error("Approved or cancelled payment cannot be edited");
  }
  const invoice = await getInvoiceBalance(payload.invoiceId);
  if (!invoice) throw new Error("Supplier invoice not found");
  if (invoice.supplierId !== payload.supplierId) throw new Error("Payment supplier must match the selected invoice");
  if (invoice.status === "CANCELLED" || invoice.status === "PAID") throw new Error("Selected invoice is not open for payment");
  if (Number(payload.amount) > Number(invoice.balanceDue ?? 0)) throw new Error("Payment amount cannot exceed invoice balance");
  const status = normalizeProcurementStatus(payload.status);

  return sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierPayment"
      SET
        "paymentDate" = ${new Date(payload.paymentDate)},
        "supplierId" = ${payload.supplierId},
        "invoiceId" = ${payload.invoiceId},
        "paymentMethod" = ${normalizePaymentMethod(payload.paymentMethod)}::"PaymentMethod",
        "bankAccountId" = ${payload.bankAccountId ?? null},
        "cashAccountId" = ${payload.cashAccountId ?? null},
        "referenceNo" = ${payload.referenceNo ?? null},
        amount = ${payload.amount},
        remarks = ${payload.remarks ?? null},
        status = ${status},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.payment",
      referenceId: id,
      documentType: "payment",
      status,
      requestedById: payload.createdById,
      assignedApproverId: null,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.payment", "UPDATE", id, payload);
    await writeProcurementHistory(tx, "procurement.payment", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function approveSupplierPayment(id: string, userId: string, comment?: string) {
  const payment = await getSupplierPaymentById(id);
  if (!payment) throw new Error("Supplier payment not found");
  const invoice = await getInvoiceBalance(payment.invoiceId);
  if (!invoice) throw new Error("Supplier invoice not found");
  if (invoice.status === "CANCELLED" || invoice.status === "PAID") throw new Error("Selected invoice is not open for payment");
  if (Number(payment.amount) > Number(invoice.balanceDue ?? 0)) {
    throw new Error("Payment amount exceeds the current invoice balance");
  }
  await approveProcurementApproval("procurement.payment", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierPayment"
      SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await applyPaymentToInvoice(tx, payment.invoiceId);
    await syncSupplierPaymentFinancePosting(tx, { paymentId: id, userId });
    await writeProcurementAudit(tx, userId, "procurement.payment", "APPROVE", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.payment", id, "APPROVE", userId, comment ?? payment.paymentNo);
    await writeProcurementHistory(tx, "procurement.payment", id, "FINANCE_POST", userId, `Finance posting synced for ${payment.paymentNo}`);
  });
  return { id };
}

export async function rejectSupplierPayment(id: string, userId: string, comment?: string) {
  const payment = await getSupplierPaymentById(id);
  if (!payment) throw new Error("Supplier payment not found");
  await rejectProcurementApproval("procurement.payment", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierPayment"
      SET status = 'REJECTED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.payment", "REJECT", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.payment", id, "REJECT", userId, comment ?? payment.paymentNo);
  });
  return { id };
}

export async function cancelSupplierPayment(id: string, userId: string) {
  const payment = await getSupplierPaymentById(id);
  if (!payment) throw new Error("Supplier payment not found");
  if (payment.status === "APPROVED") throw new Error("Approved payment cannot be cancelled");
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierPayment"
      SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.payment",
      referenceId: id,
      documentType: "payment",
      status: "CANCELLED",
      requestedById: userId,
    });
    await writeProcurementAudit(tx, userId, "procurement.payment", "CANCEL", id, { id });
    await writeProcurementHistory(tx, "procurement.payment", id, "CANCEL", userId, payment.paymentNo);
  });
  return { id };
}

export async function submitSupplierPayment(
  id: string,
  userId: string,
  input?: { approverId?: string; comment?: string },
) {
  const payment = await getSupplierPaymentById(id);
  if (!payment) throw new Error("Supplier payment not found");
  assertCanSubmitProcurementStatus(payment.status);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "SupplierPayment"
      SET status = 'SUBMITTED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.payment",
      referenceId: id,
      documentType: "payment",
      status: "SUBMITTED",
      requestedById: userId,
      assignedApproverId: null,
      comment: input?.comment,
    });
    await writeProcurementAudit(tx, userId, "procurement.payment", "SUBMIT", id, { id, ...input });
    await writeProcurementHistory(tx, "procurement.payment", id, "SUBMIT", userId, input?.comment ?? payment.paymentNo);
  });
  return { id };
}
