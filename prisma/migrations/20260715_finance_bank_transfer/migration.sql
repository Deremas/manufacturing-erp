DO $$ BEGIN
  CREATE TYPE "BankTransferStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BankTransfer" (
  id TEXT PRIMARY KEY,
  "transferNo" TEXT NOT NULL UNIQUE,
  "transferDate" TIMESTAMP(3) NOT NULL,
  "fromBankAccountId" TEXT NOT NULL,
  "toBankAccountId" TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ETB',
  status "BankTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "referenceNo" TEXT,
  remarks TEXT,
  "createdById" TEXT NOT NULL,
  "postedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "reversedById" TEXT,
  "reversedAt" TIMESTAMP(3),
  "reversalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BankTransfer_transferDate_idx" ON "BankTransfer"("transferDate");
CREATE INDEX IF NOT EXISTS "BankTransfer_fromBankAccountId_idx" ON "BankTransfer"("fromBankAccountId");
CREATE INDEX IF NOT EXISTS "BankTransfer_toBankAccountId_idx" ON "BankTransfer"("toBankAccountId");
CREATE INDEX IF NOT EXISTS "BankTransfer_status_idx" ON "BankTransfer"(status);
