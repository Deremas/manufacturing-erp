import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import type { Tx } from "@/services/procurement/procurement-shared.service";

export type BankReconciliationRecord = {
  id: string;
  publicId: number;
  reconciliationNo: string;
  bankAccountId: string;
  bankAccount: string;
  currency: string;
  periodFrom: string;
  periodTo: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  systemClosingBalance: number;
  variance: number;
  status: string;
  remarks: string | null;
  reconciledAt: string | null;
  reopenReason: string | null;
};

export type ReconciliationMovement = {
  journalId: string;
  journalNo: string;
  entryDate: string;
  sourceType: string;
  sourceId: string;
  description: string;
  debit: number;
  credit: number;
  netMovement: number;
};

async function nextNumber(tx: Tx) {
  const year = new Date().getFullYear();
  const prefix = `BREC-${year}-`;
  const rows = await tx<Array<{ value: number }>>`
    SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE("reconciliationNo", '^.*-', ''), '')::integer), 0) + 1 AS value
    FROM "BankReconciliation" WHERE "reconciliationNo" LIKE ${`${prefix}%`}
  `;
  return `${prefix}${String(Number(rows[0]?.value ?? 1)).padStart(4, "0")}`;
}

async function getSystemClosingBalance(tx: Tx, bankAccountId: string, periodTo: Date) {
  const accounts = await tx<Array<{ id: string; accountCode: string; openingBalance: number }>>`
    SELECT ba.id, ba."accountCode", ba."openingBalance"
    FROM "BankAccount" ba
    WHERE ba.id = ${bankAccountId} AND ba."isActive" = true AND ba."isArchived" = false
    LIMIT 1
  `;
  const bank = accounts[0];
  if (!bank) throw new Error("Active bank account not found");
  const totals = await tx<Array<{ movement: number }>>`
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::double precision AS movement
    FROM "JournalLine" jl
    INNER JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
    INNER JOIN "Account" a ON a.id = jl."accountId"
    WHERE je.status = 'POSTED' AND a."accountCode" = ${bank.accountCode} AND je."entryDate" <= ${periodTo}
  `;
  return Number(bank.openingBalance ?? 0) + Number(totals[0]?.movement ?? 0);
}

async function writeHistory(tx: Tx, userId: string, action: string, id: string, value: unknown) {
  const json = JSON.stringify(value);
  await tx`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived") VALUES (${randomUUID()}, ${userId}, ${action}, 'finance.bank-reconciliation', ${id}, ${json}, NOW(), false)`;
  await tx`INSERT INTO "DocumentHistory" (id, "referenceType", "referenceId", action, "newValue", "performedById", "createdAt", "isArchived") VALUES (${randomUUID()}, 'finance.bank-reconciliation', ${id}, ${action}, ${json}, ${userId}, NOW(), false)`;
}

export async function listBankReconciliations(): Promise<BankReconciliationRecord[]> {
  const rows = await sql<Array<BankReconciliationRecord>>`
    SELECT br.id, br."publicId", br."reconciliationNo", br."bankAccountId", ba."accountCode" || ' - ' || ba."accountName" AS "bankAccount",
      ba.currency, br."periodFrom"::text AS "periodFrom", br."periodTo"::text AS "periodTo",
      br."statementOpeningBalance"::double precision AS "statementOpeningBalance",
      br."statementClosingBalance"::double precision AS "statementClosingBalance",
      br."systemClosingBalance"::double precision AS "systemClosingBalance", br.variance::double precision AS variance,
      br.status::text AS status, br.remarks, br."reconciledAt"::text AS "reconciledAt", br."reopenReason"
    FROM "BankReconciliation" br INNER JOIN "BankAccount" ba ON ba.id = br."bankAccountId"
    ORDER BY br."periodTo" DESC, br."createdAt" DESC
  `;
  return rows.map((row) => ({ ...row, statementOpeningBalance: Number(row.statementOpeningBalance), statementClosingBalance: Number(row.statementClosingBalance), systemClosingBalance: Number(row.systemClosingBalance), variance: Number(row.variance) }));
}

export async function getBankReconciliation(key: string) {
  const record = isPublicIdParam(key)
    ? (await listBankReconciliations()).find((item) => item.publicId === Number(key)) ?? null
    : (await listBankReconciliations()).find((item) => item.id === key) ?? null;
  if (!record) return null;
  const movements = await sql<ReconciliationMovement[]>`
    SELECT je.id AS "journalId", je."journalNo", je."entryDate"::text AS "entryDate", je."sourceType", je."sourceId",
      COALESCE(jl.description, je.description) AS description, jl.debit::double precision AS debit,
      jl.credit::double precision AS credit, (jl.debit - jl.credit)::double precision AS "netMovement"
    FROM "JournalLine" jl
    INNER JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
    INNER JOIN "Account" a ON a.id = jl."accountId"
    INNER JOIN "BankAccount" ba ON ba."accountCode" = a."accountCode"
    WHERE ba.id = ${record.bankAccountId} AND je.status = 'POSTED'
      AND je."entryDate" >= ${new Date(record.periodFrom)} AND je."entryDate" <= ${new Date(record.periodTo)}
    ORDER BY je."entryDate", je."createdAt"
  `;
  return { record, movements: movements.map((row) => ({ ...row, debit: Number(row.debit), credit: Number(row.credit), netMovement: Number(row.netMovement) })) };
}

