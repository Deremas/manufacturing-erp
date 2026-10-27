ALTER TABLE "ProductionDowntime" ADD COLUMN IF NOT EXISTS "productionBatchStageId" TEXT;

CREATE INDEX IF NOT EXISTS "ProductionDowntime_productionBatchStageId_startTime_idx"
  ON "ProductionDowntime"("productionBatchStageId", "startTime");

DO $$ BEGIN
  ALTER TABLE "ProductionDowntime"
    ADD CONSTRAINT "ProductionDowntime_productionBatchStageId_fkey"
    FOREIGN KEY ("productionBatchStageId") REFERENCES "ProductionBatchStage"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
