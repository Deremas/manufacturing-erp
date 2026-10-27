ALTER TYPE "ProductionStatus" ADD VALUE IF NOT EXISTS 'PENDING_QC';
ALTER TYPE "ProductionStatus" ADD VALUE IF NOT EXISTS 'RELEASED';
ALTER TYPE "ProductionStatus" ADD VALUE IF NOT EXISTS 'REWORK';
ALTER TYPE "ProductionStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "ProductionBatch"
  ADD COLUMN "productionStageId" TEXT,
  ADD COLUMN "qcHoldLocationId" TEXT,
  ADD COLUMN "releaseLocationId" TEXT,
  ADD COLUMN "releasedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "QCHoldRelease" ADD COLUMN "destinationLocationId" TEXT;
ALTER TABLE "QCNonconformity" ADD COLUMN "assetId" TEXT, ADD COLUMN "disposition" TEXT,
  ADD COLUMN "qcTestId" TEXT, ADD COLUMN "rootCause" TEXT;
ALTER TABLE "QCTest" ADD COLUMN "assetId" TEXT, ADD COLUMN "checkedById" TEXT,
  ADD COLUMN "shiftSessionId" TEXT, ADD COLUMN "taskId" TEXT, ADD COLUMN "templateId" TEXT,
  ADD COLUMN "testTypeId" TEXT;
ALTER TABLE "QCTestParameter" ADD COLUMN "templateParameterId" TEXT;

