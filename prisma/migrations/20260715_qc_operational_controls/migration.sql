ALTER TABLE "Location"
  ADD COLUMN IF NOT EXISTS "isQcHoldLocation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isFinishedGoodsLocation" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "StockMovement"
  ADD COLUMN IF NOT EXISTS "batchNo" TEXT,
  ADD COLUMN IF NOT EXISTS "lotNo" TEXT,
  ADD COLUMN IF NOT EXISTS "serialNo" TEXT,
  ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);

ALTER TABLE "MaintenanceTicket"
  ADD COLUMN IF NOT EXISTS "qcTestId" TEXT,
  ADD COLUMN IF NOT EXISTS "productionBatchId" TEXT,
  ADD COLUMN IF NOT EXISTS "shiftSessionId" TEXT;

ALTER TABLE "QCTestTemplate"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "parentTemplateId" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

ALTER TABLE "QCTask"
  ADD COLUMN IF NOT EXISTS "assignedById" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

ALTER TABLE "QCTest"
  ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "templateVersion" INTEGER;

ALTER TABLE "QCHoldRelease"
  ADD COLUMN IF NOT EXISTS "releasedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scrappedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reworkedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "QCNonconformity"
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reinspectionDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reinspectionTestId" TEXT,
  ADD COLUMN IF NOT EXISTS "dispositionStatus" TEXT;

ALTER TYPE "HoldStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_DISPOSED';
ALTER TYPE "HoldStatus" ADD VALUE IF NOT EXISTS 'REWORKED';

CREATE TABLE IF NOT EXISTS "ProductionBatchStage" (
  "id" TEXT NOT NULL,
  "productionBatchId" TEXT NOT NULL,
  "productionStageId" TEXT NOT NULL,
  "machineId" TEXT,
  "operatorId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "outputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wastageQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "holdReason" TEXT,
  "reworkReason" TEXT,
  "cancelledReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionBatchStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QCDisposition" (
  "id" TEXT NOT NULL,
  "dispositionNo" TEXT NOT NULL,
  "holdReleaseId" TEXT NOT NULL,
  "productionBatchId" TEXT,
  "itemId" TEXT NOT NULL,
  "fromLocationId" TEXT NOT NULL,
  "toLocationId" TEXT,
  "dispositionType" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "reason" TEXT NOT NULL,
  "stockMovementId" TEXT,
  "performedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCDisposition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QCDisposition_dispositionNo_key" ON "QCDisposition"("dispositionNo");
CREATE INDEX IF NOT EXISTS "ProductionBatchStage_productionBatchId_status_idx" ON "ProductionBatchStage"("productionBatchId", "status");
CREATE INDEX IF NOT EXISTS "ProductionBatchStage_machineId_status_idx" ON "ProductionBatchStage"("machineId", "status");
CREATE INDEX IF NOT EXISTS "QCDisposition_holdReleaseId_dispositionType_idx" ON "QCDisposition"("holdReleaseId", "dispositionType");
CREATE INDEX IF NOT EXISTS "QCDisposition_productionBatchId_createdAt_idx" ON "QCDisposition"("productionBatchId", "createdAt");
CREATE INDEX IF NOT EXISTS "MaintenanceTicket_qcTestId_idx" ON "MaintenanceTicket"("qcTestId");
CREATE INDEX IF NOT EXISTS "MaintenanceTicket_productionBatchId_status_idx" ON "MaintenanceTicket"("productionBatchId", "status");

DO $$ BEGIN
  ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_qcTestId_fkey" FOREIGN KEY ("qcTestId") REFERENCES "QCTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QCTestTemplate" ADD CONSTRAINT "QCTestTemplate_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "QCTestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchStage" ADD CONSTRAINT "ProductionBatchStage_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchStage" ADD CONSTRAINT "ProductionBatchStage_productionStageId_fkey" FOREIGN KEY ("productionStageId") REFERENCES "ProductionStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionBatchStage" ADD CONSTRAINT "ProductionBatchStage_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QCDisposition" ADD CONSTRAINT "QCDisposition_holdReleaseId_fkey" FOREIGN KEY ("holdReleaseId") REFERENCES "QCHoldRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QCDisposition" ADD CONSTRAINT "QCDisposition_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QCDisposition" ADD CONSTRAINT "QCDisposition_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QCDisposition" ADD CONSTRAINT "QCDisposition_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QCDisposition" ADD CONSTRAINT "QCDisposition_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

WITH permissions("module", "action", "label") AS (
  VALUES
    ('qc', 'setup.view', 'View QC setup'),
    ('qc', 'setup.manage', 'Manage QC setup'),
    ('qc', 'task.view', 'View QC tasks'),
    ('qc', 'task.assign', 'Assign QC tasks'),
    ('qc', 'task.start', 'Start QC tasks'),
    ('qc', 'test.create', 'Create QC tests'),
    ('qc', 'test.check', 'Check QC tests'),
    ('qc', 'test.approve', 'Approve QC tests'),
    ('qc', 'hold.create', 'Create QC holds'),
    ('qc', 'release.approve', 'Approve QC release'),
    ('qc', 'reject.approve', 'Approve QC rejection'),
    ('qc', 'rework.approve', 'Approve QC rework'),
    ('qc', 'scrap.approve', 'Approve QC scrap'),
    ('qc', 'nc.manage', 'Manage QC nonconformities'),
    ('production', 'stage.manage', 'Manage production batch stages')
)
INSERT INTO "Permission" ("id", "module", "action", "label", "isArchived")
SELECT gen_random_uuid()::text, p."module", p."action", p."label", false
FROM permissions p
WHERE NOT EXISTS (
  SELECT 1
  FROM "Permission" existing
  WHERE existing."module" = p."module"
    AND existing."action" = p."action"
    AND existing."isArchived" = false
);
