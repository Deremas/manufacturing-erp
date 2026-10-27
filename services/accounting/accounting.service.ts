import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import type { Tx } from "@/services/procurement/procurement-shared.service";

type NumberingRow = {
  id: string;
  prefix: string;
  separator: string;
  yearFormat: string;
  sequenceLength: number;
  currentSequence: number;
};

async function nextJournalNumber(tx: Tx) {
  await tx`
    INSERT INTO "DocumentNumbering" (
      id, prefix, description, "prefixFormat", separator, "yearFormat", "monthFormat", "dayFormat",
      "sequenceLength", "currentSequence", "isActive", "isArchived"
    )
    VALUES (
      'docnum-jrn',
      'JRN',
      'Journal Entry',
      'PREFIX_YEAR',
      '-',
      'YYYY',
      'MM',
      'DD',
      4,
      0,
      true,
      false
    )
    ON CONFLICT ("prefix") DO NOTHING
  `;

  const rows = await tx<Array<NumberingRow>>`
    SELECT id, prefix, separator, "yearFormat", "sequenceLength", "currentSequence"
    FROM "DocumentNumbering"
    WHERE prefix = 'JRN'
    LIMIT 1
    FOR UPDATE
  `;
  const config = rows[0];
  if (!config) throw new Error("Journal numbering config missing");
  const nextSequence = Number(config.currentSequence ?? 0) + 1;
  await tx`
    UPDATE "DocumentNumbering"
    SET "currentSequence" = ${nextSequence}
    WHERE id = ${config.id}
  `;
  const year = config.yearFormat === "YY"
    ? new Date().getFullYear().toString().slice(-2)
    : new Date().getFullYear().toString();
  return `${config.prefix}${config.separator}${year}${config.separator}${String(nextSequence).padStart(config.sequenceLength, "0")}`;
}

async function ensureAccount(
  tx: Tx,
  accountCode: string,
  accountName: string,
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
) {
  await tx`
    INSERT INTO "Account" (
      id, "accountCode", "accountName", "accountType", "isControlAccount", "isActive", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${`acct-${accountCode}`},
      ${accountCode},
      ${accountName},
      ${accountType}::"AccountType",
      true,
      true,
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT ("accountCode") DO NOTHING
  `;
  const rows = await tx<Array<{ id: string }>>`
    SELECT id
    FROM "Account"
    WHERE "accountCode" = ${accountCode}
    LIMIT 1
  `;
  if (!rows[0]) throw new Error(`Missing account ${accountCode}`);
  return rows[0];
}

async function resolveAccount(
  tx: Tx,
  accountId: string | null | undefined,
  fallbackCode: string,
  fallbackName: string,
  fallbackType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
) {
  if (accountId) {
    const rows = await tx<Array<{ id: string }>>`
      SELECT id
      FROM "Account"
      WHERE id = ${accountId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `;
    if (rows[0]) {
      return rows[0];
    }
  }

  return ensureAccount(tx, fallbackCode, fallbackName, fallbackType);
}

export async function syncProcurementJournalEntry(
  tx: Tx,
  input: {
    sourceType: "procurement.invoice" | "procurement.payment";
    sourceId: string;
    description: string;
    entryDate?: Date;
    postedById?: string | null;
    amount: number;
  },
) {
  const ap = await ensureAccount(tx, "2000", "Accounts Payable Control", "LIABILITY");
  const bank = await ensureAccount(tx, "1100", "Bank Control", "ASSET");
  const expense = await ensureAccount(tx, "5000", "Procurement Expense", "EXPENSE");

  const existingRows = await tx<Array<{ id: string; journalNo: string }>>`
    SELECT id, "journalNo"
    FROM "JournalEntry"
    WHERE "sourceType" = ${input.sourceType}
      AND "sourceId" = ${input.sourceId}
    LIMIT 1
  `;

  const journalId = existingRows[0]?.id ?? randomUUID();
  const journalNo = existingRows[0]?.journalNo ?? await nextJournalNumber(tx);
  const entryDate = input.entryDate ?? new Date();

  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${journalId},
      ${journalNo},
      ${entryDate},
      ${input.sourceType},
      ${input.sourceId},
      ${input.description},
      'POSTED',
      ${input.amount},
      ${input.amount},
      ${input.postedById ?? null},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("sourceType", "sourceId")
    DO UPDATE SET
      description = EXCLUDED.description,
      "entryDate" = EXCLUDED."entryDate",
      status = EXCLUDED.status,
      "totalDebit" = EXCLUDED."totalDebit",
      "totalCredit" = EXCLUDED."totalCredit",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  await tx`DELETE FROM "JournalLine" WHERE "journalEntryId" = ${journalId}`;

  const lines = input.sourceType === "procurement.invoice"
    ? [
        { accountId: expense.id, description: "Procurement invoice expense/accrual", debit: input.amount, credit: 0 },
        { accountId: ap.id, description: "Accounts payable accrual", debit: 0, credit: input.amount },
      ]
    : [
        { accountId: ap.id, description: "Accounts payable settlement", debit: input.amount, credit: 0 },
        { accountId: bank.id, description: "Bank disbursement", debit: 0, credit: input.amount },
      ];

  for (const line of lines) {
    await tx`
      INSERT INTO "JournalLine" (
        id, "journalEntryId", "accountId", description, debit, credit, "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${journalId},
        ${line.accountId},
        ${line.description},
        ${line.debit},
        ${line.credit},
        NOW()
      )
    `;
  }

  return { id: journalId, journalNo };
}

