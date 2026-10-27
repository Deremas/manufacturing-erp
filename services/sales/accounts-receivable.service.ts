import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { syncCustomerReceiptFinance, voidCustomerReceiptFinance } from "@/services/sales/sales-finance.service";
import {
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  writeSalesAudit,
  writeSalesHistory,
  type Tx,
} from "@/services/sales/sales-shared.service";

type Scope = {
  accessibleLocationIds?: string[] | null;
  customerId?: string | null;
};

export interface AccountsReceivableAgingRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  invoiceId: string;
  invoiceNo: string;
  channel: string;
  locationId: string;
  locationCode: string;
  locationName: string;
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

export interface OpenSalesInvoiceOption {
  id: string;
  label: string;
  invoiceNo: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  channel: string;
  invoiceDate: string;
  dueDate?: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
}

export interface CustomerReceiptSummary {
  id: string;
  publicId: number;
  receiptNo: string;
  receiptDate: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  paymentMethod: string;
  bankAccountId?: string;
  bankAccountName?: string;
  amountReceived: number;
  unappliedAmount: number;
  currency: string;
  status: string;
  referenceNo?: string;
  postedAt?: string;
  allocationCount: number;
}

export interface CustomerReceiptDetail extends CustomerReceiptSummary {
  remarks?: string;
  createdById: string;
  postedById?: string;
  allocations: Array<{
    id: string;
    salesInvoiceId: string;
    invoiceNo: string;
    channel: string;
    locationCode: string;
    locationName: string;
    invoiceDate: string;
    dueDate?: string;
    amount: number;
  }>;
}

export interface CustomerStatementEntry {
  entryType: "INVOICE" | "RECEIPT" | "CREDIT_NOTE";
  documentId: string;
  documentNo: string;
  entryDate: string;
  dueDate?: string;
  channel?: string;
  locationCode: string;
  locationName: string;
  debit: number;
  credit: number;
  runningBalance: number;
  status: string;
  reference?: string;
}

export interface CustomerStatement {
  customerId: string;
  customerCode: string;
  customerName: string;
  totalInvoiced: number;
  totalReceived: number;
  outstandingBalance: number;
  entries: CustomerStatementEntry[];
}

export interface AccountsReceivableCustomerSummaryRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  invoiceCount: number;
  outstandingBalance: number;
  currentBucket: number;
  overdueBalance: number;
  oldestAgeDays: number;
}

export interface CreateCustomerReceiptInput {
  receiptDate: string;
  customerId: string;
  locationId: string;
  paymentMethod: "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY";
  bankAccountId?: string | null;
  amountReceived: number;
  referenceNo?: string | null;
  remarks?: string | null;
  allocations: Array<{
    salesInvoiceId: string;
    amount: number;
  }>;
}

export interface UpdateCustomerReceiptInput extends CreateCustomerReceiptInput {}

function receiptAllocationStatus(amountReceived: number, allocatedAmount: number) {
  if (allocatedAmount <= 0) return "POSTED";
  if (allocatedAmount + 0.005 < amountReceived) return "PARTIALLY_ALLOCATED";
  return "FULLY_ALLOCATED";
}

function isPostedReceiptStatus(status: string) {
  return ["POSTED", "PARTIALLY_ALLOCATED", "FULLY_ALLOCATED"].includes(
    String(status).toUpperCase(),
  );
}

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

async function ensureCustomer(tx: Tx, customerId: string) {
  const rows = await tx<Array<{ id: string; customerCode: string; name: string }>>`
    SELECT id, "customerCode", name
    FROM "Customer"
    WHERE id = ${customerId}
      AND "isArchived" = false
      AND "isActive" = true
    LIMIT 1
  `;
  const customer = rows[0];
  if (!customer) {
    throw new Error("Customer was not found");
  }
  return customer;
}

async function ensureLocation(tx: Tx, locationId: string) {
  const rows = await tx<Array<{ id: string; locationCode: string; locationName: string }>>`
    SELECT id, "locationCode", "locationName"
    FROM "Location"
    WHERE id = ${locationId}
      AND "isArchived" = false
      AND "isActive" = true
    LIMIT 1
  `;
  const location = rows[0];
  if (!location) {
    throw new Error("Receipt location was not found");
  }
  return location;
}

async function ensureReceiptBankAccount(tx: Tx, paymentMethod: string, bankAccountId?: string | null) {
  const requiresBank = paymentMethod === "BANK" || paymentMethod === "CHEQUE" || paymentMethod === "MOBILE_MONEY";
  if (!requiresBank) {
    return null;
  }
  if (!bankAccountId) {
    throw new Error("Bank account is required for this payment method");
  }
  const rows = await tx<Array<{ id: string; accountName: string }>>`
    SELECT id, "accountName"
    FROM "BankAccount"
    WHERE id = ${bankAccountId}
      AND "isArchived" = false
      AND "isActive" = true
      AND "allowReceipts" = true
    LIMIT 1
  `;
  const account = rows[0];
  if (!account) {
    throw new Error("Selected bank account is not available for receipts");
  }
  return account;
}

