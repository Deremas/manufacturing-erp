ALTER TABLE "QCHoldRelease"
  ADD COLUMN IF NOT EXISTS "holdCategory" TEXT NOT NULL DEFAULT 'GENERAL';

CREATE INDEX IF NOT EXISTS "QCHoldRelease_productionBatchId_holdCategory_idx"
  ON "QCHoldRelease"("productionBatchId", "holdCategory");