export async function syncInventoryLossJournal(
  tx: Tx,
  input: {
    sourceType: "qc.scrap";
    sourceId: string;
    description: string;
    amount: number;
    postedById?: string | null;
    entryDate?: Date;
  },
) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Inventory loss journal amount cannot be negative");
  }
  if (amount === 0) return null;

  const inventory = await ensureAccount(tx, "1300", "Inventory Control", "ASSET");
  const wastage = await ensureAccount(tx, "5100", "Production Wastage and Scrap", "EXPENSE");
  const existing = await tx<Array<{ id: string; journalNo: string }>>`
    SELECT id, "journalNo" FROM "JournalEntry"
    WHERE "sourceType" = ${input.sourceType} AND "sourceId" = ${input.sourceId}
    LIMIT 1
  `;
  const journalId = existing[0]?.id ?? randomUUID();
  const journalNo = existing[0]?.journalNo ?? await nextJournalNumber(tx);

  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    ) VALUES (
      ${journalId}, ${journalNo}, ${input.entryDate ?? new Date()}, ${input.sourceType}, ${input.sourceId},
      ${input.description}, 'POSTED', ${amount}, ${amount}, ${input.postedById ?? null}, NOW(), NOW(), NOW()
    )
    ON CONFLICT ("sourceType", "sourceId") DO UPDATE SET
      description = EXCLUDED.description,
      "entryDate" = EXCLUDED."entryDate",
      status = 'POSTED',
      "totalDebit" = EXCLUDED."totalDebit",
      "totalCredit" = EXCLUDED."totalCredit",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = NOW(),
      "updatedAt" = NOW()
  `;
  await tx`DELETE FROM "JournalLine" WHERE "journalEntryId" = ${journalId}`;
  await tx`INSERT INTO "JournalLine" (id, "journalEntryId", "accountId", description, debit, credit, "createdAt")
    VALUES (${randomUUID()}, ${journalId}, ${wastage.id}, ${input.description}, ${amount}, 0, NOW())`;
  await tx`INSERT INTO "JournalLine" (id, "journalEntryId", "accountId", description, debit, credit, "createdAt")
    VALUES (${randomUUID()}, ${journalId}, ${inventory.id}, ${input.description}, 0, ${amount}, NOW())`;
  return { id: journalId, journalNo };
}

export async function syncSalesJournalEntry(
  tx: Tx,
  input: {
    sourceType: "sales.sale" | "sales.payment" | "sales.return" | "sales.receipt" | "sales.credit-note";
    sourceId: string;
    description: string;
    entryDate?: Date;
    postedById?: string | null;
    amount: number;
    paymentMethod?: "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY" | null;
    paymentStatus?: string | null;
  },
) {
  const cash = await ensureAccount(tx, "1000", "Cash Control", "ASSET");
  const bank = await ensureAccount(tx, "1100", "Bank Control", "ASSET");
  const receivable = await ensureAccount(tx, "1200", "Accounts Receivable Control", "ASSET");
  const revenue = await ensureAccount(tx, "4000", "Sales Revenue", "INCOME");

  const existingRows = await tx<Array<{ id: string; journalNo: string }>>`
    SELECT id, "journalNo"
    FROM "JournalEntry"
    WHERE "sourceType" = ${input.sourceType}
      AND "sourceId" = ${input.sourceId}
    LIMIT 1
  `;

  const journalId = existingRows[0]?.id ?? randomUUID();
  const journalNo = existingRows[0]?.journalNo ?? await nextJournalNumber(tx);
  const entryDate = input.entryDate ?? new Date();

  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${journalId},
      ${journalNo},
      ${entryDate},
      ${input.sourceType},
      ${input.sourceId},
      ${input.description},
      'POSTED',
      ${input.amount},
      ${input.amount},
      ${input.postedById ?? null},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("sourceType", "sourceId")
    DO UPDATE SET
      description = EXCLUDED.description,
      "entryDate" = EXCLUDED."entryDate",
      status = EXCLUDED.status,
      "totalDebit" = EXCLUDED."totalDebit",
      "totalCredit" = EXCLUDED."totalCredit",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  await tx`DELETE FROM "JournalLine" WHERE "journalEntryId" = ${journalId}`;

  const settlementAccount =
    input.paymentMethod === "BANK" || input.paymentMethod === "CHEQUE" || input.paymentMethod === "MOBILE_MONEY"
      ? bank
      : cash;
  const paymentStatus = String(input.paymentStatus ?? "UNPAID").toUpperCase();
  const saleSettled = paymentStatus === "PAID";

  const lines =
    input.sourceType === "sales.sale"
      ? saleSettled
        ? [
            { accountId: settlementAccount.id, description: "Sales receipt", debit: input.amount, credit: 0 },
            { accountId: revenue.id, description: "Sales revenue", debit: 0, credit: input.amount },
          ]
        : [
            { accountId: receivable.id, description: "Accounts receivable accrual", debit: input.amount, credit: 0 },
            { accountId: revenue.id, description: "Sales revenue", debit: 0, credit: input.amount },
          ]
      : input.sourceType === "sales.return" || input.sourceType === "sales.credit-note"
        ? saleSettled
          ? [
              { accountId: revenue.id, description: "Sales return reversal", debit: input.amount, credit: 0 },
              { accountId: settlementAccount.id, description: "Refund / settlement reversal", debit: 0, credit: input.amount },
            ]
          : [
              { accountId: revenue.id, description: "Sales return reversal", debit: input.amount, credit: 0 },
              { accountId: receivable.id, description: "Accounts receivable reversal", debit: 0, credit: input.amount },
            ]
        : input.sourceType === "sales.receipt"
          ? [
              { accountId: settlementAccount.id, description: "Customer receipt", debit: input.amount, credit: 0 },
              { accountId: receivable.id, description: "Accounts receivable settlement", debit: 0, credit: input.amount },
            ]
        : [
            { accountId: settlementAccount.id, description: "Sales payment receipt", debit: input.amount, credit: 0 },
            { accountId: receivable.id, description: "Accounts receivable settlement", debit: 0, credit: input.amount },
          ];

  for (const line of lines) {
    await tx`
      INSERT INTO "JournalLine" (
        id, "journalEntryId", "accountId", description, debit, credit, "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${journalId},
        ${line.accountId},
        ${line.description},
        ${line.debit},
        ${line.credit},
        NOW()
      )
    `;
  }

  return { id: journalId, journalNo };
}

export async function reverseSalesJournalEntry(
  tx: Tx,
  input: {
    sourceType: "sales.sale" | "sales.payment" | "sales.return" | "sales.receipt" | "sales.credit-note";
    sourceId: string;
    reason?: string | null;
  },
) {
  await tx`
    UPDATE "JournalEntry"
    SET
      status = 'REVERSED',
      description = CASE
        WHEN ${input.reason ?? null}::text IS NULL OR ${input.reason ?? null}::text = ''
          THEN CONCAT(COALESCE(description, ''), ' [Reversed]')
        ELSE CONCAT(COALESCE(description, ''), ' [Reversed: ', ${input.reason ?? null}, ']')
      END,
      "updatedAt" = NOW()
    WHERE "sourceType" = ${input.sourceType}
      AND "sourceId" = ${input.sourceId}
  `;
}

export async function syncPayrollJournalEntry(
  tx: Tx,
  input: {
    sourceId: string;
    description: string;
    entryDate?: Date;
    postedById?: string | null;
    grossPay: number;
    netPay: number;
    incomeTax: number;
    employeePension: number;
    employerPension: number;
    totalDeductions: number;
    salaryExpenseAccountId?: string | null;
    employerPensionExpenseAccountId?: string | null;
    salaryPayableAccountId?: string | null;
    taxPayableAccountId?: string | null;
    pensionPayableAccountId?: string | null;
  },
) {
  const salaryExpense = await resolveAccount(tx, input.salaryExpenseAccountId, "6100", "Salaries And Wages Expense", "EXPENSE");
  const employerPensionExpense = await resolveAccount(tx, input.employerPensionExpenseAccountId, "6110", "Employer Pension Expense", "EXPENSE");
  const salaryPayable = await resolveAccount(tx, input.salaryPayableAccountId, "2100", "Salary Payable", "LIABILITY");
  const taxPayable = await resolveAccount(tx, input.taxPayableAccountId, "2110", "Payroll Tax Payable", "LIABILITY");
  const pensionPayable = await resolveAccount(tx, input.pensionPayableAccountId, "2120", "Pension Payable", "LIABILITY");
  const deductionsClearing = await ensureAccount(tx, "2199", "Payroll Deductions Clearing", "LIABILITY");

  const existingRows = await tx<Array<{ id: string; journalNo: string }>>`
    SELECT id, "journalNo"
    FROM "JournalEntry"
    WHERE "sourceType" = 'hr.payroll'
      AND "sourceId" = ${input.sourceId}
    LIMIT 1
  `;

  const journalId = existingRows[0]?.id ?? randomUUID();
  const journalNo = existingRows[0]?.journalNo ?? await nextJournalNumber(tx);
  const entryDate = input.entryDate ?? new Date();
  const totalDebit = Number((input.grossPay + input.employerPension).toFixed(2));
  const additionalDeductions = Number(
    Math.max(
      0,
      Number((input.totalDeductions - input.incomeTax - input.employeePension).toFixed(2)),
    ).toFixed(2),
  );

  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${journalId},
      ${journalNo},
      ${entryDate},
      'hr.payroll',
      ${input.sourceId},
      ${input.description},
      'POSTED',
      ${totalDebit},
      ${totalDebit},
      ${input.postedById ?? null},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("sourceType", "sourceId")
    DO UPDATE SET
      description = EXCLUDED.description,
      "entryDate" = EXCLUDED."entryDate",
      status = EXCLUDED.status,
      "totalDebit" = EXCLUDED."totalDebit",
      "totalCredit" = EXCLUDED."totalCredit",
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  await tx`DELETE FROM "JournalLine" WHERE "journalEntryId" = ${journalId}`;

  const lines = [
    { accountId: salaryExpense.id, description: "Payroll gross salary expense", debit: Number(input.grossPay.toFixed(2)), credit: 0 },
    { accountId: employerPensionExpense.id, description: "Employer pension expense", debit: Number(input.employerPension.toFixed(2)), credit: 0 },
    { accountId: salaryPayable.id, description: "Net salary payable", debit: 0, credit: Number(input.netPay.toFixed(2)) },
    { accountId: taxPayable.id, description: "Payroll tax payable", debit: 0, credit: Number(input.incomeTax.toFixed(2)) },
    { accountId: pensionPayable.id, description: "Employee and employer pension payable", debit: 0, credit: Number((input.employeePension + input.employerPension).toFixed(2)) },
    { accountId: deductionsClearing.id, description: "Other payroll deductions clearing", debit: 0, credit: additionalDeductions },
  ].filter((line) => line.debit > 0 || line.credit > 0);

  for (const line of lines) {
    await tx`
      INSERT INTO "JournalLine" (
        id, "journalEntryId", "accountId", description, debit, credit, "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${journalId},
        ${line.accountId},
        ${line.description},
        ${line.debit},
        ${line.credit},
        NOW()
      )
    `;
  }

  return { id: journalId, journalNo };
}

export async function syncPayrollPaymentJournal(
  tx: Tx,
  input: {
    sourceId: string;
    description: string;
    entryDate: Date;
    postedById: string;
    amount: number;
    salaryPayableAccountId?: string | null;
  },
) {
  const amount = Number(input.amount.toFixed(2));
  if (!(amount > 0)) throw new Error("Payroll payment amount must be greater than zero");

  const existing = await tx<Array<{ id: string }>>`
    SELECT id FROM "JournalEntry"
    WHERE "sourceType" = 'hr.payroll.payment' AND "sourceId" = ${input.sourceId}
    LIMIT 1
  `;
  if (existing[0]) throw new Error("This payroll run has already been paid");

  const salaryPayable = await resolveAccount(tx, input.salaryPayableAccountId, "2100", "Salary Payable", "LIABILITY");
  const bankLedger = await ensureAccount(tx, "1010", "Payroll Bank And Cash", "ASSET");
  const journalId = randomUUID();
  const journalNo = await nextJournalNumber(tx);

  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    ) VALUES (
      ${journalId}, ${journalNo}, ${input.entryDate}, 'hr.payroll.payment', ${input.sourceId},
      ${input.description}, 'POSTED', ${amount}, ${amount}, ${input.postedById}, NOW(), NOW(), NOW()
    )
  `;
  await tx`
    INSERT INTO "JournalLine" (id, "journalEntryId", "accountId", description, debit, credit, "createdAt")
    VALUES
      (${randomUUID()}, ${journalId}, ${salaryPayable.id}, 'Salary payable settled', ${amount}, 0, NOW()),
      (${randomUUID()}, ${journalId}, ${bankLedger.id}, 'Payroll bank payment', 0, ${amount}, NOW())
  `;
  return { journalId, journalNo };
}