export async function syncSalesInvoiceBalance(
  tx: Tx,
  invoiceId: string,
) {
  const rows = await tx<Array<{
    totalAmount: number;
    saleId: string;
    salePayments: number;
    receiptAllocations: number;
    creditNotes: number;
  }>>`
    SELECT
      si."totalAmount",
      si."saleId",
      COALESCE((
        SELECT SUM(sp.amount)
        FROM "SalesPayment" sp
        WHERE sp."saleId" = si."saleId"
          AND sp."isArchived" = false
          AND sp.status = 'POSTED'
      ), 0)::double precision AS "salePayments",
      COALESCE((
        SELECT SUM(cra.amount)
        FROM "CustomerReceiptAllocation" cra
        INNER JOIN "CustomerReceipt" cr ON cr.id = cra."receiptId"
        WHERE cra."salesInvoiceId" = si.id
          AND cr."isArchived" = false
          AND cr.status IN ('POSTED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED')
      ), 0)::double precision AS "receiptAllocations",
      COALESCE((
        SELECT SUM(scn."totalAmount")
        FROM "SalesCreditNote" scn
        WHERE scn."salesInvoiceId" = si.id
          AND scn."isArchived" = false
          AND scn.status IN ('POSTED', 'APPLIED', 'PARTIALLY_APPLIED')
      ), 0)::double precision AS "creditNotes"
    FROM "SalesInvoice" si
    WHERE si.id = ${invoiceId}
      AND si."isArchived" = false
    LIMIT 1
  `;

  const invoice = rows[0];
  if (!invoice) {
    throw new Error("Sales invoice was not found");
  }

  const effectiveInvoiceAmount = Math.max(
    Number(invoice.totalAmount ?? 0) - Number(invoice.creditNotes ?? 0),
    0,
  );
  const amountPaid = Math.min(
    effectiveInvoiceAmount,
    Number(invoice.salePayments ?? 0) + Number(invoice.receiptAllocations ?? 0),
  );
  const balanceDue = Math.max(effectiveInvoiceAmount - amountPaid, 0);
  const paymentStatus = balanceDue <= 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";

  await tx`
    UPDATE "SalesInvoice"
    SET
      "amountPaid" = ${Number(amountPaid.toFixed(2))},
      "balanceDue" = ${Number(balanceDue.toFixed(2))},
      "paymentStatus" = ${paymentStatus},
      "updatedAt" = NOW()
    WHERE id = ${invoiceId}
  `;

  return {
    invoiceId,
    amountPaid: Number(amountPaid.toFixed(2)),
    balanceDue: Number(balanceDue.toFixed(2)),
    paymentStatus,
  };
}

