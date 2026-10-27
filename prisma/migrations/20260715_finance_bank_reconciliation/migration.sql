DO $$ BEGIN
  CREATE TYPE "BankReconciliationStatus" AS ENUM ('DRAFT', 'RECONCILED', 'REOPENED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BankReconciliation" (
  id TEXT PRIMARY KEY,
  "reconciliationNo" TEXT NOT NULL UNIQUE,
  "bankAccountId" TEXT NOT NULL,
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "statementOpeningBalance" DOUBLE PRECISION NOT NULL,
  "statementClosingBalance" DOUBLE PRECISION NOT NULL,
  "systemClosingBalance" DOUBLE PRECISION NOT NULL,
  variance DOUBLE PRECISION NOT NULL,
  status "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
  remarks TEXT,
  "createdById" TEXT NOT NULL,
  "reconciledById" TEXT,
  "reconciledAt" TIMESTAMP(3),
  "reopenedById" TEXT,
  "reopenedAt" TIMESTAMP(3),
  "reopenReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BankReconciliation_bankAccountId_idx" ON "BankReconciliation"("bankAccountId");
CREATE INDEX IF NOT EXISTS "BankReconciliation_period_idx" ON "BankReconciliation"("periodFrom", "periodTo");
CREATE INDEX IF NOT EXISTS "BankReconciliation_status_idx" ON "BankReconciliation"(status);
