import { randomUUID } from "crypto";

import { sql } from "@/lib/db";

type Tx = typeof sql;

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
  if (!config) {
    throw new Error("Journal numbering config missing");
  }

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

  if (!rows[0]) {
    throw new Error(`Missing account ${accountCode}`);
  }

  return rows[0];
}

async function resolveModuleSettingAccountId(tx: Tx, key: string) {
  const rows = await tx<Array<{ value: string }>>`
    SELECT value
    FROM "ModuleSetting"
    WHERE module = 'maintenance'
      AND key = ${key}
      AND "isArchived" = false
    LIMIT 1
  `;

  const value = String(rows[0]?.value ?? "").trim();
  return value.length > 0 ? value : null;
}

async function resolvePostingAccounts(tx: Tx) {
  const [
    expenseAccountId,
    spareInventoryAccountId,
    externalServiceAccountId,
  ] = await Promise.all([
    resolveModuleSettingAccountId(tx, "expenseAccountId"),
    resolveModuleSettingAccountId(tx, "spareInventoryAccountId"),
    resolveModuleSettingAccountId(tx, "externalServiceAccountId"),
  ]);

  if (!expenseAccountId || !spareInventoryAccountId || !externalServiceAccountId) {
    throw new Error("Maintenance GL accounts are not configured. Set expenseAccountId, spareInventoryAccountId, and externalServiceAccountId in module settings before posting.");
  }

  return {
    expenseAccountId,
    spareInventoryAccountId,
    externalServiceAccountId,
  };
}

export async function syncMaintenanceWorkOrderFinance(
  tx: Tx,
  input: {
    workOrderId: string;
    userId: string;
  },
) {
  const rows = await tx<Array<{
    id: string;
    workOrderNo: string;
    status: string;
    totalSpareCost: number;
    totalExternalCost: number;
  }>>`
    SELECT
      id,
      "workOrderNo",
      status::text AS status,
      COALESCE("totalSpareCost", 0) AS "totalSpareCost",
      COALESCE("totalExternalCost", 0) AS "totalExternalCost"
    FROM "MaintenanceWorkOrder"
    WHERE id = ${input.workOrderId}
    LIMIT 1
  `;

  const workOrder = rows[0];
  if (!workOrder) {
    throw new Error("Maintenance work order not found for finance posting");
  }

  if (!["COMPLETED", "TESTED", "CLOSED"].includes(workOrder.status)) {
    return null;
  }

  const spareAmount = Number(workOrder.totalSpareCost ?? 0);
  const externalAmount = Number(workOrder.totalExternalCost ?? 0);
  const journalAmount = spareAmount + externalAmount;

  if (journalAmount <= 0) {
    return null;
  }

  const {
    expenseAccountId,
    spareInventoryAccountId,
    externalServiceAccountId,
  } = await resolvePostingAccounts(tx);

  const existingRows = await tx<Array<{ id: string; journalNo: string }>>`
    SELECT id, "journalNo"
    FROM "JournalEntry"
    WHERE "sourceType" = 'maintenance.work-order'
      AND "sourceId" = ${workOrder.id}
    LIMIT 1
  `;

  const journalId = existingRows[0]?.id ?? randomUUID();
  const journalNo = existingRows[0]?.journalNo ?? await nextJournalNumber(tx);

  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${journalId},
      ${journalNo},
      NOW(),
      'maintenance.work-order',
      ${workOrder.id},
      ${`Maintenance work order ${workOrder.workOrderNo}`},
      'POSTED',
      ${journalAmount},
      ${journalAmount},
      ${input.userId},
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

  if (spareAmount > 0) {
    await tx`
      INSERT INTO "JournalLine" (
        id, "journalEntryId", "accountId", description, debit, credit, "createdAt"
      )
      VALUES
      (
        ${randomUUID()},
        ${journalId},
        ${expenseAccountId},
        'Maintenance spare parts expense',
        ${spareAmount},
        0,
        NOW()
      ),
      (
        ${randomUUID()},
        ${journalId},
        ${spareInventoryAccountId},
        'Spare parts inventory consumption',
        0,
        ${spareAmount},
        NOW()
      )
    `;
  }

  if (externalAmount > 0) {
    await tx`
      INSERT INTO "JournalLine" (
        id, "journalEntryId", "accountId", description, debit, credit, "createdAt"
      )
      VALUES
      (
        ${randomUUID()},
        ${journalId},
        ${expenseAccountId},
        'External maintenance service expense',
        ${externalAmount},
        0,
        NOW()
      ),
      (
        ${randomUUID()},
        ${journalId},
        ${externalServiceAccountId},
        'External maintenance service accrual',
        0,
        ${externalAmount},
        NOW()
      )
    `;
  }

  return { id: journalId, journalNo };
}

export async function reverseMaintenanceWorkOrderFinance(
  tx: Tx,
  input: { workOrderId: string; userId: string; reason: string },
) {
  const entries = await tx<Array<{ id: string; journalNo: string; status: string }>>`
    SELECT id, "journalNo", status::text AS status
    FROM "JournalEntry"
    WHERE "sourceType" = 'maintenance.work-order' AND "sourceId" = ${input.workOrderId}
    LIMIT 1
    FOR UPDATE
  `;
  const original = entries[0];
  if (!original || original.status === "REVERSED") return null;
  if (original.status !== "POSTED") {
    throw new Error("Only a posted maintenance journal can be reversed");
  }

  const lines = await tx<Array<{ accountId: string; description: string | null; debit: number; credit: number }>>`
    SELECT "accountId", description, debit, credit
    FROM "JournalLine"
    WHERE "journalEntryId" = ${original.id}
    ORDER BY "createdAt" ASC
  `;
  const amount = lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
  const reversalId = randomUUID();
  const reversalNo = await nextJournalNumber(tx);
  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    ) VALUES (
      ${reversalId}, ${reversalNo}, NOW(), 'maintenance.work-order-reversal', ${original.id},
      ${`Reversal of ${original.journalNo}: ${input.reason}`}, 'POSTED', ${amount}, ${amount},
      ${input.userId}, NOW(), NOW(), NOW()
    )
  `;
  for (const line of lines) {
    await tx`
      INSERT INTO "JournalLine" (id, "journalEntryId", "accountId", description, debit, credit, "createdAt")
      VALUES (${randomUUID()}, ${reversalId}, ${line.accountId}, ${`Reversal: ${line.description ?? "maintenance posting"}`}, ${Number(line.credit ?? 0)}, ${Number(line.debit ?? 0)}, NOW())
    `;
  }
  await tx`UPDATE "JournalEntry" SET status = 'REVERSED', "updatedAt" = NOW() WHERE id = ${original.id}`;
  return { id: reversalId, journalNo: reversalNo, reversedJournalNo: original.journalNo };
}