export async function listOpenSalesInvoices(
  scope: Scope = {},
  options: { includeInvoiceIds?: string[] } = {},
): Promise<OpenSalesInvoiceOption[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const customerId = normalizeText(scope.customerId);
  const includeInvoiceIds = Array.from(new Set((options.includeInvoiceIds ?? []).filter(Boolean)));
  const forcedInvoiceIds = includeInvoiceIds.length > 0 ? includeInvoiceIds : ["__never__"];
  const rows = await sql<Array<{
    id: string;
    invoiceNo: string;
    customerId: string;
    customerCode: string | null;
    customerName: string | null;
    locationId: string;
    locationCode: string;
    locationName: string;
    channel: string;
    invoiceDate: string;
    dueDate: string | null;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    currency: string;
  }>>`
    SELECT
      si.id,
      si."invoiceNo",
      si."customerId",
      c."customerCode",
      c.name AS "customerName",
      si."locationId",
      l."locationCode",
      l."locationName",
      si.channel,
      si."invoiceDate"::text AS "invoiceDate",
      si."dueDate"::text AS "dueDate",
      si."totalAmount",
      si."amountPaid",
      si."balanceDue",
      si.currency
    FROM "SalesInvoice" si
    INNER JOIN "Customer" c ON c.id = si."customerId"
    INNER JOIN "Location" l ON l.id = si."locationId"
    WHERE si."isArchived" = false
      AND si.status = 'POSTED'
      AND (
        COALESCE(si."balanceDue", 0) > 0
        OR si.id = ANY(${forcedInvoiceIds}::text[])
      )
      AND (${customerId}::text IS NULL OR si."customerId" = ${customerId})
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR si."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    ORDER BY si."invoiceDate" ASC, si."invoiceNo" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    label: `${row.invoiceNo} - ${row.customerCode ?? ""}${row.customerCode && row.customerName ? " - " : ""}${row.customerName ?? ""}`.trim(),
    invoiceNo: row.invoiceNo,
    customerId: row.customerId,
    customerCode: row.customerCode ?? undefined,
    customerName: row.customerName ?? undefined,
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    channel: row.channel,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate ?? undefined,
    totalAmount: Number(row.totalAmount ?? 0),
    amountPaid: Number(row.amountPaid ?? 0),
    balanceDue: Number(row.balanceDue ?? 0),
    currency: row.currency,
  }));
}

export async function getAccountsReceivableAgingReport(scope: Scope = {}): Promise<AccountsReceivableAgingRow[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  const customerId = normalizeText(scope.customerId);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const rows = await sql<Array<AccountsReceivableAgingRow>>`
    WITH invoice_ages AS (
      SELECT
        si.id AS "invoiceId",
        si."customerId",
        c."customerCode",
        c.name AS "customerName",
        si."invoiceNo",
        si.channel,
        si."locationId",
        l."locationCode",
        l."locationName",
        si."invoiceDate"::text AS "invoiceDate",
        si."dueDate"::text AS "dueDate",
        si."totalAmount",
        si."amountPaid",
        si."balanceDue",
        si.status::text AS status,
        GREATEST(
          FLOOR(EXTRACT(EPOCH FROM ((CURRENT_DATE)::timestamp - COALESCE(si."dueDate", si."invoiceDate"))) / 86400.0),
          0
        )::int AS "ageDays"
      FROM "SalesInvoice" si
      INNER JOIN "Customer" c ON c.id = si."customerId"
      INNER JOIN "Location" l ON l.id = si."locationId"
      WHERE si."isArchived" = false
        AND si.status = 'POSTED'
        AND COALESCE(si."balanceDue", 0) > 0
        AND (${customerId}::text IS NULL OR si."customerId" = ${customerId})
        AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR si."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    )
    SELECT
      "customerId",
      "customerCode",
      "customerName",
      "invoiceId",
      "invoiceNo",
      channel,
      "locationId",
      "locationCode",
      "locationName",
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
    ORDER BY "ageDays" DESC, "customerName" ASC, "invoiceDate" ASC
  `;

  return rows.map((row) => ({
    ...row,
    totalAmount: Number(row.totalAmount ?? 0),
    amountPaid: Number(row.amountPaid ?? 0),
    balanceDue: Number(row.balanceDue ?? 0),
    currentBucket: Number(row.currentBucket ?? 0),
    bucket1To30: Number(row.bucket1To30 ?? 0),
    bucket31To60: Number(row.bucket31To60 ?? 0),
    bucket61To90: Number(row.bucket61To90 ?? 0),
    bucketOver90: Number(row.bucketOver90 ?? 0),
    ageDays: Number(row.ageDays ?? 0),
  }));
}

export async function getAccountsReceivableCustomerSummary(
  scope: Scope = {},
): Promise<AccountsReceivableCustomerSummaryRow[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const rows = await sql<Array<AccountsReceivableCustomerSummaryRow>>`
    WITH invoice_ages AS (
      SELECT
        si."customerId",
        c."customerCode",
        c.name AS "customerName",
        si."balanceDue",
        GREATEST(
          FLOOR(EXTRACT(EPOCH FROM ((CURRENT_DATE)::timestamp - COALESCE(si."dueDate", si."invoiceDate"))) / 86400.0),
          0
        )::int AS "ageDays"
      FROM "SalesInvoice" si
      INNER JOIN "Customer" c ON c.id = si."customerId"
      WHERE si."isArchived" = false
        AND si.status = 'POSTED'
        AND COALESCE(si."balanceDue", 0) > 0
        AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR si."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    )
    SELECT
      "customerId",
      "customerCode",
      "customerName",
      COUNT(*)::int AS "invoiceCount",
      COALESCE(SUM("balanceDue"), 0)::double precision AS "outstandingBalance",
      COALESCE(SUM(CASE WHEN "ageDays" <= 0 THEN "balanceDue" ELSE 0 END), 0)::double precision AS "currentBucket",
      COALESCE(SUM(CASE WHEN "ageDays" > 0 THEN "balanceDue" ELSE 0 END), 0)::double precision AS "overdueBalance",
      COALESCE(MAX("ageDays"), 0)::int AS "oldestAgeDays"
    FROM invoice_ages
    GROUP BY "customerId", "customerCode", "customerName"
    ORDER BY "outstandingBalance" DESC, "customerName" ASC
  `;

  return rows.map((row) => ({
    ...row,
    invoiceCount: Number(row.invoiceCount ?? 0),
    outstandingBalance: Number(row.outstandingBalance ?? 0),
    currentBucket: Number(row.currentBucket ?? 0),
    overdueBalance: Number(row.overdueBalance ?? 0),
    oldestAgeDays: Number(row.oldestAgeDays ?? 0),
  }));
}

export async function listCustomerReceipts(scope: Scope = {}): Promise<CustomerReceiptSummary[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const rows = await sql<Array<{
    id: string;
    receiptNo: string;
    receiptDate: string;
    customerId: string;
    customerCode: string | null;
    customerName: string | null;
    locationId: string;
    locationCode: string;
    locationName: string;
    paymentMethod: string;
    bankAccountId: string | null;
    bankAccountName: string | null;
    amountReceived: number;
    unappliedAmount: number;
    currency: string;
    status: string;
    referenceNo: string | null;
    postedAt: string | null;
    allocationCount: number;
  }>>`
    SELECT
      cr.id,
      cr."publicId",
      cr."receiptNo",
      cr."receiptDate"::text AS "receiptDate",
      cr."customerId",
      c."customerCode",
      c.name AS "customerName",
      cr."locationId",
      l."locationCode",
      l."locationName",
      cr."paymentMethod"::text AS "paymentMethod",
      cr."bankAccountId",
      ba."accountName" AS "bankAccountName",
      cr."amountReceived",
      cr."unappliedAmount",
      cr.currency,
      cr.status,
      cr."referenceNo",
      cr."postedAt"::text AS "postedAt",
      COUNT(cra.id)::int AS "allocationCount"
    FROM "CustomerReceipt" cr
    INNER JOIN "Customer" c ON c.id = cr."customerId"
    INNER JOIN "Location" l ON l.id = cr."locationId"
    LEFT JOIN "BankAccount" ba ON ba.id = cr."bankAccountId"
    LEFT JOIN "CustomerReceiptAllocation" cra ON cra."receiptId" = cr.id
    WHERE cr."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR cr."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    GROUP BY cr.id, c.id, l.id, ba.id
    ORDER BY cr."receiptDate" DESC, cr."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    receiptNo: row.receiptNo,
    receiptDate: row.receiptDate,
    customerId: row.customerId,
    customerCode: row.customerCode ?? undefined,
    customerName: row.customerName ?? undefined,
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    paymentMethod: row.paymentMethod,
    bankAccountId: row.bankAccountId ?? undefined,
    bankAccountName: row.bankAccountName ?? undefined,
    amountReceived: Number(row.amountReceived ?? 0),
    unappliedAmount: Number(row.unappliedAmount ?? 0),
    currency: row.currency,
    status: row.status,
    referenceNo: row.referenceNo ?? undefined,
    postedAt: row.postedAt ?? undefined,
    allocationCount: Number(row.allocationCount ?? 0),
  }));
}

