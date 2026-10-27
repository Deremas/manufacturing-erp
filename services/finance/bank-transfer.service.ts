import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import type { Tx } from "@/services/procurement/procurement-shared.service";

export type BankTransferRecord = {
  id: string;
  publicId: number;
  transferNo: string;
  transferDate: string;
  fromBankAccountId: string;
  fromAccount: string;
  toBankAccountId: string;
  toAccount: string;
  amount: number;
  currency: string;
  status: string;
  referenceNo: string | null;
  remarks: string | null;
  postedAt: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
};

type BankRow = { id: string; accountCode: string; accountName: string; currency: string; currentBalance: number };

async function nextTransferNumber(tx: Tx) {
  const year = new Date().getFullYear();
  const prefix = `BTR-${year}-`;
  const rows = await tx<Array<{ value: number }>>`
    SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE("transferNo", '^.*-', ''), '')::integer), 0) + 1 AS value
    FROM "BankTransfer" WHERE "transferNo" LIKE ${`${prefix}%`}
  `;
  return `${prefix}${String(Number(rows[0]?.value ?? 1)).padStart(4, "0")}`;
}

async function getTransferBanksForUpdate(tx: Tx, fromId: string, toId: string) {
  const rows = await tx<BankRow[]>`
    SELECT id, "accountCode", "accountName", currency, "currentBalance"
    FROM "BankAccount"
    WHERE id IN (${fromId}, ${toId}) AND "isActive" = true AND "isArchived" = false
    ORDER BY id FOR UPDATE
  `;
  const from = rows.find((row) => row.id === fromId);
  const to = rows.find((row) => row.id === toId);
  if (!from || !to) throw new Error("Active source or destination bank account not found");
  return {
    from: { ...from, currentBalance: Number(from.currentBalance ?? 0) },
    to: { ...to, currentBalance: Number(to.currentBalance ?? 0) },
  };
}

async function getLedgerAccount(tx: Tx, accountCode: string) {
  const rows = await tx<Array<{ id: string }>>`
    SELECT id FROM "Account" WHERE "accountCode" = ${accountCode} AND "isActive" = true AND "isArchived" = false LIMIT 1
  `;
  if (!rows[0]) throw new Error(`No active ledger account is mapped to bank account code ${accountCode}`);
  return rows[0].id;
}

async function nextJournalNumber(tx: Tx) {
  const rows = await tx<Array<{ value: number }>>`SELECT COUNT(*) + 1 AS value FROM "JournalEntry"`;
  return `JRN-${new Date().getFullYear()}-${String(Number(rows[0]?.value ?? 1)).padStart(6, "0")}`;
}

async function writeAudit(tx: Tx, userId: string, action: string, recordId: string, value: unknown) {
  await tx`
    INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived")
    VALUES (${randomUUID()}, ${userId}, ${action}, 'finance.bank-transfer', ${recordId}, ${JSON.stringify(value)}, NOW(), false)
  `;
  await tx`
    INSERT INTO "DocumentHistory" (id, "referenceType", "referenceId", action, "newValue", "performedById", "createdAt", "isArchived")
    VALUES (${randomUUID()}, 'finance.bank-transfer', ${recordId}, ${action}, ${JSON.stringify(value)}, ${userId}, NOW(), false)
  `;
}

export async function listBankAccountsForTransfer() {
  return sql<Array<{ id: string; label: string; currency: string; currentBalance: number }>>`
    SELECT id, "accountCode" || ' - ' || "accountName" AS label, currency, "currentBalance"::double precision AS "currentBalance"
    FROM "BankAccount" WHERE "isActive" = true AND "isArchived" = false AND "allowPayments" = true
    ORDER BY "accountCode"
  `;
}

export async function listBankTransfers(): Promise<BankTransferRecord[]> {
  const rows = await sql<Array<BankTransferRecord>>`
    SELECT
      bt.id, bt."publicId", bt."transferNo", bt."transferDate"::text AS "transferDate", bt."fromBankAccountId",
      f."accountCode" || ' - ' || f."accountName" AS "fromAccount", bt."toBankAccountId",
      t."accountCode" || ' - ' || t."accountName" AS "toAccount", bt.amount::double precision AS amount,
      bt.currency, bt.status::text AS status, bt."referenceNo", bt.remarks,
      bt."postedAt"::text AS "postedAt", bt."reversedAt"::text AS "reversedAt", bt."reversalReason"
    FROM "BankTransfer" bt
    INNER JOIN "BankAccount" f ON f.id = bt."fromBankAccountId"
    INNER JOIN "BankAccount" t ON t.id = bt."toBankAccountId"
    ORDER BY bt."transferDate" DESC, bt."createdAt" DESC
  `;
  return rows.map((row) => ({ ...row, amount: Number(row.amount ?? 0) }));
}

export async function getBankTransfer(key: string) {
  if (isPublicIdParam(key)) {
    return (await listBankTransfers()).find((item) => item.publicId === Number(key)) ?? null;
  }
  return (await listBankTransfers()).find((item) => item.id === key) ?? null;
}

