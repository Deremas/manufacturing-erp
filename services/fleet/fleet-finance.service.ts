import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { allocateNextDocumentNumber } from "@/lib/document-numbering";

type Tx = typeof sql;

async function nextJournalNumber(tx: Tx) {
  return allocateNextDocumentNumber(tx, "JRN", "Journal Entry");
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
  const rows = await tx<Array<{ value: string | null }>>`
    SELECT value
    FROM "ModuleSetting"
    WHERE module = 'fleet'
      AND key = ${key}
      AND "isArchived" = false
    LIMIT 1
  `;

  const value = String(rows[0]?.value ?? "").trim();
  return value.length > 0 ? value : null;
}

async function resolvePostingAccounts(tx: Tx) {
  const [expenseAccountId, payableAccountId, bankControlAccountId] = await Promise.all([
    resolveModuleSettingAccountId(tx, "fuelExpenseAccountId"),
    resolveModuleSettingAccountId(tx, "fuelPayableAccountId"),
    resolveModuleSettingAccountId(tx, "fuelBankControlAccountId"),
  ]);

  const expenseFallback = await ensureAccount(tx, "6200", "Fuel Expense", "EXPENSE");
  const payableFallback = await ensureAccount(tx, "2130", "Fuel Supplier Payable", "LIABILITY");
  const bankFallback = await ensureAccount(tx, "1100", "Bank Control", "ASSET");

  return {
    expenseAccountId: expenseAccountId ?? expenseFallback.id,
    payableAccountId: payableAccountId ?? payableFallback.id,
    bankControlAccountId: bankControlAccountId ?? bankFallback.id,
  };
}

async function getFleetCurrency(tx: Tx) {
  const rows = await tx<Array<{ value: string | null }>>`
    SELECT value
    FROM "ModuleSetting"
    WHERE module = 'system'
      AND key = 'defaultCurrency'
      AND "isArchived" = false
    LIMIT 1
  `;

  const value = String(rows[0]?.value ?? "").trim();
  return value.length > 0 ? value : "ETB";
}