export async function getCustomerReceiptById(
  id: string,
  scope: Scope = {},
): Promise<CustomerReceiptDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const rows = await sql<Array<{
    id: string;
    receiptNo: string;
    receiptDate: string;
    customerId: string;
    customerCode: string | null;
    customerName: string | null;
    locationId: string;
    locationCode: string;
    locationName: string;
    paymentMethod: string;
    bankAccountId: string | null;
    bankAccountName: string | null;
    amountReceived: number;
    unappliedAmount: number;
    currency: string;
    status: string;
    referenceNo: string | null;
    postedAt: string | null;
    remarks: string | null;
    createdById: string;
    postedById: string | null;
  }>>`
    SELECT
      cr.id,
      cr."publicId",
      cr."receiptNo",
      cr."receiptDate"::text AS "receiptDate",
      cr."customerId",
      c."customerCode",
      c.name AS "customerName",
      cr."locationId",
      l."locationCode",
      l."locationName",
      cr."paymentMethod"::text AS "paymentMethod",
      cr."bankAccountId",
      ba."accountName" AS "bankAccountName",
      cr."amountReceived",
      cr."unappliedAmount",
      cr.currency,
      cr.status,
      cr."referenceNo",
      cr."postedAt"::text AS "postedAt",
      cr.remarks,
      cr."createdById",
      cr."postedById"
    FROM "CustomerReceipt" cr
    INNER JOIN "Customer" c ON c.id = cr."customerId"
    INNER JOIN "Location" l ON l.id = cr."locationId"
    LEFT JOIN "BankAccount" ba ON ba.id = cr."bankAccountId"
    WHERE ${isPublicIdParam(id) ? sql`cr."publicId" = ${Number(id)}` : sql`cr.id = ${id}`}
      AND cr."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR cr."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    LIMIT 1
  `;
  const header = rows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const allocationRows = await sql<Array<{
    id: string;
    salesInvoiceId: string;
    invoiceNo: string;
    channel: string;
    locationCode: string;
    locationName: string;
    invoiceDate: string;
    dueDate: string | null;
    amount: number;
  }>>`
    SELECT
      cra.id,
      cra."salesInvoiceId",
      si."invoiceNo",
      si.channel,
      l."locationCode",
      l."locationName",
      si."invoiceDate"::text AS "invoiceDate",
      si."dueDate"::text AS "dueDate",
      cra.amount
    FROM "CustomerReceiptAllocation" cra
    INNER JOIN "SalesInvoice" si ON si.id = cra."salesInvoiceId"
    INNER JOIN "Location" l ON l.id = si."locationId"
    WHERE cra."receiptId" = ${documentId}
    ORDER BY si."invoiceDate" ASC, si."invoiceNo" ASC
  `;

  return {
    id: header.id,
    receiptNo: header.receiptNo,
    receiptDate: header.receiptDate,
    customerId: header.customerId,
    customerCode: header.customerCode ?? undefined,
    customerName: header.customerName ?? undefined,
    locationId: header.locationId,
    locationCode: header.locationCode,
    locationName: header.locationName,
    paymentMethod: header.paymentMethod,
    bankAccountId: header.bankAccountId ?? undefined,
    bankAccountName: header.bankAccountName ?? undefined,
    amountReceived: Number(header.amountReceived ?? 0),
    unappliedAmount: Number(header.unappliedAmount ?? 0),
    currency: header.currency,
    status: header.status,
    referenceNo: header.referenceNo ?? undefined,
    postedAt: header.postedAt ?? undefined,
    allocationCount: allocationRows.length,
    remarks: header.remarks ?? undefined,
    createdById: header.createdById,
    postedById: header.postedById ?? undefined,
    allocations: allocationRows.map((row) => ({
      id: row.id,
      salesInvoiceId: row.salesInvoiceId,
      invoiceNo: row.invoiceNo,
      channel: row.channel,
      locationCode: row.locationCode,
      locationName: row.locationName,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate ?? undefined,
      amount: Number(row.amount ?? 0),
    })),
  };
}