export async function createBankReconciliation(input: { bankAccountId: string; periodFrom: string; periodTo: string; statementOpeningBalance: number; statementClosingBalance: number; remarks?: string; createdById: string }) {
  const from = new Date(input.periodFrom); const to = new Date(input.periodTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) throw new Error("A valid reconciliation date range is required");
  if (!Number.isFinite(input.statementOpeningBalance) || !Number.isFinite(input.statementClosingBalance)) throw new Error("Statement balances are required");
  let id = "";
  await sql.begin(async (tx) => {
    const conflicts = await tx<Array<{ id: string }>>`
      SELECT id FROM "BankReconciliation"
      WHERE "bankAccountId" = ${input.bankAccountId} AND status = 'RECONCILED'
        AND "periodFrom" <= ${to} AND "periodTo" >= ${from} LIMIT 1
    `;
    if (conflicts[0]) throw new Error("A reconciled period already overlaps this date range for the selected bank account");
    const systemClosing = await getSystemClosingBalance(tx, input.bankAccountId, to);
    const variance = input.statementClosingBalance - systemClosing;
    id = randomUUID(); const reconciliationNo = await nextNumber(tx);
    await tx`
      INSERT INTO "BankReconciliation" (id, "reconciliationNo", "bankAccountId", "periodFrom", "periodTo", "statementOpeningBalance", "statementClosingBalance", "systemClosingBalance", variance, status, remarks, "createdById", "createdAt", "updatedAt")
      VALUES (${id}, ${reconciliationNo}, ${input.bankAccountId}, ${from}, ${to}, ${input.statementOpeningBalance}, ${input.statementClosingBalance}, ${systemClosing}, ${variance}, 'DRAFT', ${input.remarks?.trim() || null}, ${input.createdById}, NOW(), NOW())
    `;
    await writeHistory(tx, input.createdById, "CREATE_BANK_RECONCILIATION", id, { reconciliationNo, systemClosing, variance });
  });
  return getBankReconciliation(id);
}

export async function reconcileBankAccount(input: { id: string; reconciledById: string }) {
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string; bankAccountId: string; periodTo: string; statementClosingBalance: number }>>`
      SELECT id, status::text AS status, "bankAccountId", "periodTo"::text AS "periodTo", "statementClosingBalance"
      FROM "BankReconciliation" WHERE id = ${input.id} LIMIT 1 FOR UPDATE
    `;
    const record = rows[0]; if (!record) throw new Error("Bank reconciliation not found");
    if (!["DRAFT", "REOPENED"].includes(record.status)) throw new Error("Only draft or reopened reconciliation can be finalized");
    const systemClosing = await getSystemClosingBalance(tx, record.bankAccountId, new Date(record.periodTo));
    const variance = Number(record.statementClosingBalance) - systemClosing;
    if (Math.abs(variance) > 0.009) throw new Error(`Reconciliation variance must be zero before finalizing. Current variance: ${variance.toFixed(2)}`);
    await tx`UPDATE "BankReconciliation" SET status = 'RECONCILED', "systemClosingBalance" = ${systemClosing}, variance = ${variance}, "reconciledById" = ${input.reconciledById}, "reconciledAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`;
    await writeHistory(tx, input.reconciledById, "RECONCILE_BANK_ACCOUNT", input.id, { systemClosing, variance });
  });
  return getBankReconciliation(input.id);
}

export async function reopenBankReconciliation(input: { id: string; reason: string; reopenedById: string }) {
  const reason = input.reason.trim(); if (!reason) throw new Error("Reopen reason is required");
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ status: string }>>`SELECT status::text AS status FROM "BankReconciliation" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    if (!rows[0]) throw new Error("Bank reconciliation not found");
    if (rows[0].status !== "RECONCILED") throw new Error("Only reconciled periods can be reopened");
    await tx`UPDATE "BankReconciliation" SET status = 'REOPENED', "reopenedById" = ${input.reopenedById}, "reopenedAt" = NOW(), "reopenReason" = ${reason}, "updatedAt" = NOW() WHERE id = ${input.id}`;
    await writeHistory(tx, input.reopenedById, "REOPEN_BANK_RECONCILIATION", input.id, { reason });
  });
  return getBankReconciliation(input.id);
}