export async function listAccounts() {
  try {
    return await sql<Array<{ id: string; accountCode: string; accountName: string; accountType: string; parentAccountName: string | null; isControlAccount: boolean; isActive: boolean }>>`
      SELECT
        a.id,
        a."accountCode",
        a."accountName",
        a."accountType"::text AS "accountType",
        p."accountName" AS "parentAccountName",
        a."isControlAccount",
        a."isActive"
      FROM "Account" a
      LEFT JOIN "Account" p ON p.id = a."parentAccountId"
      WHERE a."isArchived" = false
      ORDER BY a."accountCode" ASC
    `;
  } catch {
    return [];
  }
}

export async function listJournalEntries() {
  try {
    return await sql<Array<{ id: string; publicId: number; journalNo: string; entryDate: string; sourceType: string; description: string; status: string; totalDebit: number; totalCredit: number; lineCount: number }>>`
      SELECT
        je.id,
        je."publicId",
        je."journalNo",
        je."entryDate"::text AS "entryDate",
        je."sourceType",
        je.description,
        je.status::text AS status,
        je."totalDebit",
        je."totalCredit",
        COUNT(jl.id)::int AS "lineCount"
      FROM "JournalEntry" je
      LEFT JOIN "JournalLine" jl ON jl."journalEntryId" = je.id
      GROUP BY je.id
      ORDER BY je."entryDate" DESC, je."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getJournalEntryById(key: string) {
  try {
    const rows = await sql<Array<{
      id: string;
      publicId: number;
      journalNo: string;
      entryDate: string;
      sourceType: string;
      sourceId: string;
      description: string;
      status: string;
      totalDebit: number;
      totalCredit: number;
      postedAt: string | null;
      postedByName: string | null;
      accountCode: string;
      accountName: string;
      lineDescription: string | null;
      debit: number;
      credit: number;
    }>>`
      SELECT
        je.id,
        je."publicId",
        je."journalNo",
        je."entryDate"::text AS "entryDate",
        je."sourceType",
        je."sourceId",
        je.description,
        je.status::text AS status,
        je."totalDebit",
        je."totalCredit",
        je."postedAt"::text AS "postedAt",
        posted.name AS "postedByName",
        a."accountCode",
        a."accountName",
        jl.description AS "lineDescription",
        jl.debit,
        jl.credit
      FROM "JournalEntry" je
      LEFT JOIN "User" posted ON posted.id = je."postedById"
      LEFT JOIN "JournalLine" jl ON jl."journalEntryId" = je.id
      LEFT JOIN "Account" a ON a.id = jl."accountId"
      WHERE ${isPublicIdParam(key) ? sql`je."publicId" = ${Number(key)}` : sql`je.id = ${key}`}
      ORDER BY jl."createdAt" ASC
    `;

    const first = rows[0];
    if (!first) {
      return null;
    }

    return {
      id: first.id,
      publicId: first.publicId,
      journalNo: first.journalNo,
      entryDate: first.entryDate,
      sourceType: first.sourceType,
      sourceId: first.sourceId,
      description: first.description,
      status: first.status,
      totalDebit: Number(first.totalDebit ?? 0),
      totalCredit: Number(first.totalCredit ?? 0),
      postedAt: first.postedAt,
      postedByName: first.postedByName,
      lines: rows
        .filter((row) => row.accountCode)
        .map((row) => ({
          accountCode: row.accountCode,
          accountName: row.accountName,
          description: row.lineDescription,
          debit: Number(row.debit ?? 0),
          credit: Number(row.credit ?? 0),
        })),
    };
  } catch {
    return null;
  }
}

export async function getGeneralLedgerRows() {
  try {
    const rows = await sql<Array<{ journalNo: string; entryDate: string; sourceType: string; accountCode: string; accountName: string; description: string | null; debit: number; credit: number }>>`
      SELECT
        je."journalNo",
        je."entryDate"::text AS "entryDate",
        je."sourceType",
        a."accountCode",
        a."accountName",
        COALESCE(jl.description, je.description) AS description,
        jl.debit,
        jl.credit
      FROM "JournalLine" jl
      INNER JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      INNER JOIN "Account" a ON a.id = jl."accountId"
      WHERE je.status = 'POSTED'
      ORDER BY a."accountCode" ASC, je."entryDate" ASC, je."createdAt" ASC, jl."createdAt" ASC
    `;
    const running = new Map<string, number>();
    return rows.map((row) => {
      const current = running.get(row.accountCode) ?? 0;
      const next = current + Number(row.debit ?? 0) - Number(row.credit ?? 0);
      running.set(row.accountCode, next);
      return { ...row, runningBalance: next };
    });
  } catch {
    return [];
  }
}

export async function getCashBookRows() {
  try {
    const rows = await sql<Array<{
      journalId: string;
      journalNo: string;
      entryDate: string;
      sourceType: string;
      accountCode: string;
      accountName: string;
      description: string | null;
      debit: number;
      credit: number;
    }>>`
      SELECT
        je.id AS "journalId",
        je."journalNo",
        je."entryDate"::text AS "entryDate",
        je."sourceType",
        a."accountCode",
        a."accountName",
        COALESCE(jl.description, je.description) AS description,
        jl.debit,
        jl.credit
      FROM "JournalLine" jl
      INNER JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      INNER JOIN "Account" a ON a.id = jl."accountId"
      WHERE je.status = 'POSTED'
        AND (LOWER(a."accountName") LIKE '%cash%' OR LOWER(a."accountName") LIKE '%bank%')
      ORDER BY je."entryDate" DESC, je."createdAt" DESC, jl."createdAt" ASC
    `;

    const running = new Map<string, number>();
    return rows.map((row) => {
      const current = running.get(row.accountCode) ?? 0;
      const next = current + Number(row.debit ?? 0) - Number(row.credit ?? 0);
      running.set(row.accountCode, next);
      return { ...row, debit: Number(row.debit ?? 0), credit: Number(row.credit ?? 0), runningBalance: next };
    });
  } catch {
    return [];
  }
}

export async function getBankMovementReport() {
  try {
    const rows = await sql<Array<{
      bankAccountId: string;
      accountCode: string;
      accountName: string;
      currency: string;
      openingBalance: number;
      currentBalance: number;
      sourceType: string;
      sourceId: string;
      postingType: string;
      amount: number;
      postedAt: string | null;
      memo: string | null;
    }>>`
      SELECT
        ba.id AS "bankAccountId",
        ba."accountCode",
        ba."accountName",
        ba.currency,
        ba."openingBalance",
        ba."currentBalance",
        p."sourceType",
        p."sourceId",
        p."postingType",
        CASE WHEN p."postingType" IN ('SUPPLIER_PAYMENT', 'SALES_RETURN', 'FUEL_ISSUE') THEN -p.amount ELSE p.amount END AS amount,
        p."postedAt"::text AS "postedAt",
        p.memo
      FROM "ProcurementFinancePosting" p
      INNER JOIN "BankAccount" ba ON ba.id = p."bankAccountId"
      WHERE p.status = 'POSTED'
        AND ba."isArchived" = false
      UNION ALL
      SELECT
        ba.id AS "bankAccountId",
        ba."accountCode",
        ba."accountName",
        ba.currency,
        ba."openingBalance",
        ba."currentBalance",
        p."sourceType",
        p."sourceId",
        p."postingType",
        CASE WHEN p."postingType" IN ('SALES_RETURN', 'RECEIPT_VOID') THEN -p.amount ELSE p.amount END AS amount,
        p."postedAt"::text AS "postedAt",
        p.memo
      FROM "SalesFinancePosting" p
      INNER JOIN "BankAccount" ba ON ba.id = p."bankAccountId"
      WHERE p.status = 'POSTED'
        AND p."isArchived" = false
        AND ba."isArchived" = false
      ORDER BY "postedAt" DESC NULLS LAST
    `;

    const accountTotals = new Map<string, { openingBalance: number; currentBalance: number; movementTotal: number; accountCode: string; accountName: string; currency: string }>();
    for (const row of rows) {
      const current = accountTotals.get(row.bankAccountId) ?? {
        openingBalance: Number(row.openingBalance ?? 0),
        currentBalance: Number(row.currentBalance ?? 0),
        movementTotal: 0,
        accountCode: row.accountCode,
        accountName: row.accountName,
        currency: row.currency,
      };
      current.movementTotal += Number(row.amount ?? 0);
      accountTotals.set(row.bankAccountId, current);
    }

    return {
      rows: rows.map((row) => ({ ...row, amount: Number(row.amount ?? 0) })),
      accounts: [...accountTotals.entries()].map(([bankAccountId, account]) => ({
        bankAccountId,
        ...account,
        expectedBalance: account.openingBalance + account.movementTotal,
        variance: account.currentBalance - (account.openingBalance + account.movementTotal),
      })),
    };
  } catch {
    return { rows: [], accounts: [] };
  }
}

export async function getTrialBalanceRows() {
  try {
    return await sql<Array<{ accountCode: string; accountName: string; accountType: string; debit: number; credit: number; balance: number }>>`
      SELECT
        a."accountCode",
        a."accountName",
        a."accountType"::text AS "accountType",
        COALESCE(SUM(jl.debit), 0)::double precision AS debit,
        COALESCE(SUM(jl.credit), 0)::double precision AS credit,
        (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))::double precision AS balance
      FROM "Account" a
      LEFT JOIN "JournalLine" jl ON jl."accountId" = a.id
      LEFT JOIN "JournalEntry" je ON je.id = jl."journalEntryId" AND je.status = 'POSTED'
      WHERE a."isArchived" = false
      GROUP BY a.id
      ORDER BY a."accountCode" ASC
    `;
  } catch {
    return [];
  }
}

export async function getFinancialStatementRows() {
  try {
    return await sql<Array<{
      accountCode: string;
      accountName: string;
      accountType: string;
      debit: number;
      credit: number;
      balance: number;
    }>>`
      SELECT
        a."accountCode",
        a."accountName",
        a."accountType"::text AS "accountType",
        COALESCE(SUM(jl.debit), 0)::double precision AS debit,
        COALESCE(SUM(jl.credit), 0)::double precision AS credit,
        (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))::double precision AS balance
      FROM "Account" a
      LEFT JOIN "JournalLine" jl ON jl."accountId" = a.id
      LEFT JOIN "JournalEntry" je ON je.id = jl."journalEntryId" AND je.status = 'POSTED'
      WHERE a."isArchived" = false
      GROUP BY a.id
      HAVING COALESCE(SUM(jl.debit), 0) <> 0 OR COALESCE(SUM(jl.credit), 0) <> 0
      ORDER BY a."accountCode" ASC
    `;
  } catch {
    return [];
  }
}

export async function getExpenseRegisterRows() {
  try {
    return await sql<Array<{
      journalId: string;
      journalNo: string;
      entryDate: string;
      sourceType: string;
      sourceId: string | null;
      accountCode: string;
      accountName: string;
      description: string | null;
      amount: number;
    }>>`
      SELECT
        je.id AS "journalId",
        je."journalNo",
        je."entryDate"::text AS "entryDate",
        je."sourceType",
        je."sourceId",
        a."accountCode",
        a."accountName",
        COALESCE(jl.description, je.description) AS description,
        (jl.debit - jl.credit)::double precision AS amount
      FROM "JournalLine" jl
      INNER JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      INNER JOIN "Account" a ON a.id = jl."accountId"
      WHERE je.status = 'POSTED'
        AND a."accountType"::text = 'EXPENSE'
        AND (jl.debit <> 0 OR jl.credit <> 0)
      ORDER BY je."entryDate" DESC, je."createdAt" DESC, a."accountCode" ASC
    `;
  } catch {
    return [];
  }
}