export async function createCustomerReceipt(
  input: CreateCustomerReceiptInput,
  actor: { userId: string; userName: string },
  scope: Scope = {},
) {
  if (!input.receiptDate) {
    throw new Error("Receipt date is required");
  }
  if (!input.customerId) {
    throw new Error("Customer is required");
  }
  if (!input.locationId) {
    throw new Error("Receipt location is required");
  }
  if (!(Number(input.amountReceived ?? 0) > 0)) {
    throw new Error("Receipt amount must be greater than zero");
  }
  const allocations = (input.allocations ?? [])
    .map((allocation) => ({
      salesInvoiceId: String(allocation.salesInvoiceId ?? "").trim(),
      amount: Number(allocation.amount ?? 0),
    }))
    .filter((allocation) => allocation.salesInvoiceId.length > 0 && allocation.amount > 0);

  const duplicateIds = new Set<string>();
  for (const allocation of allocations) {
    if (duplicateIds.has(allocation.salesInvoiceId)) {
      throw new Error("The same sales invoice cannot be allocated more than once in one receipt");
    }
    duplicateIds.add(allocation.salesInvoiceId);
  }

  const allocatedAmount = Number(
    allocations.reduce((sum, allocation) => sum + allocation.amount, 0).toFixed(2),
  );
  if (allocatedAmount > Number(input.amountReceived ?? 0)) {
    throw new Error("Allocated amount cannot exceed the receipt amount");
  }

  return sql.begin(async (tx) => {
    const accessibleLocationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
    const [customer, location] = await Promise.all([
      ensureCustomer(tx, input.customerId),
      ensureLocation(tx, input.locationId),
    ]);
    await ensureReceiptBankAccount(tx, input.paymentMethod, input.bankAccountId);

    const invoiceRows = await tx<Array<{
      id: string;
      invoiceNo: string;
      customerId: string | null;
      locationId: string;
      balanceDue: number;
      totalAmount: number;
      saleId: string;
      status: string;
    }>>`
      SELECT
        id,
        "invoiceNo",
        "customerId",
        "locationId",
        "balanceDue",
        "totalAmount",
        "saleId",
        status::text AS status
      FROM "SalesInvoice"
      WHERE id = ANY(${allocations.map((allocation) => allocation.salesInvoiceId)})
        AND "isArchived" = false
      FOR UPDATE
    `;

    if (invoiceRows.length !== allocations.length) {
      throw new Error("One or more selected sales invoices were not found");
    }

    const invoiceMap = new Map(invoiceRows.map((row) => [row.id, row]));
    for (const allocation of allocations) {
      const invoice = invoiceMap.get(allocation.salesInvoiceId);
      if (!invoice) {
        throw new Error("Selected sales invoice was not found");
      }
      if (invoice.status !== "POSTED") {
        throw new Error(`Sales invoice ${invoice.invoiceNo} is not open for receipt allocation`);
      }
      if (scope.accessibleLocationIds && accessibleLocationIds.length > 0 && !accessibleLocationIds.includes(invoice.locationId)) {
        throw new Error(`Sales invoice ${invoice.invoiceNo} is outside your accessible locations`);
      }
      if (invoice.customerId !== customer.id) {
        throw new Error(`Sales invoice ${invoice.invoiceNo} belongs to a different customer`);
      }
      if (Number(allocation.amount ?? 0) > Number(invoice.balanceDue ?? 0)) {
        throw new Error(`Receipt allocation cannot exceed the current balance of ${invoice.invoiceNo}`);
      }
    }

    const receiptId = randomUUID();
    const receiptNo = await nextSalesDocumentNumber(tx, "RCPT", "Customer receipt");
    const currency = await getSalesDefaultCurrency(tx);
    const unappliedAmount = Number((Number(input.amountReceived ?? 0) - allocatedAmount).toFixed(2));
    const status = receiptAllocationStatus(Number(input.amountReceived ?? 0), allocatedAmount);

    await tx`
      INSERT INTO "CustomerReceipt" (
        id, "receiptNo", "receiptDate", "customerId", "locationId", "paymentMethod", "bankAccountId",
        "amountReceived", "unappliedAmount", currency, status, "referenceNo", remarks,
        "createdById", "postedById", "postedAt", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${receiptId},
        ${receiptNo},
        ${input.receiptDate}::timestamptz,
        ${customer.id},
        ${location.id},
        ${input.paymentMethod}::"PaymentMethod",
        ${normalizeText(input.bankAccountId)},
        ${Number(input.amountReceived ?? 0)},
        ${unappliedAmount},
        ${currency},
        ${status},
        ${normalizeText(input.referenceNo)},
        ${normalizeText(input.remarks)},
        ${actor.userId},
        ${actor.userId},
        NOW(),
        false,
        NOW(),
        NOW()
      )
    `;

    for (const allocation of allocations) {
      await tx`
        INSERT INTO "CustomerReceiptAllocation" (
          id, "receiptId", "salesInvoiceId", amount, "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${receiptId},
          ${allocation.salesInvoiceId},
          ${allocation.amount},
          NOW(),
          NOW()
        )
      `;
      await syncSalesInvoiceBalance(tx, allocation.salesInvoiceId);
    }

    await syncCustomerReceiptFinance(tx, {
      receiptId,
      userId: actor.userId,
    });

    await writeSalesAudit(tx, actor.userId, "sales.receipt", "CREATE_POST", receiptId, {
      receiptNo,
      customerId: customer.id,
      customerCode: customer.customerCode,
      locationId: location.id,
      amountReceived: Number(input.amountReceived ?? 0),
      allocatedAmount,
      unappliedAmount,
      allocationCount: allocations.length,
    });
    await writeSalesHistory(
      tx,
      "sales.receipt",
      receiptId,
      "POSTED",
      actor.userId,
      `Customer receipt ${receiptNo} posted for ${customer.customerCode} - ${customer.name}`,
    );

    const pub = await tx<Array<{ publicId: number }>>`SELECT "publicId" FROM "CustomerReceipt" WHERE id = ${receiptId} LIMIT 1`;
    return {
      id: receiptId,
      publicId: Number(pub[0]?.publicId ?? 0),
      receiptNo,
      customerId: customer.id,
      amountReceived: Number(input.amountReceived ?? 0),
      unappliedAmount,
    };
  });
}

