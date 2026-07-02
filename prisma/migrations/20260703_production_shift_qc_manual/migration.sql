DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductionStatus') THEN
    CREATE TYPE "ProductionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'POSTED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BOMStatus') THEN
    CREATE TYPE "BOMStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QCResult') THEN
    CREATE TYPE "QCResult" AS ENUM ('PASSED', 'FAILED', 'REJECTED', 'PENDING');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HoldStatus') THEN
    CREATE TYPE "HoldStatus" AS ENUM ('ON_HOLD', 'RELEASED', 'REJECTED', 'SCRAPPED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DowntimeReason') THEN
    CREATE TYPE "DowntimeReason" AS ENUM ('MACHINE_BREAKDOWN', 'POWER_INTERRUPTION', 'MATERIAL_SHORTAGE', 'QUALITY_ISSUE', 'OPERATOR_DELAY', 'MAINTENANCE', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CostAllocationMethod') THEN
    CREATE TYPE "CostAllocationMethod" AS ENUM ('FIXED_PER_SHIFT', 'COST_PER_UNIT', 'COST_PER_HOUR');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BOM" (
  id TEXT PRIMARY KEY,
  "bomNo" TEXT NOT NULL UNIQUE,
  "bomName" TEXT NOT NULL,
  "finishedGoodId" TEXT NOT NULL REFERENCES "Item"(id) ON DELETE RESTRICT,
  "outputQty" DOUBLE PRECISION NOT NULL,
  "uomId" TEXT REFERENCES "Unit"(id) ON DELETE SET NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  status "BOMStatus" NOT NULL DEFAULT 'ACTIVE',
  description TEXT,
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "updatedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BOMItem" (
  id TEXT PRIMARY KEY,
  "bomId" TEXT NOT NULL REFERENCES "BOM"(id) ON DELETE CASCADE,
  "componentItemId" TEXT NOT NULL REFERENCES "Item"(id) ON DELETE RESTRICT,
  "uomId" TEXT REFERENCES "Unit"(id) ON DELETE SET NULL,
  quantity DOUBLE PRECISION NOT NULL,
  "wastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT true,
  remarks TEXT,
  CONSTRAINT "BOMItem_bom_component_unique" UNIQUE ("bomId", "componentItemId")
);

CREATE TABLE IF NOT EXISTS "OverheadCostSetting" (
  id TEXT PRIMARY KEY,
  "categoryName" TEXT NOT NULL,
  "allocationMethod" "CostAllocationMethod" NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  "effectiveFrom" TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  description TEXT,
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "updatedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ShiftSession" (
  id TEXT PRIMARY KEY,
  "sessionNo" TEXT NOT NULL UNIQUE,
  "productionDate" TIMESTAMP NOT NULL,
  "shiftCode" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE RESTRICT,
  status "ProductionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "startedAt" TIMESTAMP,
  "endedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "endedAt" TIMESTAMP,
  remarks TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ShiftAttendance" (
  id TEXT PRIMARY KEY,
  "shiftSessionId" TEXT NOT NULL REFERENCES "ShiftSession"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  role TEXT,
  present BOOLEAN NOT NULL DEFAULT true,
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS "ProductionBatch" (
  id TEXT PRIMARY KEY,
  "batchNo" TEXT NOT NULL UNIQUE,
  "shiftSessionId" TEXT NOT NULL REFERENCES "ShiftSession"(id) ON DELETE RESTRICT,
  "bomId" TEXT REFERENCES "BOM"(id) ON DELETE SET NULL,
  "finishedGoodId" TEXT NOT NULL REFERENCES "Item"(id) ON DELETE RESTRICT,
  "locationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE RESTRICT,
  "producedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "acceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wastageQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  status "ProductionStatus" NOT NULL DEFAULT 'DRAFT',
  "postedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "postedAt" TIMESTAMP,
  remarks TEXT,
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "updatedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProductionMaterialIssue" (
  id TEXT PRIMARY KEY,
  "issueNo" TEXT NOT NULL UNIQUE,
  "shiftSessionId" TEXT NOT NULL REFERENCES "ShiftSession"(id) ON DELETE RESTRICT,
  "productionBatchId" TEXT REFERENCES "ProductionBatch"(id) ON DELETE SET NULL,
  "storeLocationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE RESTRICT,
  "productionLocationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE RESTRICT,
  status "ProductionStatus" NOT NULL DEFAULT 'DRAFT',
  "postedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "postedAt" TIMESTAMP,
  remarks TEXT,
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProductionMaterialIssueItem" (
  id TEXT PRIMARY KEY,
  "issueId" TEXT NOT NULL REFERENCES "ProductionMaterialIssue"(id) ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "Item"(id) ON DELETE RESTRICT,
  "uomId" TEXT REFERENCES "Unit"(id) ON DELETE SET NULL,
  "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "issuedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS "ProductionMaterialReturn" (
  id TEXT PRIMARY KEY,
  "returnNo" TEXT NOT NULL UNIQUE,
  "shiftSessionId" TEXT NOT NULL REFERENCES "ShiftSession"(id) ON DELETE RESTRICT,
  "productionBatchId" TEXT REFERENCES "ProductionBatch"(id) ON DELETE SET NULL,
  "fromLocationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE RESTRICT,
  "toStoreLocationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE RESTRICT,
  status "ProductionStatus" NOT NULL DEFAULT 'DRAFT',
  "postedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "postedAt" TIMESTAMP,
  remarks TEXT,
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProductionMaterialReturnItem" (
  id TEXT PRIMARY KEY,
  "returnId" TEXT NOT NULL REFERENCES "ProductionMaterialReturn"(id) ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "Item"(id) ON DELETE RESTRICT,
  "uomId" TEXT REFERENCES "Unit"(id) ON DELETE SET NULL,
  "returnedQty" DOUBLE PRECISION NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Good',
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS "ProductionDowntime" (
  id TEXT PRIMARY KEY,
  "shiftSessionId" TEXT NOT NULL REFERENCES "ShiftSession"(id) ON DELETE CASCADE,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  reason "DowntimeReason" NOT NULL,
  machine TEXT,
  remarks TEXT,
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "QCTest" (
  id TEXT PRIMARY KEY,
  "testNo" TEXT NOT NULL UNIQUE,
  "testType" TEXT NOT NULL,
  "productionBatchId" TEXT REFERENCES "ProductionBatch"(id) ON DELETE SET NULL,
  "itemId" TEXT REFERENCES "Item"(id) ON DELETE SET NULL,
  "locationId" TEXT REFERENCES "Location"(id) ON DELETE SET NULL,
  "sampleDate" TIMESTAMP NOT NULL,
  result "QCResult" NOT NULL DEFAULT 'PENDING',
  status TEXT NOT NULL DEFAULT 'PENDING',
  "testedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "approvedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  remarks TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "QCTestParameter" (
  id TEXT PRIMARY KEY,
  "qcTestId" TEXT NOT NULL REFERENCES "QCTest"(id) ON DELETE CASCADE,
  "parameterName" TEXT NOT NULL,
  "expectedValue" TEXT,
  "actualValue" TEXT,
  unit TEXT,
  result "QCResult" NOT NULL DEFAULT 'PENDING',
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS "QCHoldRelease" (
  id TEXT PRIMARY KEY,
  "holdNo" TEXT NOT NULL UNIQUE,
  "productionBatchId" TEXT REFERENCES "ProductionBatch"(id) ON DELETE SET NULL,
  "itemId" TEXT NOT NULL REFERENCES "Item"(id) ON DELETE RESTRICT,
  "locationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE RESTRICT,
  quantity DOUBLE PRECISION NOT NULL,
  "holdReason" TEXT NOT NULL,
  status "HoldStatus" NOT NULL DEFAULT 'ON_HOLD',
  "releasedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "releasedAt" TIMESTAMP,
  remarks TEXT,
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "QCNonconformity" (
  id TEXT PRIMARY KEY,
  "ncNo" TEXT NOT NULL UNIQUE,
  "productionBatchId" TEXT REFERENCES "ProductionBatch"(id) ON DELETE SET NULL,
  "itemId" TEXT REFERENCES "Item"(id) ON DELETE SET NULL,
  "locationId" TEXT REFERENCES "Location"(id) ON DELETE SET NULL,
  "issueDescription" TEXT NOT NULL,
  severity TEXT NOT NULL,
  "correctiveAction" TEXT,
  "responsiblePersonId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "reinspectionResult" TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  "createdById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "closedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProductionCostRecord" (
  id TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL UNIQUE REFERENCES "ProductionBatch"(id) ON DELETE CASCADE,
  "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wastageCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "BOM_finishedGoodId_idx" ON "BOM"("finishedGoodId");
CREATE INDEX IF NOT EXISTS "ShiftSession_date_shift_location_idx" ON "ShiftSession"("productionDate", "shiftCode", "locationId");
CREATE INDEX IF NOT EXISTS "ProductionBatch_shiftSessionId_idx" ON "ProductionBatch"("shiftSessionId");
CREATE INDEX IF NOT EXISTS "ProductionMaterialIssue_shiftSessionId_idx" ON "ProductionMaterialIssue"("shiftSessionId");
CREATE INDEX IF NOT EXISTS "ProductionMaterialReturn_shiftSessionId_idx" ON "ProductionMaterialReturn"("shiftSessionId");
CREATE INDEX IF NOT EXISTS "QCTest_sampleDate_idx" ON "QCTest"("sampleDate");
CREATE INDEX IF NOT EXISTS "QCHoldRelease_status_idx" ON "QCHoldRelease"(status);

INSERT INTO "DocumentNumbering" (
  id, prefix, description, "prefixFormat", separator, "yearFormat", "monthFormat", "dayFormat",
  "sequenceLength", "currentSequence", "isActive", "isArchived"
)
VALUES
  ('docnum-bom', 'BOM', 'Bill of Materials', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-cst', 'CST', 'Production Cost Setting', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-ses', 'SES', 'Shift Session', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-pmi', 'PMI', 'Production Material Issue', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-pmr', 'PMR', 'Production Material Return', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-bat', 'BAT', 'Production Batch', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-qct', 'QCT', 'QC Test', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-qch', 'QCH', 'QC Hold', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-nc', 'NC', 'QC Nonconformity', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false)
ON CONFLICT ("prefix") DO NOTHING;

INSERT INTO "ModuleSetting" (id, module, key, value, "isArchived", "createdAt", "updatedAt")
VALUES
  ('shift-definitions', 'production', 'shift.definitions', '[{"code":"SHIFT_A","name":"Shift A","startTime":"06:00","endTime":"14:00"},{"code":"SHIFT_B","name":"Shift B","startTime":"14:00","endTime":"22:00"},{"code":"SHIFT_C","name":"Shift C","startTime":"22:00","endTime":"06:00"}]', false, NOW(), NOW()),
  ('qc-water-sample-points', 'qc', 'waterTest.samplePoints', '["Raw Water","Treatment Outlet","Filler Line","Finished Goods Store"]', false, NOW(), NOW()),
  ('qc-microbial-sample-types', 'qc', 'microbial.sampleTypes', '["Finished Product","Process Water","Packaging","Surface Swab"]', false, NOW(), NOW()),
  ('qc-microbial-criteria', 'qc', 'microbial.criteria', '["TPC","Yeast and Mold","Coliform","E. coli"]', false, NOW(), NOW()),
  ('qc-microbial-methods', 'qc', 'microbial.methods', '["Plate Count","Membrane Filtration","Rapid Test"]', false, NOW(), NOW()),
  ('qc-microbial-media', 'qc', 'microbial.mediaTypes', '["PCA","MacConkey","PDA","VRBA"]', false, NOW(), NOW()),
  ('qc-production-lines', 'qc', 'production.lines', '["Line 1","Line 2","Line 3"]', false, NOW(), NOW())
ON CONFLICT (module, key) DO NOTHING;
