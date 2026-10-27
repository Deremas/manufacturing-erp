import { sql } from "@/lib/db";

export type FinanceExceptionRow = {
  id: string;
  exceptionType: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  sourceType: string;
  sourceId: string;
  documentNo: string;
  recordDate: string;
  amount: number;
  description: string;
  sourceHref: string | null;
};

export async function getFinanceExceptions(): Promise<FinanceExceptionRow[]> {
  const rows = await sql<Array<FinanceExceptionRow>>`
    SELECT * FROM (
      SELECT
        'sales-finance-' || p.id AS id,
        'MISSING_JOURNAL' AS "exceptionType",
        'HIGH' AS severity,
        p."sourceType",
        p."sourceId",
        COALESCE(si."invoiceNo", s."saleNo", p."sourceId") AS "documentNo",
        COALESCE(p."postedAt", p."createdAt")::text AS "recordDate",
        p.amount::double precision AS amount,
        'Posted sales finance record has no matching journal entry.' AS description,
        CASE
          WHEN si.id IS NOT NULL THEN '/sales/invoices/' || si.id
          WHEN s.id IS NOT NULL THEN '/sales/history/' || s.id
          ELSE NULL
        END AS "sourceHref"
      FROM "SalesFinancePosting" p
      LEFT JOIN "JournalEntry" je ON je."sourceType" = p."sourceType" AND je."sourceId" = p."sourceId" AND je.status = 'POSTED'
      LEFT JOIN "SalesInvoice" si ON si.id = p."invoiceId"
      LEFT JOIN "Sale" s ON s.id = p."saleId"
      WHERE p.status = 'POSTED' AND p."isArchived" = false AND je.id IS NULL

      UNION ALL

      SELECT
        'procurement-finance-' || p.id,
        'MISSING_JOURNAL',
        'HIGH',
        p."sourceType",
        p."sourceId",
        COALESCE(i."invoiceNo", pay."paymentNo", p."sourceId"),
        COALESCE(p."postedAt", p."createdAt")::text,
        p.amount::double precision,
        'Posted procurement finance record has no matching journal entry.',
        CASE
          WHEN i.id IS NOT NULL THEN '/procurement/invoice/view/' || i."publicId"
          WHEN pay.id IS NOT NULL THEN '/procurement/payment/view/' || pay."publicId"
          ELSE NULL
        END
      FROM "ProcurementFinancePosting" p
      LEFT JOIN "JournalEntry" je ON je."sourceType" = p."sourceType" AND je."sourceId" = p."sourceId" AND je.status = 'POSTED'
      LEFT JOIN "SupplierInvoice" i ON i.id = p."invoiceId"
      LEFT JOIN "SupplierPayment" pay ON pay.id = p."paymentId"
      WHERE p.status = 'POSTED' AND je.id IS NULL

      UNION ALL

      SELECT
        'journal-' || je.id,
        'IMBALANCED_JOURNAL',
        'HIGH',
        je."sourceType",
        je."sourceId",
        je."journalNo",
        je."entryDate"::text,
        ABS(je."totalDebit" - je."totalCredit")::double precision,
        'Posted journal debit and credit totals do not balance.',
        '/accounting/journals/' || je.id
      FROM "JournalEntry" je
      WHERE je.status = 'POSTED' AND ABS(je."totalDebit" - je."totalCredit") > 0.009

      UNION ALL

      SELECT
        'receipt-' || r.id,
        'UNALLOCATED_RECEIPT',
        'MEDIUM',
        'sales.receipt',
        r.id,
        r."receiptNo",
        r."receiptDate"::text,
        r."unappliedAmount"::double precision,
        'Posted receipt still has an unallocated customer balance.',
        '/sales/receipts/' || r.id
      FROM "CustomerReceipt" r
      WHERE r.status <> 'VOIDED' AND r."isArchived" = false AND r."unappliedAmount" > 0.009
    ) exceptions
    ORDER BY
      CASE severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
      "recordDate" DESC
  `;

  return rows.map((row) => ({ ...row, amount: Number(row.amount ?? 0) }));
}