CREATE TABLE "ProductionStage" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0, "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionStage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QCTestType" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "appliesTo" TEXT NOT NULL DEFAULT 'PRODUCTION', "productionStageId" TEXT,
  "requiresBatch" BOOLEAN NOT NULL DEFAULT true, "requiresMachine" BOOLEAN NOT NULL DEFAULT false,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT true, "blocksReleaseOnFail" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QCTestType_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QCTestTemplate" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "testTypeId" TEXT NOT NULL,
  "itemTypeId" TEXT, "itemId" TEXT, "productionStageId" TEXT, "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QCTestTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QCTestTemplateParameter" (
  "id" TEXT NOT NULL, "templateId" TEXT NOT NULL, "parameterName" TEXT NOT NULL,
  "dataType" TEXT NOT NULL DEFAULT 'NUMBER', "minimumValue" DOUBLE PRECISION,
  "maximumValue" DOUBLE PRECISION, "expectedText" TEXT, "unitId" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT true, "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "QCTestTemplateParameter_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProductionStageQCTest" (
  "id" TEXT NOT NULL, "productionStageId" TEXT NOT NULL, "testTypeId" TEXT NOT NULL,
  "templateId" TEXT, "required" BOOLEAN NOT NULL DEFAULT true, "sequence" INTEGER NOT NULL DEFAULT 0,
  "blocksNextStageOnFail" BOOLEAN NOT NULL DEFAULT true, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionStageQCTest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QCTask" (
  "id" TEXT NOT NULL, "taskNo" TEXT NOT NULL, "testTypeId" TEXT NOT NULL, "templateId" TEXT,
  "productionStageId" TEXT, "productionBatchId" TEXT, "shiftSessionId" TEXT, "itemId" TEXT,
  "locationId" TEXT, "assetId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "assignedToId" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT true, "sequence" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "QCTask_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QCTestResult" (
  "id" TEXT NOT NULL, "qcTestId" TEXT NOT NULL, "templateParameterId" TEXT NOT NULL,
  "numericValue" DOUBLE PRECISION, "textValue" TEXT, "booleanValue" BOOLEAN,
  "result" "QCResult" NOT NULL DEFAULT 'PENDING', "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QCTestResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionStage_code_key" ON "ProductionStage"("code");
CREATE UNIQUE INDEX "QCTestType_code_key" ON "QCTestType"("code");
CREATE INDEX "QCTestType_productionStageId_isActive_isArchived_idx" ON "QCTestType"("productionStageId", "isActive", "isArchived");
CREATE UNIQUE INDEX "QCTestTemplate_code_key" ON "QCTestTemplate"("code");
CREATE INDEX "QCTestTemplate_testTypeId_productionStageId_isActive_isArch_idx" ON "QCTestTemplate"("testTypeId", "productionStageId", "isActive", "isArchived");
CREATE INDEX "QCTestTemplate_itemId_itemTypeId_idx" ON "QCTestTemplate"("itemId", "itemTypeId");
CREATE UNIQUE INDEX "QCTestTemplateParameter_templateId_parameterName_key" ON "QCTestTemplateParameter"("templateId", "parameterName");
CREATE UNIQUE INDEX "ProductionStageQCTest_productionStageId_testTypeId_key" ON "ProductionStageQCTest"("productionStageId", "testTypeId");
CREATE UNIQUE INDEX "QCTask_taskNo_key" ON "QCTask"("taskNo");
CREATE INDEX "QCTask_productionBatchId_status_idx" ON "QCTask"("productionBatchId", "status");
CREATE INDEX "QCTask_assignedToId_status_idx" ON "QCTask"("assignedToId", "status");
CREATE UNIQUE INDEX "QCTestResult_qcTestId_templateParameterId_key" ON "QCTestResult"("qcTestId", "templateParameterId");
CREATE INDEX "ProductionBatch_productionStageId_status_idx" ON "ProductionBatch"("productionStageId", "status");
CREATE INDEX "ProductionBatch_qcHoldLocationId_status_idx" ON "ProductionBatch"("qcHoldLocationId", "status");
CREATE INDEX "QCTest_taskId_status_idx" ON "QCTest"("taskId", "status");
CREATE INDEX "QCTest_productionBatchId_result_status_idx" ON "QCTest"("productionBatchId", "result", "status");

ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_qcHoldLocationId_fkey" FOREIGN KEY ("qcHoldLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_releaseLocationId_fkey" FOREIGN KEY ("releaseLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productionStageId_fkey" FOREIGN KEY ("productionStageId") REFERENCES "ProductionStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTestType" ADD CONSTRAINT "QCTestType_productionStageId_fkey" FOREIGN KEY ("productionStageId") REFERENCES "ProductionStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTestTemplate" ADD CONSTRAINT "QCTestTemplate_testTypeId_fkey" FOREIGN KEY ("testTypeId") REFERENCES "QCTestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QCTestTemplate" ADD CONSTRAINT "QCTestTemplate_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "ItemType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTestTemplate" ADD CONSTRAINT "QCTestTemplate_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTestTemplate" ADD CONSTRAINT "QCTestTemplate_productionStageId_fkey" FOREIGN KEY ("productionStageId") REFERENCES "ProductionStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTestTemplateParameter" ADD CONSTRAINT "QCTestTemplateParameter_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCTestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QCTestTemplateParameter" ADD CONSTRAINT "QCTestTemplateParameter_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionStageQCTest" ADD CONSTRAINT "ProductionStageQCTest_productionStageId_fkey" FOREIGN KEY ("productionStageId") REFERENCES "ProductionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionStageQCTest" ADD CONSTRAINT "ProductionStageQCTest_testTypeId_fkey" FOREIGN KEY ("testTypeId") REFERENCES "QCTestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_testTypeId_fkey" FOREIGN KEY ("testTypeId") REFERENCES "QCTestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCTestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_productionStageId_fkey" FOREIGN KEY ("productionStageId") REFERENCES "ProductionStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTask" ADD CONSTRAINT "QCTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "QCTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_testTypeId_fkey" FOREIGN KEY ("testTypeId") REFERENCES "QCTestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCTestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTestParameter" ADD CONSTRAINT "QCTestParameter_templateParameterId_fkey" FOREIGN KEY ("templateParameterId") REFERENCES "QCTestTemplateParameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCTestResult" ADD CONSTRAINT "QCTestResult_qcTestId_fkey" FOREIGN KEY ("qcTestId") REFERENCES "QCTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QCTestResult" ADD CONSTRAINT "QCTestResult_templateParameterId_fkey" FOREIGN KEY ("templateParameterId") REFERENCES "QCTestTemplateParameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QCHoldRelease" ADD CONSTRAINT "QCHoldRelease_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCNonconformity" ADD CONSTRAINT "QCNonconformity_qcTestId_fkey" FOREIGN KEY ("qcTestId") REFERENCES "QCTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QCNonconformity" ADD CONSTRAINT "QCNonconformity_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
