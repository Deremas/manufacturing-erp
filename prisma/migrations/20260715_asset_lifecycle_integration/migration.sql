-- Additive asset lifecycle migration. Existing category and machine text columns are retained for backfill compatibility.
DO $$ BEGIN
  CREATE TYPE "AssetClass" AS ENUM ('PRODUCTION_MACHINE', 'FACILITY_EQUIPMENT', 'LAB_EQUIPMENT', 'VEHICLE', 'TOOL', 'MOLD', 'OFFICE_EQUIPMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'IN_USE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AssetAssignmentTarget" AS ENUM ('USER', 'DEPARTMENT', 'LOCATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AssetAssignmentStatus" AS ENUM ('ACTIVE', 'RETURNED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AssetTransferStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHECKED', 'APPROVED', 'POSTED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AssetCategory" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "assetTypeId" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetCategory_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assetClass" "AssetClass" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assetCategoryId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "manufactureYear" INTEGER;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "commissioningDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "grnId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "meterUnit" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "isProductionAsset" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "isMaintenanceRequired" BOOLEAN NOT NULL DEFAULT true;
DO $$ BEGIN
  ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assetCategoryId_fkey" FOREIGN KEY ("assetCategoryId") REFERENCES "AssetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AssetAssignment" (
  "id" TEXT PRIMARY KEY,
  "assignmentNo" TEXT NOT NULL UNIQUE,
  "assetId" TEXT NOT NULL,
  "assignedToType" "AssetAssignmentTarget" NOT NULL,
  "assignedToUserId" TEXT,
  "assignedToDepartmentId" TEXT,
  "assignedToLocationId" TEXT,
  "assignedDate" TIMESTAMP(3) NOT NULL,
  "expectedReturnDate" TIMESTAMP(3),
  "returnedDate" TIMESTAMP(3),
  "conditionAtIssue" TEXT NOT NULL,
  "conditionAtReturn" TEXT,
  "status" "AssetAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "remarks" TEXT,
  "assignedById" TEXT NOT NULL,
  "returnedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AssetTransfer" (
  "id" TEXT PRIMARY KEY,
  "transferNo" TEXT NOT NULL UNIQUE,
  "assetId" TEXT NOT NULL,
  "fromLocationId" TEXT NOT NULL,
  "toLocationId" TEXT NOT NULL,
  "transferDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "AssetTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "checkedById" TEXT,
  "approvedById" TEXT,
  "postedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "remarks" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AssetMeterReading" (
  "id" TEXT PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "readingDate" TIMESTAMP(3) NOT NULL,
  "readingType" TEXT NOT NULL,
  "readingValue" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "source" TEXT,
  "recordedById" TEXT NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetMeterReading_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AssetHistory" (
  "id" TEXT PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "oldStatus" "AssetStatus",
  "newStatus" "AssetStatus",
  "oldLocationId" TEXT,
  "newLocationId" TEXT,
  "performedById" TEXT NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "ProductionDowntime" ADD COLUMN IF NOT EXISTS "assetId" TEXT;
DO $$ BEGIN
  ALTER TABLE "ProductionDowntime" ADD CONSTRAINT "ProductionDowntime_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "AssetCategory_assetTypeId_isActive_isArchived_idx" ON "AssetCategory"("assetTypeId", "isActive", "isArchived");
CREATE INDEX IF NOT EXISTS "Asset_assetClass_status_isActive_isArchived_idx" ON "Asset"("assetClass", "status", "isActive", "isArchived");
CREATE INDEX IF NOT EXISTS "Asset_locationId_departmentId_idx" ON "Asset"("locationId", "departmentId");
CREATE INDEX IF NOT EXISTS "Asset_assetCategoryId_idx" ON "Asset"("assetCategoryId");
CREATE INDEX IF NOT EXISTS "AssetAssignment_assetId_status_idx" ON "AssetAssignment"("assetId", "status");
CREATE INDEX IF NOT EXISTS "AssetAssignment_assignedToUserId_status_idx" ON "AssetAssignment"("assignedToUserId", "status");
CREATE INDEX IF NOT EXISTS "AssetAssignment_assignedToDepartmentId_status_idx" ON "AssetAssignment"("assignedToDepartmentId", "status");
CREATE INDEX IF NOT EXISTS "AssetAssignment_assignedToLocationId_status_idx" ON "AssetAssignment"("assignedToLocationId", "status");
CREATE INDEX IF NOT EXISTS "AssetTransfer_assetId_status_idx" ON "AssetTransfer"("assetId", "status");
CREATE INDEX IF NOT EXISTS "AssetTransfer_fromLocationId_toLocationId_transferDate_idx" ON "AssetTransfer"("fromLocationId", "toLocationId", "transferDate");
CREATE INDEX IF NOT EXISTS "AssetMeterReading_assetId_readingDate_idx" ON "AssetMeterReading"("assetId", "readingDate");
CREATE INDEX IF NOT EXISTS "AssetHistory_assetId_eventDate_idx" ON "AssetHistory"("assetId", "eventDate");
CREATE INDEX IF NOT EXISTS "AssetHistory_referenceType_referenceId_idx" ON "AssetHistory"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "ProductionDowntime_assetId_startTime_idx" ON "ProductionDowntime"("assetId", "startTime");
