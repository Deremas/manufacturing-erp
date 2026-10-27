ALTER TABLE "QCNonconformity"
  ADD COLUMN IF NOT EXISTS "reinspectionTaskId" TEXT,
  ADD COLUMN IF NOT EXISTS "reinspectionTestId" TEXT,
  ADD COLUMN IF NOT EXISTS "reinspectionDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reinspectionResult" TEXT;

CREATE INDEX IF NOT EXISTS "QCNonconformity_reinspectionTaskId_idx"
  ON "QCNonconformity"("reinspectionTaskId");

CREATE INDEX IF NOT EXISTS "QCNonconformity_reinspectionTestId_idx"
  ON "QCNonconformity"("reinspectionTestId");

DO $$ BEGIN
  ALTER TABLE "QCNonconformity"
    ADD CONSTRAINT "QCNonconformity_reinspectionTaskId_fkey"
    FOREIGN KEY ("reinspectionTaskId") REFERENCES "QCTask"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "QCNonconformity"
    ADD CONSTRAINT "QCNonconformity_reinspectionTestId_fkey"
    FOREIGN KEY ("reinspectionTestId") REFERENCES "QCTest"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
