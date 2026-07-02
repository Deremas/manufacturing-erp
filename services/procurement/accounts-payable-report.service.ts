import { sql } from "@/lib/db";

export interface AccountsPayableAgingRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  invoiceId: string;
  invoiceNo: string;
  supplierInvoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currentBucket: number;
  bucket1To30: number;
  bucket31To60: number;
  bucket61To90: number;
  bucketOver90: number;
  ageDays: number;
  status: string;
}

export interface ProcurementFinanceRegisterRow {
  id: string;
  sourceType: string;
  sourceId: string;
  postingType: string;
  supplierName: string;
  invoiceNo: string | null;
  paymentNo: string | null;
  bankAccountName: string | null;
  amount: number;
  currency: string;
  status: string;
  memo: string;
  postedAt: string | null;
}

export async function getAccountsPayableAgingReport(): Promise<AccountsPayableAgingRow[]> {
  try {
    return await sql<Array<AccountsPayableAgingRow>>`
      WITH invoice_ages AS (
        SELECT
          si.id AS "invoiceId",
          si."supplierId",
          s."supplierCode",
          s.name AS "supplierName",
          si."invoiceNo",
          si."supplierInvoiceNo",
          si."invoiceDate"::text,
          si."dueDate"::text AS "dueDate",
          si."totalAmount",
          si."amountPaid",
          si."balanceDue",
          si.status::text AS status,
          GREATEST(
            FLOOR(EXTRACT(EPOCH FROM ((CURRENT_DATE)::timestamp - COALESCE(si."dueDate", si."invoiceDate"))) / 86400.0),
            0
          )::int AS "ageDays"
        FROM "SupplierInvoice" si
        INNER JOIN "Supplier" s ON s.id = si."supplierId"
        WHERE si.status <> 'CANCELLED'
          AND COALESCE(si."balanceDue", 0) > 0
      )
      SELECT
        "supplierId",
        "supplierCode",
        "supplierName",
        "invoiceId",
        "invoiceNo",
        COALESCE("supplierInvoiceNo", '') AS "supplierInvoiceNo",
        "invoiceDate",
        "dueDate",
        "totalAmount",
        "amountPaid",
        "balanceDue",
        CASE WHEN "ageDays" <= 0 THEN "balanceDue" ELSE 0 END::double precision AS "currentBucket",
        CASE WHEN "ageDays" BETWEEN 1 AND 30 THEN "balanceDue" ELSE 0 END::double precision AS "bucket1To30",
        CASE WHEN "ageDays" BETWEEN 31 AND 60 THEN "balanceDue" ELSE 0 END::double precision AS "bucket31To60",
        CASE WHEN "ageDays" BETWEEN 61 AND 90 THEN "balanceDue" ELSE 0 END::double precision AS "bucket61To90",
        CASE WHEN "ageDays" > 90 THEN "balanceDue" ELSE 0 END::double precision AS "bucketOver90",
        "ageDays",
        status
      FROM invoice_ages
      ORDER BY "ageDays" DESC, "supplierName" ASC, "invoiceDate" ASC
    `;
  } catch {
    return [];
  }
}

export async function getProcurementFinanceRegister(): Promise<ProcurementFinanceRegisterRow[]> {
  try {
    return await sql<Array<ProcurementFinanceRegisterRow>>`
      SELECT
        pfp.id,
        pfp."sourceType",
        pfp."sourceId",
        pfp."postingType",
        s.name AS "supplierName",
        si."invoiceNo",
        sp."paymentNo",
        ba."accountName" AS "bankAccountName",
        pfp.amount,
        pfp.currency,
        pfp.status,
        COALESCE(pfp.memo, '') AS memo,
        pfp."postedAt"::text AS "postedAt"
      FROM "ProcurementFinancePosting" pfp
      INNER JOIN "Supplier" s ON s.id = pfp."supplierId"
      LEFT JOIN "SupplierInvoice" si ON si.id = pfp."invoiceId"
      LEFT JOIN "SupplierPayment" sp ON sp.id = pfp."paymentId"
      LEFT JOIN "BankAccount" ba ON ba.id = pfp."bankAccountId"
      ORDER BY COALESCE(pfp."postedAt", pfp."createdAt") DESC, pfp."createdAt" DESC
    `;
  } catch {
    return [];
  }
}