export async function updateCustomerReceipt(
  id: string,
  input: UpdateCustomerReceiptInput,
  actor: { userId: string; userName: string },
  scope: Scope = {},
) {
  if (!input.receiptDate) {
    throw new Error("Receipt date is required");
  }
  if (!input.customerId) {
    throw new Error("Customer is required");
  }
  if (!input.locationId) {
    throw new Error("Receipt location is required");
  }
  if (!(Number(input.amountReceived ?? 0) > 0)) {
    throw new Error("Receipt amount must be greater than zero");
  }
  const allocations = (input.allocations ?? [])
    .map((allocation) => ({
      salesInvoiceId: String(allocation.salesInvoiceId ?? "").trim(),
      amount: Number(allocation.amount ?? 0),
    }))
    .filter((allocation) => allocation.salesInvoiceId.length > 0 && allocation.amount > 0);

  const duplicateIds = new Set<string>();
  for (const allocation of allocations) {
    if (duplicateIds.has(allocation.salesInvoiceId)) {
      throw new Error("The same sales invoice cannot be allocated more than once in one receipt");
    }
    duplicateIds.add(allocation.salesInvoiceId);
  }

  const allocatedAmount = Number(
    allocations.reduce((sum, allocation) => sum + allocation.amount, 0).toFixed(2),
  );
  if (allocatedAmount > Number(input.amountReceived ?? 0)) {
    throw new Error("Allocated amount cannot exceed the receipt amount");
  }

  return sql.begin(async (tx) => {
    const accessibleLocationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
    const existingRows = await tx<Array<{
      id: string;
      receiptNo: string;
      status: string;
      locationId: string;
      customerId: string;
      amountReceived: number;
      unappliedAmount: number;
    }>>`
      SELECT id, "receiptNo", status, "locationId", "customerId", "amountReceived", "unappliedAmount"
      FROM "CustomerReceipt"
      WHERE id = ${id}
        AND "isArchived" = false
      LIMIT 1
      FOR UPDATE
    `;

    const existing = existingRows[0];
    if (!existing) {
      throw new Error("Customer receipt was not found");
    }
    if (scope.accessibleLocationIds && accessibleLocationIds.length > 0 && !accessibleLocationIds.includes(existing.locationId)) {
      throw new Error("Customer receipt is outside your accessible locations");
    }
    if (!isPostedReceiptStatus(existing.status)) {
      throw new Error("Only active posted customer receipts can be edited");
    }

    const oldAllocationRows = await tx<Array<{ salesInvoiceId: string; amount: number }>>`
      SELECT "salesInvoiceId", amount
      FROM "CustomerReceiptAllocation"
      WHERE "receiptId" = ${id}
    `;

    const [customer, location] = await Promise.all([
      ensureCustomer(tx, input.customerId),
      ensureLocation(tx, input.locationId),
    ]);
    await ensureReceiptBankAccount(tx, input.paymentMethod, input.bankAccountId);

    const invoiceRows = await tx<Array<{
      id: string;
      invoiceNo: string;
      customerId: string | null;
      locationId: string;
      balanceDue: number;
      status: string;
    }>>`
      SELECT
        id,
        "invoiceNo",
        "customerId",
        "locationId",
        "balanceDue",
        status::text AS status
      FROM "SalesInvoice"
      WHERE id = ANY(${allocations.map((allocation) => allocation.salesInvoiceId)})
        AND "isArchived" = false
      FOR UPDATE
    `;

    if (invoiceRows.length !== allocations.length) {
      throw new Error("One or more selected sales invoices were not found");
    }

    const oldAllocationMap = new Map(oldAllocationRows.map((row) => [row.salesInvoiceId, Number(row.amount ?? 0)]));
    const invoiceMap = new Map(invoiceRows.map((row) => [row.id, row]));
    for (const allocation of allocations) {
      const invoice = invoiceMap.get(allocation.salesInvoiceId);
      if (!invoice) {
        throw new Error("Selected sales invoice was not found");
      }
      if (invoice.status !== "POSTED") {
        throw new Error(`Sales invoice ${invoice.invoiceNo} is not open for receipt allocation`);
      }
      if (scope.accessibleLocationIds && accessibleLocationIds.length > 0 && !accessibleLocationIds.includes(invoice.locationId)) {
        throw new Error(`Sales invoice ${invoice.invoiceNo} is outside your accessible locations`);
      }
      if (invoice.customerId !== customer.id) {
        throw new Error(`Sales invoice ${invoice.invoiceNo} belongs to a different customer`);
      }

      const priorAmount = oldAllocationMap.get(allocation.salesInvoiceId) ?? 0;
      const effectiveBalance = Number(invoice.balanceDue ?? 0) + priorAmount;
      if (Number(allocation.amount ?? 0) > effectiveBalance) {
        throw new Error(`Receipt allocation cannot exceed the current balance of ${invoice.invoiceNo}`);
      }
    }

    await voidCustomerReceiptFinance(tx, {
      receiptId: id,
      userId: actor.userId,
      reason: "Receipt edited and reallocated",
    });

    const unappliedAmount = Number((Number(input.amountReceived ?? 0) - allocatedAmount).toFixed(2));
    const status = receiptAllocationStatus(Number(input.amountReceived ?? 0), allocatedAmount);

    await tx`
      UPDATE "CustomerReceipt"
      SET
        "receiptDate" = ${input.receiptDate}::timestamptz,
        "customerId" = ${customer.id},
        "locationId" = ${location.id},
        "paymentMethod" = ${input.paymentMethod}::"PaymentMethod",
        "bankAccountId" = ${normalizeText(input.bankAccountId)},
        "amountReceived" = ${Number(input.amountReceived ?? 0)},
        "unappliedAmount" = ${unappliedAmount},
        status = ${status},
        "referenceNo" = ${normalizeText(input.referenceNo)},
        remarks = ${normalizeText(input.remarks)},
        "postedById" = ${actor.userId},
        "postedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await tx`DELETE FROM "CustomerReceiptAllocation" WHERE "receiptId" = ${id}`;

    for (const allocation of allocations) {
      await tx`
        INSERT INTO "CustomerReceiptAllocation" (
          id, "receiptId", "salesInvoiceId", amount, "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${id},
          ${allocation.salesInvoiceId},
          ${allocation.amount},
          NOW(),
          NOW()
        )
      `;
    }

    const affectedInvoiceIds = Array.from(
      new Set([
        ...oldAllocationRows.map((row) => row.salesInvoiceId),
        ...allocations.map((allocation) => allocation.salesInvoiceId),
      ]),
    );
    for (const invoiceId of affectedInvoiceIds) {
      await syncSalesInvoiceBalance(tx, invoiceId);
    }

    await syncCustomerReceiptFinance(tx, {
      receiptId: id,
      userId: actor.userId,
    });

    await writeSalesAudit(tx, actor.userId, "sales.receipt", "UPDATE_REALLOCATE", id, {
      receiptNo: existing.receiptNo,
      customerId: customer.id,
      locationId: location.id,
      amountReceived: Number(input.amountReceived ?? 0),
      allocatedAmount,
      unappliedAmount,
      allocationCount: allocations.length,
    }, {
      customerId: existing.customerId,
      locationId: existing.locationId,
      amountReceived: Number(existing.amountReceived ?? 0),
      unappliedAmount: Number(existing.unappliedAmount ?? 0),
      allocationCount: oldAllocationRows.length,
      allocations: oldAllocationRows,
    });
    await writeSalesHistory(
      tx,
      "sales.receipt",
      id,
      "UPDATED",
      actor.userId,
      `Customer receipt ${existing.receiptNo} reallocated and updated`,
    );

    return {
      id,
      receiptNo: existing.receiptNo,
      amountReceived: Number(input.amountReceived ?? 0),
      unappliedAmount,
    };
  });
}

export async function voidCustomerReceipt(
  id: string,
  actor: { userId: string; userName: string },
  input: { reason?: string | null } = {},
  scope: Scope = {},
) {
  return sql.begin(async (tx) => {
    const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
    const voidReason = normalizeText(input.reason);

    const rows = await tx<Array<{
      id: string;
      receiptNo: string;
      locationId: string;
      status: string;
      customerId: string;
      amountReceived: number;
    }>>`
      SELECT id, "receiptNo", "locationId", status, "customerId", "amountReceived"
      FROM "CustomerReceipt"
      WHERE id = ${id}
        AND "isArchived" = false
      LIMIT 1
      FOR UPDATE
    `;

    const receipt = rows[0];
    if (!receipt) {
      throw new Error("Customer receipt was not found");
    }
    if (scope.accessibleLocationIds && locationIds.length > 0 && !locationIds.includes(receipt.locationId)) {
      throw new Error("Customer receipt is outside your accessible locations");
    }
    if (!isPostedReceiptStatus(receipt.status)) {
      throw new Error("Only active posted customer receipts can be voided");
    }

    const allocationRows = await tx<Array<{ salesInvoiceId: string }>>`
      SELECT "salesInvoiceId"
      FROM "CustomerReceiptAllocation"
      WHERE "receiptId" = ${id}
    `;

    await tx`
      UPDATE "CustomerReceipt"
      SET
        status = 'VOIDED',
        remarks = CASE
          WHEN ${voidReason} IS NULL
            THEN remarks
          WHEN remarks IS NULL OR remarks = ''
            THEN CONCAT('Voided: ', ${voidReason})
          ELSE CONCAT(remarks, E'\nVoided: ', ${voidReason})
        END,
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    for (const allocation of allocationRows) {
      await syncSalesInvoiceBalance(tx, allocation.salesInvoiceId);
    }

    await voidCustomerReceiptFinance(tx, {
      receiptId: id,
      userId: actor.userId,
      reason: voidReason,
    });

    await writeSalesAudit(tx, actor.userId, "sales.receipt", "VOID", id, {
      receiptNo: receipt.receiptNo,
      reason: voidReason,
      amountReceived: Number(receipt.amountReceived ?? 0),
      allocationCount: allocationRows.length,
    });
    await writeSalesHistory(
      tx,
      "sales.receipt",
      id,
      "VOIDED",
      actor.userId,
      voidReason
        ? `Customer receipt ${receipt.receiptNo} voided: ${voidReason}`
        : `Customer receipt ${receipt.receiptNo} voided`,
    );

    return {
      id,
      receiptNo: receipt.receiptNo,
      status: "VOIDED",
    };
  });
}