export async function createAndPostBankTransfer(input: {
  transferDate: string;
  fromBankAccountId: string;
  toBankAccountId: string;
  amount: number;
  referenceNo?: string;
  remarks?: string;
  createdById: string;
}) {
  if (input.fromBankAccountId === input.toBankAccountId) throw new Error("Source and destination bank accounts must be different");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Transfer amount must be greater than zero");

  let id = "";
  await sql.begin(async (tx) => {
    const { from, to } = await getTransferBanksForUpdate(tx, input.fromBankAccountId, input.toBankAccountId);
    if (from.currency !== to.currency) throw new Error("Cross-currency bank transfers require an exchange-rate workflow");
    if (from.currentBalance + 0.000001 < input.amount) throw new Error("Source bank account has insufficient posted balance");

    const [fromLedgerId, toLedgerId, transferNo, journalNo] = await Promise.all([
      getLedgerAccount(tx, from.accountCode),
      getLedgerAccount(tx, to.accountCode),
      nextTransferNumber(tx),
      nextJournalNumber(tx),
    ]);
    id = randomUUID();
    await tx`
      INSERT INTO "BankTransfer" (
        id, "transferNo", "transferDate", "fromBankAccountId", "toBankAccountId", amount, currency,
        status, "referenceNo", remarks, "createdById", "postedById", "postedAt", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${transferNo}, ${new Date(input.transferDate)}, ${from.id}, ${to.id}, ${input.amount}, ${from.currency},
        'POSTED', ${input.referenceNo?.trim() || null}, ${input.remarks?.trim() || null}, ${input.createdById}, ${input.createdById}, NOW(), NOW(), NOW()
      )
    `;
    await tx`UPDATE "BankAccount" SET "currentBalance" = "currentBalance" - ${input.amount}, "updatedAt" = NOW() WHERE id = ${from.id}`;
    await tx`UPDATE "BankAccount" SET "currentBalance" = "currentBalance" + ${input.amount}, "updatedAt" = NOW() WHERE id = ${to.id}`;

    const journalId = randomUUID();
    const description = `Bank transfer ${transferNo}: ${from.accountName} to ${to.accountName}`;
    await tx`
      INSERT INTO "JournalEntry" (id, "journalNo", "entryDate", "sourceType", "sourceId", description, status, "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt")
      VALUES (${journalId}, ${journalNo}, ${new Date(input.transferDate)}, 'finance.bank-transfer', ${id}, ${description}, 'POSTED', ${input.amount}, ${input.amount}, ${input.createdById}, NOW(), NOW(), NOW())
    `;
    await tx`
      INSERT INTO "JournalLine" (id, "journalEntryId", "accountId", description, debit, credit, "createdAt") VALUES
      (${randomUUID()}, ${journalId}, ${toLedgerId}, ${description}, ${input.amount}, 0, NOW()),
      (${randomUUID()}, ${journalId}, ${fromLedgerId}, ${description}, 0, ${input.amount}, NOW())
    `;
    await writeAudit(tx, input.createdById, "POST_BANK_TRANSFER", id, { transferNo, amount: input.amount, from: from.accountCode, to: to.accountCode });
  });
  return getBankTransfer(id);
}

export async function reverseBankTransfer(input: { id: string; reason: string; reversedById: string }) {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reversal reason is required");
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; transferNo: string; status: string; fromBankAccountId: string; toBankAccountId: string; amount: number; transferDate: string }>>`
      SELECT id, "transferNo", status::text AS status, "fromBankAccountId", "toBankAccountId", amount, "transferDate"::text AS "transferDate"
      FROM "BankTransfer" WHERE id = ${input.id} LIMIT 1 FOR UPDATE
    `;
    const transfer = rows[0];
    if (!transfer) throw new Error("Bank transfer not found");
    if (transfer.status !== "POSTED") throw new Error("Only posted bank transfers can be reversed");
    const { from, to } = await getTransferBanksForUpdate(tx, transfer.fromBankAccountId, transfer.toBankAccountId);
    if (to.currentBalance + 0.000001 < Number(transfer.amount)) throw new Error("Destination account balance is insufficient for reversal");
    const [fromLedgerId, toLedgerId, journalNo] = await Promise.all([getLedgerAccount(tx, from.accountCode), getLedgerAccount(tx, to.accountCode), nextJournalNumber(tx)]);
    await tx`UPDATE "BankAccount" SET "currentBalance" = "currentBalance" + ${transfer.amount}, "updatedAt" = NOW() WHERE id = ${from.id}`;
    await tx`UPDATE "BankAccount" SET "currentBalance" = "currentBalance" - ${transfer.amount}, "updatedAt" = NOW() WHERE id = ${to.id}`;
    await tx`UPDATE "BankTransfer" SET status = 'REVERSED', "reversedById" = ${input.reversedById}, "reversedAt" = NOW(), "reversalReason" = ${reason}, "updatedAt" = NOW() WHERE id = ${input.id}`;
    await tx`UPDATE "JournalEntry" SET status = 'REVERSED', "updatedAt" = NOW() WHERE "sourceType" = 'finance.bank-transfer' AND "sourceId" = ${input.id} AND status = 'POSTED'`;
    const journalId = randomUUID();
    const description = `Reversal of bank transfer ${transfer.transferNo}: ${reason}`;
    await tx`
      INSERT INTO "JournalEntry" (id, "journalNo", "entryDate", "sourceType", "sourceId", description, status, "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt")
      VALUES (${journalId}, ${journalNo}, NOW(), 'finance.bank-transfer.reversal', ${input.id}, ${description}, 'POSTED', ${transfer.amount}, ${transfer.amount}, ${input.reversedById}, NOW(), NOW(), NOW())
    `;
    await tx`
      INSERT INTO "JournalLine" (id, "journalEntryId", "accountId", description, debit, credit, "createdAt") VALUES
      (${randomUUID()}, ${journalId}, ${fromLedgerId}, ${description}, ${transfer.amount}, 0, NOW()),
      (${randomUUID()}, ${journalId}, ${toLedgerId}, ${description}, 0, ${transfer.amount}, NOW())
    `;
    await writeAudit(tx, input.reversedById, "REVERSE_BANK_TRANSFER", input.id, { reason, transferNo: transfer.transferNo });
  });
  return getBankTransfer(input.id);
}
