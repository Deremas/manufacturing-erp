import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
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
  accountType: "ASSET" | "LIABILITY" | "EXPENSE",
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
    return await sql<Array<{ id: string; journalNo: string; entryDate: string; sourceType: string; description: string; status: string; totalDebit: number; totalCredit: number; lineCount: number }>>`
      SELECT
        je.id,
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
