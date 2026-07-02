DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountType') THEN
    CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JournalEntryStatus') THEN
    CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT PRIMARY KEY,
  "accountCode" TEXT NOT NULL UNIQUE,
  "accountName" TEXT NOT NULL,
  "accountType" "AccountType" NOT NULL,
  "parentAccountId" TEXT REFERENCES "Account"(id) ON DELETE SET NULL,
  description TEXT,
  "isControlAccount" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "JournalEntry" (
  id TEXT PRIMARY KEY,
  "journalNo" TEXT NOT NULL UNIQUE,
  "entryDate" TIMESTAMP NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  description TEXT NOT NULL,
  status "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
  "totalDebit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "postedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "postedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "JournalEntry_source_unique" UNIQUE ("sourceType", "sourceId")
);

CREATE TABLE IF NOT EXISTS "JournalLine" (
  id TEXT PRIMARY KEY,
  "journalEntryId" TEXT NOT NULL REFERENCES "JournalEntry"(id) ON DELETE CASCADE,
  "accountId" TEXT NOT NULL REFERENCES "Account"(id) ON DELETE RESTRICT,
  description TEXT,
  debit DOUBLE PRECISION NOT NULL DEFAULT 0,
  credit DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Account_accountType_idx" ON "Account"("accountType");
CREATE INDEX IF NOT EXISTS "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");
CREATE INDEX IF NOT EXISTS "JournalLine_accountId_idx" ON "JournalLine"("accountId");

INSERT INTO "DocumentNumbering" (
  id, prefix, description, "prefixFormat", separator, "yearFormat", "monthFormat", "dayFormat",
  "sequenceLength", "currentSequence", "isActive", "isArchived"
)
VALUES
  ('docnum-jrn', 'JRN', 'Journal Entry', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false)
ON CONFLICT ("prefix") DO NOTHING;

INSERT INTO "Account" (
  id, "accountCode", "accountName", "accountType", description, "isControlAccount", "isActive", "isArchived", "createdAt", "updatedAt"
)
VALUES
  ('acct-bank-control', '1100', 'Bank Control', 'ASSET', 'Control account for bank movement postings', true, true, false, NOW(), NOW()),
  ('acct-ap-control', '2000', 'Accounts Payable Control', 'LIABILITY', 'Control account for supplier liabilities', true, true, false, NOW(), NOW()),
  ('acct-proc-expense', '5000', 'Procurement Expense', 'EXPENSE', 'Expense/clearing account for supplier invoice accrual postings', false, true, false, NOW(), NOW())
ON CONFLICT ("accountCode") DO NOTHING;
