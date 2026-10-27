import { randomUUID } from "crypto";

import { reverseSalesJournalEntry, syncSalesJournalEntry } from "@/services/accounting/accounting.service";
import { getSalesDefaultCurrency, type Tx } from "@/services/sales/sales-shared.service";

async function applyBankBalanceDelta(
  tx: Tx,
  bankAccountId: string | null,
  amount: number,
) {
  if (!bankAccountId || amount === 0) {
    return;
  }

  await tx`
    UPDATE "BankAccount"
    SET "currentBalance" = COALESCE("currentBalance", 0) + ${amount},
        "updatedAt" = NOW()
    WHERE id = ${bankAccountId}
  `;
}

export async function syncPostedSaleFinance(
  tx: Tx,
  input: {
    saleId: string;
    userId: string;
  },
) {
  const rows = await tx<Array<{
    id: string;
    saleNo: string;
    customerId: string | null;
    totalAmount: number;
    paymentMethod: "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY" | null;
    bankAccountId: string | null;
    paymentStatus: string;
    status: string;
  }>>`
    SELECT
      id,
      "saleNo",
      "customerId",
      "totalAmount",
      "paymentMethod"::text AS "paymentMethod",
      "bankAccountId",
      "paymentStatus",
      status
    FROM "Sale"
    WHERE id = ${input.saleId}
    LIMIT 1
  `;

  const sale = rows[0];
  if (!sale) {
    throw new Error("Sale not found for finance posting");
  }

  if (sale.status !== "POSTED") {
    return null;
  }

  const currency = await getSalesDefaultCurrency(tx);
  const paymentStatus = String(sale.paymentStatus ?? "UNPAID").toUpperCase();
  const isSettledAtPosting = paymentStatus === "PAID";
  const usesBankLedger =
    sale.paymentMethod === "BANK" ||
    sale.paymentMethod === "CHEQUE" ||
    sale.paymentMethod === "MOBILE_MONEY";
  const postingType = isSettledAtPosting ? "SALES_RECEIPT" : "SALES_INVOICE";

  await tx`
    INSERT INTO "SalesFinancePosting" (
      id, "sourceType", "sourceId", "postingType", "saleId", "customerId", "bankAccountId",
      amount, currency, status, memo, "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      'sales.sale',
      ${sale.id},
      ${postingType},
      ${sale.id},
      ${sale.customerId},
      ${isSettledAtPosting ? sale.bankAccountId : null},
      ${sale.totalAmount},
      ${currency},
      'POSTED',
      ${isSettledAtPosting ? `Sales receipt for ${sale.saleNo}` : `Sales invoice accrual for ${sale.saleNo}`},
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
      "customerId" = EXCLUDED."customerId",
      "bankAccountId" = EXCLUDED."bankAccountId",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  if (isSettledAtPosting && usesBankLedger) {
    await applyBankBalanceDelta(tx, sale.bankAccountId, Number(sale.totalAmount ?? 0));
  }

  await syncSalesJournalEntry(tx, {
    sourceType: "sales.sale",
    sourceId: sale.id,
    description: isSettledAtPosting
      ? `Sales receipt for ${sale.saleNo}`
      : `Sales invoice accrual for ${sale.saleNo}`,
    postedById: input.userId,
    amount: Number(sale.totalAmount ?? 0),
    paymentMethod: sale.paymentMethod,
    paymentStatus,
  });

  return { saleId: sale.id };
}

export async function syncPostedSalesReturnFinance(
  tx: Tx,
  input: {
    returnId: string;
    userId: string;
  },
) {
  const rows = await tx<Array<{
    id: string;
    returnNo: string;
    saleId: string | null;
    totalAmount: number;
    status: string;
    paymentMethod: "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY" | null;
    bankAccountId: string | null;
    customerId: string | null;
    paymentStatus: string | null;
    creditNoteId: string | null;
    creditNoteNo: string | null;
  }>>`
    SELECT
      sr.id,
      sr."returnNo",
      sr."saleId",
      sr."totalAmount",
      sr.status,
      s."paymentMethod"::text AS "paymentMethod",
      s."bankAccountId",
      COALESCE(sr."customerId", s."customerId") AS "customerId",
      s."paymentStatus",
      scn.id AS "creditNoteId",
      scn."creditNoteNo"
    FROM "SalesReturn" sr
    LEFT JOIN "Sale" s ON s.id = sr."saleId"
    LEFT JOIN "SalesCreditNote" scn ON scn."salesReturnId" = sr.id
    WHERE sr.id = ${input.returnId}
    LIMIT 1
  `;

  const salesReturn = rows[0];
  if (!salesReturn) {
    throw new Error("Sales return not found for finance posting");
  }

  if (salesReturn.status !== "POSTED") {
    return null;
  }

  if (!salesReturn.saleId) {
    return null;
  }

  const currency = await getSalesDefaultCurrency(tx);
  const paymentStatus = String(salesReturn.paymentStatus ?? "UNPAID").toUpperCase();
  const wasSettled = paymentStatus === "PAID";
  const usesBankLedger =
    salesReturn.paymentMethod === "BANK" ||
    salesReturn.paymentMethod === "CHEQUE" ||
    salesReturn.paymentMethod === "MOBILE_MONEY";

  await tx`
    INSERT INTO "SalesFinancePosting" (
      id, "sourceType", "sourceId", "postingType", "saleId", "customerId", "bankAccountId",
      amount, currency, status, memo, "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${salesReturn.creditNoteId ? "sales.credit-note" : "sales.return"},
      ${salesReturn.creditNoteId ?? salesReturn.id},
      'SALES_RETURN',
      ${salesReturn.saleId},
      ${salesReturn.customerId},
      ${wasSettled ? salesReturn.bankAccountId : null},
      ${salesReturn.totalAmount},
      ${currency},
      'POSTED',
      ${salesReturn.creditNoteNo
        ? `Credit note ${salesReturn.creditNoteNo} for sales return ${salesReturn.returnNo}`
        : `Sales return reversal for ${salesReturn.returnNo}`},
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
      "saleId" = EXCLUDED."saleId",
      "customerId" = EXCLUDED."customerId",
      "bankAccountId" = EXCLUDED."bankAccountId",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  if (wasSettled && usesBankLedger) {
    await applyBankBalanceDelta(tx, salesReturn.bankAccountId, Number(salesReturn.totalAmount ?? 0) * -1);
  }

  await syncSalesJournalEntry(tx, {
    sourceType: salesReturn.creditNoteId ? "sales.credit-note" : "sales.return",
    sourceId: salesReturn.creditNoteId ?? salesReturn.id,
    description: salesReturn.creditNoteNo
      ? `Credit note ${salesReturn.creditNoteNo} for sales return ${salesReturn.returnNo}`
      : `Sales return reversal for ${salesReturn.returnNo}`,
    postedById: input.userId,
    amount: Number(salesReturn.totalAmount ?? 0),
    paymentMethod: salesReturn.paymentMethod,
    paymentStatus,
  });

  return {
    returnId: salesReturn.id,
    saleId: salesReturn.saleId,
  };
}

export async function syncCustomerReceiptFinance(
  tx: Tx,
  input: {
    receiptId: string;
    userId: string;
  },
) {
  const rows = await tx<Array<{
    id: string;
    receiptNo: string;
    customerId: string;
    bankAccountId: string | null;
    amountReceived: number;
    paymentMethod: "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY";
    status: string;
    firstInvoiceId: string | null;
    firstSaleId: string | null;
  }>>`
    SELECT
      cr.id,
      cr."receiptNo",
      cr."customerId",
      cr."bankAccountId",
      cr."amountReceived",
      cr."paymentMethod"::text AS "paymentMethod",
      cr.status,
      (
        SELECT cra."salesInvoiceId"
        FROM "CustomerReceiptAllocation" cra
        WHERE cra."receiptId" = cr.id
        ORDER BY cra."createdAt" ASC
        LIMIT 1
      ) AS "firstInvoiceId",
      (
        SELECT si."saleId"
        FROM "CustomerReceiptAllocation" cra
        INNER JOIN "SalesInvoice" si ON si.id = cra."salesInvoiceId"
        WHERE cra."receiptId" = cr.id
        ORDER BY cra."createdAt" ASC
        LIMIT 1
      ) AS "firstSaleId"
    FROM "CustomerReceipt" cr
    WHERE cr.id = ${input.receiptId}
    LIMIT 1
  `;

  const receipt = rows[0];
  if (!receipt) {
    throw new Error("Customer receipt not found for finance posting");
  }
  if (!["POSTED", "PARTIALLY_ALLOCATED", "FULLY_ALLOCATED"].includes(String(receipt.status).toUpperCase())) {
    return null;
  }

  const currency = await getSalesDefaultCurrency(tx);
  const usesBankLedger =
    receipt.paymentMethod === "BANK" ||
    receipt.paymentMethod === "CHEQUE" ||
    receipt.paymentMethod === "MOBILE_MONEY";

  await tx`
    INSERT INTO "SalesFinancePosting" (
      id, "sourceType", "sourceId", "postingType", "saleId", "invoiceId", "customerReceiptId",
      "customerId", "bankAccountId", amount, currency, status, memo, "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      'sales.receipt',
      ${receipt.id},
      'CUSTOMER_RECEIPT',
      ${receipt.firstSaleId},
      ${receipt.firstInvoiceId},
      ${receipt.id},
      ${receipt.customerId},
      ${receipt.bankAccountId},
      ${receipt.amountReceived},
      ${currency},
      'POSTED',
      ${`Customer receipt ${receipt.receiptNo}`},
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
      "saleId" = EXCLUDED."saleId",
      "invoiceId" = EXCLUDED."invoiceId",
      "customerReceiptId" = EXCLUDED."customerReceiptId",
      "customerId" = EXCLUDED."customerId",
      "bankAccountId" = EXCLUDED."bankAccountId",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  if (usesBankLedger) {
    await applyBankBalanceDelta(tx, receipt.bankAccountId, Number(receipt.amountReceived ?? 0));
  }

  await syncSalesJournalEntry(tx, {
    sourceType: "sales.receipt",
    sourceId: receipt.id,
    description: `Customer receipt ${receipt.receiptNo}`,
    postedById: input.userId,
    amount: Number(receipt.amountReceived ?? 0),
    paymentMethod: receipt.paymentMethod,
  });

  return { receiptId: receipt.id };
}

export async function voidCustomerReceiptFinance(
  tx: Tx,
  input: {
    receiptId: string;
    userId: string;
    reason?: string | null;
  },
) {
  const rows = await tx<Array<{
    id: string;
    receiptNo: string;
    bankAccountId: string | null;
    amountReceived: number;
    paymentMethod: "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY";
    status: string;
  }>>`
    SELECT
      cr.id,
      cr."receiptNo",
      cr."bankAccountId",
      cr."amountReceived",
      cr."paymentMethod"::text AS "paymentMethod",
      cr.status
    FROM "CustomerReceipt" cr
    WHERE cr.id = ${input.receiptId}
    LIMIT 1
  `;

  const receipt = rows[0];
  if (!receipt) {
    throw new Error("Customer receipt not found for finance reversal");
  }

  const usesBankLedger =
    receipt.paymentMethod === "BANK" ||
    receipt.paymentMethod === "CHEQUE" ||
    receipt.paymentMethod === "MOBILE_MONEY";

  await tx`
    UPDATE "SalesFinancePosting"
    SET
      status = 'VOIDED',
      memo = CASE
        WHEN ${input.reason ?? null}::text IS NULL OR ${input.reason ?? null}::text = ''
          THEN CONCAT(COALESCE(memo, ''), ' [Voided]')
        ELSE CONCAT(COALESCE(memo, ''), ' [Voided: ', ${input.reason ?? null}, ']')
      END,
      "updatedAt" = NOW()
    WHERE "sourceType" = 'sales.receipt'
      AND "sourceId" = ${receipt.id}
  `;

  if (usesBankLedger) {
    await applyBankBalanceDelta(tx, receipt.bankAccountId, Number(receipt.amountReceived ?? 0) * -1);
  }

  await reverseSalesJournalEntry(tx, {
    sourceType: "sales.receipt",
    sourceId: receipt.id,
    reason: input.reason ?? `Customer receipt ${receipt.receiptNo} voided`,
  });

  return { receiptId: receipt.id };
}
