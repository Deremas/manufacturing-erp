import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { syncProcurementJournalEntry } from "@/services/accounting/accounting.service";
import type { Tx } from "@/services/procurement/procurement-shared.service";

async function getDefaultCurrency(tx: Tx | typeof sql) {
  const settingRows = await tx<Array<{ value: string | null }>>`
    SELECT value
    FROM "SystemSetting"
    WHERE key = 'defaultCurrency' AND "isArchived" = false
    LIMIT 1
  `;

  if (settingRows[0]?.value) {
    return settingRows[0].value;
  }

  const companyRows = await tx<Array<{ defaultCurrency: string | null }>>`
    SELECT "defaultCurrency"
    FROM "Company"
    WHERE "isArchived" = false
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  return companyRows[0]?.defaultCurrency ?? "ETB";
}

async function applyBankBalanceDelta(
  tx: Tx,
  previousBankAccountId: string | null,
  nextBankAccountId: string | null,
  previousAmount: number,
  nextAmount: number,
) {
  if (previousBankAccountId && previousBankAccountId !== nextBankAccountId) {
    await tx`
      UPDATE "BankAccount"
      SET "currentBalance" = COALESCE("currentBalance", 0) + ${previousAmount},
          "updatedAt" = NOW()
      WHERE id = ${previousBankAccountId}
    `;
  }

  if (nextBankAccountId) {
    const delta = previousBankAccountId === nextBankAccountId
      ? previousAmount - nextAmount
      : -nextAmount;

    if (delta !== 0) {
      await tx`
        UPDATE "BankAccount"
        SET "currentBalance" = COALESCE("currentBalance", 0) + ${delta},
            "updatedAt" = NOW()
        WHERE id = ${nextBankAccountId}
      `;
    }
  }
}

export async function syncSupplierInvoiceFinancePosting(
  tx: Tx,
  input: { invoiceId: string; userId: string },
) {
  const rows = await tx<Array<{
    id: string;
    invoiceNo: string;
    supplierId: string;
    totalAmount: number;
    status: string;
  }>>`
    SELECT id, "invoiceNo", "supplierId", "totalAmount", status
    FROM "SupplierInvoice"
    WHERE id = ${input.invoiceId}
    LIMIT 1
  `;
  const invoice = rows[0];

  if (!invoice) {
    throw new Error("Supplier invoice not found for finance posting");
  }

  if (!["APPROVED", "PARTIAL_PAID", "PAID"].includes(invoice.status)) {
    return null;
  }

  const currency = await getDefaultCurrency(tx);

  await tx`
    INSERT INTO "ProcurementFinancePosting" (
      id, "sourceType", "sourceId", "postingType", "supplierId", "invoiceId",
      amount, currency, status, memo, "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      'procurement.invoice',
      ${invoice.id},
      'SUPPLIER_PAYABLE',
      ${invoice.supplierId},
      ${invoice.id},
      ${invoice.totalAmount},
      ${currency},
      'POSTED',
      ${`Supplier payable for ${invoice.invoiceNo}`},
      ${input.userId},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("sourceType", "sourceId")
    DO UPDATE SET
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      memo = EXCLUDED.memo,
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  await syncProcurementJournalEntry(tx, {
    sourceType: "procurement.invoice",
    sourceId: invoice.id,
    description: `Supplier invoice accrual for ${invoice.invoiceNo}`,
    postedById: input.userId,
    amount: Number(invoice.totalAmount ?? 0),
  });

  return { invoiceId: invoice.id };
}

export async function syncSupplierPaymentFinancePosting(
  tx: Tx,
  input: { paymentId: string; userId: string },
) {
  const rows = await tx<Array<{
    id: string;
    paymentNo: string;
    supplierId: string;
    invoiceId: string;
    bankAccountId: string | null;
    amount: number;
    status: string;
  }>>`
    SELECT id, "paymentNo", "supplierId", "invoiceId", "bankAccountId", amount, status
    FROM "SupplierPayment"
    WHERE id = ${input.paymentId}
    LIMIT 1
  `;
  const payment = rows[0];

  if (!payment) {
    throw new Error("Supplier payment not found for finance posting");
  }

  if (payment.status !== "APPROVED") {
    return null;
  }

  const currency = await getDefaultCurrency(tx);
  const existingRows = await tx<Array<{
    amount: number;
    bankAccountId: string | null;
  }>>`
    SELECT amount, "bankAccountId"
    FROM "ProcurementFinancePosting"
    WHERE "sourceType" = 'procurement.payment'
      AND "sourceId" = ${payment.id}
    LIMIT 1
  `;
  const existing = existingRows[0];

  await tx`
    INSERT INTO "ProcurementFinancePosting" (
      id, "sourceType", "sourceId", "postingType", "supplierId", "invoiceId", "paymentId", "bankAccountId",
      amount, currency, status, memo, "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      'procurement.payment',
      ${payment.id},
      'SUPPLIER_PAYMENT',
      ${payment.supplierId},
      ${payment.invoiceId},
      ${payment.id},
      ${payment.bankAccountId},
      ${payment.amount},
      ${currency},
      'POSTED',
      ${`Supplier payment for ${payment.paymentNo}`},
      ${input.userId},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("sourceType", "sourceId")
    DO UPDATE SET
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      memo = EXCLUDED.memo,
      "bankAccountId" = EXCLUDED."bankAccountId",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  await applyBankBalanceDelta(
    tx,
    existing?.bankAccountId ?? null,
    payment.bankAccountId,
    Number(existing?.amount ?? 0),
    Number(payment.amount ?? 0),
  );

  await syncProcurementJournalEntry(tx, {
    sourceType: "procurement.payment",
    sourceId: payment.id,
    description: `Supplier payment settlement for ${payment.paymentNo}`,
    postedById: input.userId,
    amount: Number(payment.amount ?? 0),
  });

  return { paymentId: payment.id };
}