export async function getCustomerStatement(
  customerId: string,
  scope: Scope = {},
): Promise<CustomerStatement | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const customerRows = await sql<Array<{ id: string; customerCode: string; name: string }>>`
    SELECT id, "customerCode", name
    FROM "Customer"
    WHERE id = ${customerId}
      AND "isArchived" = false
      AND "isActive" = true
    LIMIT 1
  `;
  const customer = customerRows[0];
  if (!customer) {
    return null;
  }

  const [invoiceRows, receiptRows, creditNoteRows] = await Promise.all([
    sql<Array<{
      documentId: string;
      documentNo: string;
      entryDate: string;
      dueDate: string | null;
      channel: string;
      locationCode: string;
      locationName: string;
      amount: number;
      status: string;
    }>>`
      SELECT
        si.id AS "documentId",
        si."invoiceNo" AS "documentNo",
        si."invoiceDate"::text AS "entryDate",
        si."dueDate"::text AS "dueDate",
        si.channel,
        l."locationCode",
        l."locationName",
        si."totalAmount" AS amount,
        si.status::text AS status
      FROM "SalesInvoice" si
      INNER JOIN "Location" l ON l.id = si."locationId"
      WHERE si."customerId" = ${customerId}
        AND si."isArchived" = false
        AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR si."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      ORDER BY si."invoiceDate" ASC, si."createdAt" ASC
    `,
    sql<Array<{
      documentId: string;
      documentNo: string;
      entryDate: string;
      locationCode: string;
      locationName: string;
      amount: number;
      status: string;
      reference: string | null;
    }>>`
      SELECT
        cr.id AS "documentId",
        cr."receiptNo" AS "documentNo",
        cr."receiptDate"::text AS "entryDate",
        l."locationCode",
        l."locationName",
        cr."amountReceived" AS amount,
        cr.status,
        cr."referenceNo" AS reference
      FROM "CustomerReceipt" cr
      INNER JOIN "Location" l ON l.id = cr."locationId"
      WHERE cr."customerId" = ${customerId}
        AND cr."isArchived" = false
        AND cr.status IN ('POSTED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED')
        AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR cr."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      ORDER BY cr."receiptDate" ASC, cr."createdAt" ASC
    `,
    sql<Array<{
      documentId: string;
      documentNo: string;
      entryDate: string;
      channel: string;
      locationCode: string;
      locationName: string;
      amount: number;
      status: string;
      reference: string | null;
    }>>`
      SELECT
        scn.id AS "documentId",
        scn."creditNoteNo" AS "documentNo",
        scn."creditDate"::text AS "entryDate",
        scn.channel,
        l."locationCode",
        l."locationName",
        scn."totalAmount" AS amount,
        scn.status,
        sr."returnNo" AS reference
      FROM "SalesCreditNote" scn
      INNER JOIN "Location" l ON l.id = scn."locationId"
      INNER JOIN "SalesReturn" sr ON sr.id = scn."salesReturnId"
      WHERE scn."customerId" = ${customerId}
        AND scn."isArchived" = false
        AND scn.status IN ('POSTED', 'APPLIED', 'PARTIALLY_APPLIED')
        AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR scn."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      ORDER BY scn."creditDate" ASC, scn."createdAt" ASC
    `,
  ]);

  const entries = [
    ...invoiceRows.map((row) => ({
      entryType: "INVOICE" as const,
      documentId: row.documentId,
      documentNo: row.documentNo,
      entryDate: row.entryDate,
      dueDate: row.dueDate ?? undefined,
      channel: row.channel,
      locationCode: row.locationCode,
      locationName: row.locationName,
      debit: Number(row.amount ?? 0),
      credit: 0,
      status: row.status,
      reference: undefined,
    })),
    ...receiptRows.map((row) => ({
      entryType: "RECEIPT" as const,
      documentId: row.documentId,
      documentNo: row.documentNo,
      entryDate: row.entryDate,
      dueDate: undefined,
      channel: undefined,
      locationCode: row.locationCode,
      locationName: row.locationName,
      debit: 0,
      credit: Number(row.amount ?? 0),
      status: row.status,
      reference: row.reference ?? undefined,
    })),
    ...creditNoteRows.map((row) => ({
      entryType: "CREDIT_NOTE" as const,
      documentId: row.documentId,
      documentNo: row.documentNo,
      entryDate: row.entryDate,
      dueDate: undefined,
      channel: row.channel,
      locationCode: row.locationCode,
      locationName: row.locationName,
      debit: 0,
      credit: Number(row.amount ?? 0),
      status: row.status,
      reference: row.reference ?? undefined,
    })),
  ]
    .sort((a, b) => {
      const dateDiff = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return a.documentNo.localeCompare(b.documentNo);
    })
    .reduce<CustomerStatementEntry[]>((acc, entry) => {
      const runningBalance = (acc[acc.length - 1]?.runningBalance ?? 0) + entry.debit - entry.credit;
      acc.push({ ...entry, runningBalance: Number(runningBalance.toFixed(2)) });
      return acc;
    }, []);

  const totalInvoiced = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalReceived = entries.reduce((sum, entry) => sum + entry.credit, 0);

  return {
    customerId: customer.id,
    customerCode: customer.customerCode,
    customerName: customer.name,
    totalInvoiced: Number(totalInvoiced.toFixed(2)),
    totalReceived: Number(totalReceived.toFixed(2)),
    outstandingBalance: Number((totalInvoiced - totalReceived).toFixed(2)),
    entries,
  };
}