async function applyBankBalanceDelta(tx: Tx, bankAccountId: string | null, amount: number) {
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

export async function syncPostedFuelFinance(
  tx: Tx,
  input: {
    fuelRecordId: string;
    userId: string;
  },
) {
  const rows = await tx<Array<{
    id: string;
    fuelNo: string;
    fuelDate: Date;
    vehicleId: string;
    tripId: string | null;
    supplierId: string | null;
    bankAccountId: string | null;
    totalCost: number;
    status: string;
  }>>`
    SELECT
      id,
      "fuelNo",
      "fuelDate",
      "vehicleId",
      "tripId",
      "supplierId",
      "bankAccountId",
      "totalCost",
      status
    FROM "FuelRecord"
    WHERE id = ${input.fuelRecordId}
    LIMIT 1
  `;

  const fuel = rows[0];
  if (!fuel) {
    throw new Error("Fuel record not found for finance posting");
  }

  if (fuel.status !== "POSTED") {
    return null;
  }

  const amount = Number(fuel.totalCost ?? 0);
  if (!(amount > 0)) {
    return null;
  }

  const currency = await getFleetCurrency(tx);
  const postingType = fuel.bankAccountId ? "FUEL_BANK_EXPENSE" : "FUEL_PAYABLE_ACCRUAL";
  const {
    expenseAccountId,
    payableAccountId,
    bankControlAccountId,
  } = await resolvePostingAccounts(tx);

  await tx`
    INSERT INTO "FleetFinancePosting" (
      id, "sourceType", "sourceId", "postingType", "fuelRecordId", "tripId", "vehicleId", "supplierId",
      "bankAccountId", amount, currency, status, memo, "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      'fleet.fuel',
      ${fuel.id},
      ${postingType},
      ${fuel.id},
      ${fuel.tripId},
      ${fuel.vehicleId},
      ${fuel.supplierId},
      ${fuel.bankAccountId},
      ${amount},
      ${currency},
      'POSTED',
      ${`Fuel record ${fuel.fuelNo}`},
      ${input.userId},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("sourceType", "sourceId")
    DO UPDATE SET
      "postingType" = EXCLUDED."postingType",
      "fuelRecordId" = EXCLUDED."fuelRecordId",
      "tripId" = EXCLUDED."tripId",
      "vehicleId" = EXCLUDED."vehicleId",
      "supplierId" = EXCLUDED."supplierId",
      "bankAccountId" = EXCLUDED."bankAccountId",
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      memo = EXCLUDED.memo,
      "postedById" = EXCLUDED."postedById",
      "postedAt" = EXCLUDED."postedAt",
      "updatedAt" = NOW()
  `;

  if (fuel.bankAccountId) {
    await applyBankBalanceDelta(tx, fuel.bankAccountId, amount * -1);
  }

  const existingJournal = await tx<Array<{ id: string; journalNo: string }>>`
    SELECT id, "journalNo"
    FROM "JournalEntry"
    WHERE "sourceType" = 'fleet.fuel'
      AND "sourceId" = ${fuel.id}
    LIMIT 1
  `;

  const journalId = existingJournal[0]?.id ?? randomUUID();
  const journalNo = existingJournal[0]?.journalNo ?? await nextJournalNumber(tx);

  await tx`
    INSERT INTO "JournalEntry" (
      id, "journalNo", "entryDate", "sourceType", "sourceId", description, status,
      "totalDebit", "totalCredit", "postedById", "postedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${journalId},
      ${journalNo},
      ${fuel.fuelDate},
      'fleet.fuel',
      ${fuel.id},
      ${`Fleet fuel expense ${fuel.fuelNo}`},
      'POSTED',
      ${amount},
      ${amount},
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

  await tx`
    INSERT INTO "JournalLine" (
      id, "journalEntryId", "accountId", description, debit, credit, "createdAt"
    )
    VALUES
    (
      ${randomUUID()},
      ${journalId},
      ${expenseAccountId},
      'Fleet fuel expense',
      ${amount},
      0,
      NOW()
    ),
    (
      ${randomUUID()},
      ${journalId},
      ${fuel.bankAccountId ? bankControlAccountId : payableAccountId},
      ${fuel.bankAccountId ? "Bank-funded fuel payment" : "Fuel supplier payable accrual"},
      0,
      ${amount},
      NOW()
    )
  `;

  return { fuelRecordId: fuel.id, journalId };
}

export async function voidFuelFinance(
  tx: Tx,
  input: {
    fuelRecordId: string;
    userId: string;
    reason?: string | null;
  },
) {
  const rows = await tx<Array<{
    id: string;
    fuelNo: string;
    bankAccountId: string | null;
    totalCost: number;
  }>>`
    SELECT id, "fuelNo", "bankAccountId", "totalCost"
    FROM "FuelRecord"
    WHERE id = ${input.fuelRecordId}
    LIMIT 1
  `;

  const fuel = rows[0];
  if (!fuel) {
    throw new Error("Fuel record not found for finance reversal");
  }

  await tx`
    UPDATE "FleetFinancePosting"
    SET
      status = 'VOIDED',
      memo = CASE
        WHEN ${input.reason ?? null}::text IS NULL OR ${input.reason ?? null}::text = ''
          THEN CONCAT(COALESCE(memo, ''), ' [Voided]')
        ELSE CONCAT(COALESCE(memo, ''), ' [Voided: ', ${input.reason ?? null}, ']')
      END,
      "updatedAt" = NOW()
    WHERE "sourceType" = 'fleet.fuel'
      AND "sourceId" = ${fuel.id}
  `;

  if (fuel.bankAccountId) {
    await applyBankBalanceDelta(tx, fuel.bankAccountId, Number(fuel.totalCost ?? 0));
  }

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
    WHERE "sourceType" = 'fleet.fuel'
      AND "sourceId" = ${fuel.id}
  `;

  return { fuelRecordId: fuel.id };
}
