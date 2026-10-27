ALTER TABLE "ShiftSession"
ADD COLUMN "primaryMachineId" TEXT;

ALTER TABLE "ProductionBatch"
ADD COLUMN "machineId" TEXT;

ALTER TABLE "ProductionDowntime"
ADD COLUMN "productionBatchId" TEXT,
ADD COLUMN "locationId" TEXT,
ADD COLUMN "maintenanceRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "restoredAt" TIMESTAMP(3),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CLOSED',
ADD COLUMN "closedById" TEXT;

UPDATE "ProductionDowntime" pd
SET "locationId" = ss."locationId"
FROM "ShiftSession" ss
WHERE ss.id = pd."shiftSessionId"
  AND pd."locationId" IS NULL;

ALTER TABLE "ProductionDowntime"
ALTER COLUMN "locationId" SET NOT NULL;

CREATE TABLE "ProductionMachineAssignment" (
  "id" TEXT NOT NULL,
  "shiftSessionId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  "assignedById" TEXT NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionMachineAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionMachineAssignment_shiftSessionId_assetId_key"
ON "ProductionMachineAssignment"("shiftSessionId", "assetId");

CREATE INDEX "ProductionMachineAssignment_assetId_releasedAt_idx"
ON "ProductionMachineAssignment"("assetId", "releasedAt");

CREATE INDEX "ProductionBatch_machineId_createdAt_idx"
ON "ProductionBatch"("machineId", "createdAt");

CREATE INDEX "ProductionDowntime_productionBatchId_startTime_idx"
ON "ProductionDowntime"("productionBatchId", "startTime");

CREATE INDEX "ProductionDowntime_locationId_status_idx"
ON "ProductionDowntime"("locationId", "status");

ALTER TABLE "ShiftSession"
ADD CONSTRAINT "ShiftSession_primaryMachineId_fkey"
FOREIGN KEY ("primaryMachineId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductionBatch"
ADD CONSTRAINT "ProductionBatch_machineId_fkey"
FOREIGN KEY ("machineId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductionDowntime"
ADD CONSTRAINT "ProductionDowntime_productionBatchId_fkey"
FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductionDowntime"
ADD CONSTRAINT "ProductionDowntime_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionMachineAssignment"
ADD CONSTRAINT "ProductionMachineAssignment_shiftSessionId_fkey"
FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductionMachineAssignment"
ADD CONSTRAINT "ProductionMachineAssignment_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
