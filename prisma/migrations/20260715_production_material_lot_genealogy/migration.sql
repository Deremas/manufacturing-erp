ALTER TABLE "ProductionMaterialIssueItem" ADD COLUMN IF NOT EXISTS "sourceLotNo" TEXT;
ALTER TABLE "ProductionMaterialIssueItem" ADD COLUMN IF NOT EXISTS "supplierBatchNo" TEXT;
ALTER TABLE "ProductionMaterialIssueItem" ADD COLUMN IF NOT EXISTS "serialNo" TEXT;
ALTER TABLE "ProductionMaterialIssueItem" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ProductionMaterialIssueItem_itemId_sourceLotNo_idx"
  ON "ProductionMaterialIssueItem"("itemId", "sourceLotNo");
CREATE INDEX IF NOT EXISTS "ProductionMaterialIssueItem_supplierBatchNo_idx"
  ON "ProductionMaterialIssueItem"("supplierBatchNo");
CREATE INDEX IF NOT EXISTS "ProductionMaterialIssueItem_serialNo_idx"
  ON "ProductionMaterialIssueItem"("serialNo");
