ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "expectedProductionRatePerHour" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "DowntimeCategory" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "isMaintenanceRelated" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DowntimeCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DowntimeCategory_code_key" ON "DowntimeCategory"("code");

CREATE TABLE IF NOT EXISTS "DowntimeReasonConfig" (
  "id" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "requiresMaintenance" BOOLEAN NOT NULL DEFAULT false, "affectsProduction" BOOLEAN NOT NULL DEFAULT true, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DowntimeReasonConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DowntimeReasonConfig_code_key" ON "DowntimeReasonConfig"("code");
CREATE INDEX IF NOT EXISTS "DowntimeReasonConfig_categoryId_isActive_idx" ON "DowntimeReasonConfig"("categoryId", "isActive");
DO $$ BEGIN ALTER TABLE "DowntimeReasonConfig" ADD CONSTRAINT "DowntimeReasonConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DowntimeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "ProductionDowntime"
  ADD COLUMN IF NOT EXISTS "downtimeNo" TEXT,
  ADD COLUMN IF NOT EXISTS "reasonId" TEXT,
  ADD COLUMN IF NOT EXISTS "failureCause" TEXT,
  ADD COLUMN IF NOT EXISTS "operatorId" TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS "plannedProductionRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "estimatedLostQty" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "actualLostQty" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "maintenanceTicketId" TEXT,
  ADD COLUMN IF NOT EXISTS "workOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProductionDowntime" ALTER COLUMN "endTime" DROP NOT NULL;
ALTER TABLE "ProductionDowntime" ALTER COLUMN "durationMinutes" SET DEFAULT 0;
ALTER TABLE "ProductionDowntime" ALTER COLUMN reason DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionDowntime_downtimeNo_key" ON "ProductionDowntime"("downtimeNo");
CREATE INDEX IF NOT EXISTS "ProductionDowntime_reasonId_startTime_idx" ON "ProductionDowntime"("reasonId", "startTime");
DO $$ BEGIN ALTER TABLE "ProductionDowntime" ADD CONSTRAINT "ProductionDowntime_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "DowntimeReasonConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "MaintenanceWorkOrder"
  ADD COLUMN IF NOT EXISTS "productionDowntimeId" TEXT,
  ADD COLUMN IF NOT EXISTS "failureModeId" TEXT,
  ADD COLUMN IF NOT EXISTS "rootCauseId" TEXT,
  ADD COLUMN IF NOT EXISTS "immediateAction" TEXT,
  ADD COLUMN IF NOT EXISTS "permanentAction" TEXT,
  ADD COLUMN IF NOT EXISTS recommendation TEXT;

ALTER TABLE "MaintenanceWorkOrderPart"
  ADD COLUMN IF NOT EXISTS "approvedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "damageCondition" TEXT,
  ADD COLUMN IF NOT EXISTS "stockReturnId" TEXT,
  ADD COLUMN IF NOT EXISTS "damagedMovementId" TEXT,
  ADD COLUMN IF NOT EXISTS "lotNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "MaintenanceWorkLog" (
  "id" TEXT NOT NULL, "workOrderId" TEXT NOT NULL, "technicianId" TEXT NOT NULL, "eventType" TEXT NOT NULL,
  "eventDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, notes TEXT, "laborMinutes" INTEGER,
  "hourlyRate" DOUBLE PRECISION, "laborCost" DOUBLE PRECISION, "sessionId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceWorkLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MaintenanceWorkLog_workOrderId_eventDateTime_idx" ON "MaintenanceWorkLog"("workOrderId", "eventDateTime");
CREATE INDEX IF NOT EXISTS "MaintenanceWorkLog_technicianId_eventDateTime_idx" ON "MaintenanceWorkLog"("technicianId", "eventDateTime");
CREATE INDEX IF NOT EXISTS "MaintenanceWorkLog_sessionId_idx" ON "MaintenanceWorkLog"("sessionId");

CREATE TABLE IF NOT EXISTS "MaintenanceWorkSession" (
  "id" TEXT NOT NULL, "workOrderId" TEXT NOT NULL, "technicianId" TEXT NOT NULL, "checkInAt" TIMESTAMP(3) NOT NULL,
  "checkOutAt" TIMESTAMP(3), "pausedAt" TIMESTAMP(3), "pauseMinutes" INTEGER NOT NULL DEFAULT 0, "activeMinutes" INTEGER,
  "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0, "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceWorkSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MaintenanceWorkSession_workOrderId_status_idx" ON "MaintenanceWorkSession"("workOrderId", status);
CREATE INDEX IF NOT EXISTS "MaintenanceWorkSession_technicianId_status_idx" ON "MaintenanceWorkSession"("technicianId", status);

CREATE TABLE IF NOT EXISTS "MaintenanceWorkOrderTest" (
  "id" TEXT NOT NULL, "workOrderId" TEXT NOT NULL, "testDate" TIMESTAMP(3) NOT NULL, "testedById" TEXT NOT NULL,
  "supervisorId" TEXT, "testMethod" TEXT NOT NULL, "machineRunMinutes" INTEGER NOT NULL DEFAULT 0, result TEXT NOT NULL,
  observations TEXT, "productionTrialBatchId" TEXT, "supervisorApprovedAt" TIMESTAMP(3), remarks TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceWorkOrderTest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MaintenanceWorkOrderTest_workOrderId_testDate_idx" ON "MaintenanceWorkOrderTest"("workOrderId", "testDate");

CREATE TABLE IF NOT EXISTS "FailureMode" ("id" TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, "assetTypeId" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FailureMode_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "FailureMode_code_key" ON "FailureMode"(code);
CREATE INDEX IF NOT EXISTS "FailureMode_assetTypeId_isActive_idx" ON "FailureMode"("assetTypeId", "isActive");
CREATE TABLE IF NOT EXISTS "RootCause" ("id" TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, category TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RootCause_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "RootCause_code_key" ON "RootCause"(code);

CREATE TABLE IF NOT EXISTS "MaintenanceSpareTrace" (
  "id" TEXT NOT NULL, "workOrderId" TEXT NOT NULL, "workOrderPartId" TEXT NOT NULL, "spareRequestId" TEXT,
  "movementType" TEXT NOT NULL, "stockMovementId" TEXT, quantity DOUBLE PRECISION NOT NULL, "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "directIssue" BOOLEAN NOT NULL DEFAULT false, "directIssueReason" TEXT, "directIssueApprovedById" TEXT,
  "damageReason" TEXT, condition TEXT, "lotNumber" TEXT, "expiryDate" TIMESTAMP(3), "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MaintenanceSpareTrace_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MaintenanceSpareTrace_workOrderId_createdAt_idx" ON "MaintenanceSpareTrace"("workOrderId", "createdAt");
CREATE INDEX IF NOT EXISTS "MaintenanceSpareTrace_workOrderPartId_movementType_idx" ON "MaintenanceSpareTrace"("workOrderPartId", "movementType");
CREATE INDEX IF NOT EXISTS "MaintenanceSpareTrace_directIssue_createdAt_idx" ON "MaintenanceSpareTrace"("directIssue", "createdAt");
CREATE INDEX IF NOT EXISTS "MaintenanceWorkOrder_productionDowntimeId_idx" ON "MaintenanceWorkOrder"("productionDowntimeId");
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceWorkSession_one_active_technician_key" ON "MaintenanceWorkSession"("technicianId") WHERE status IN ('ACTIVE','PAUSED');
DO $$ BEGIN ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_productionDowntimeId_fkey" FOREIGN KEY ("productionDowntimeId") REFERENCES "ProductionDowntime"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceWorkLog" ADD CONSTRAINT "MaintenanceWorkLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "MaintenanceWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceWorkLog" ADD CONSTRAINT "MaintenanceWorkLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceWorkSession" ADD CONSTRAINT "MaintenanceWorkSession_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "MaintenanceWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceWorkSession" ADD CONSTRAINT "MaintenanceWorkSession_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceWorkOrderTest" ADD CONSTRAINT "MaintenanceWorkOrderTest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "MaintenanceWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceSpareTrace" ADD CONSTRAINT "MaintenanceSpareTrace_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "MaintenanceWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceSpareTrace" ADD CONSTRAINT "MaintenanceSpareTrace_workOrderPartId_fkey" FOREIGN KEY ("workOrderPartId") REFERENCES "MaintenanceWorkOrderPart"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "DowntimeCategory" (id, code, name, "isMaintenanceRelated", "isActive", "createdAt", "updatedAt") VALUES
  ('dtcat-equipment','EQUIPMENT','Equipment Failure',true,true,NOW(),NOW()), ('dtcat-utilities','UTILITIES','Utilities',false,true,NOW(),NOW()),
  ('dtcat-process','PROCESS','Process / Material',false,true,NOW(),NOW()), ('dtcat-planned','PLANNED','Planned Activity',false,true,NOW(),NOW()),
  ('dtcat-people','PEOPLE','People / Operator',false,true,NOW(),NOW()), ('dtcat-other','OTHER','Other',false,true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;
INSERT INTO "DowntimeReasonConfig" (id, "categoryId", code, name, "requiresMaintenance", "affectsProduction", "isActive", "createdAt", "updatedAt") VALUES
  ('dtr-mechanical','dtcat-equipment','MECHANICAL_FAILURE','Mechanical Failure',true,true,true,NOW(),NOW()),
  ('dtr-electrical','dtcat-equipment','ELECTRICAL_FAILURE','Electrical Failure',true,true,true,NOW(),NOW()),
  ('dtr-pneumatic','dtcat-equipment','PNEUMATIC_FAILURE','Pneumatic Failure',true,true,true,NOW(),NOW()),
  ('dtr-hydraulic','dtcat-equipment','HYDRAULIC_FAILURE','Hydraulic Failure',true,true,true,NOW(),NOW()),
  ('dtr-power','dtcat-utilities','POWER_INTERRUPTION','Power Interruption',false,true,true,NOW(),NOW()),
  ('dtr-material','dtcat-process','MATERIAL_SHORTAGE','Material Shortage',false,true,true,NOW(),NOW()),
  ('dtr-quality','dtcat-process','QUALITY_ISSUE','Quality Issue',false,true,true,NOW(),NOW()),
  ('dtr-changeover','dtcat-planned','CHANGEOVER','Changeover',false,true,true,NOW(),NOW()),
  ('dtr-cleaning','dtcat-planned','CLEANING','Cleaning',false,true,true,NOW(),NOW()),
  ('dtr-pm','dtcat-planned','PLANNED_MAINTENANCE','Planned Maintenance',true,true,true,NOW(),NOW()),
  ('dtr-operator','dtcat-people','OPERATOR_DELAY','Operator Delay',false,true,true,NOW(),NOW()),
  ('dtr-other','dtcat-other','OTHER','Other',false,true,true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

WITH permissions(module, action, label) AS (VALUES
 ('production','downtime.view','View downtime'),('production','downtime.create','Create downtime'),('production','downtime.update','Update downtime'),('production','downtime.stop','Stop downtime'),('production','downtime.createMaintenanceTicket','Create downtime maintenance ticket'),('production','downtime.close','Close downtime'),('production','downtime.print','Print downtime'),('production','downtime.export','Export downtime'),
 ('maintenance','ticket.overrideDuplicate','Override duplicate downtime ticket'),('maintenance','workOrder.reject','Reject work order'),('maintenance','workOrder.pause','Pause work'),('maintenance','workOrder.resume','Resume work'),('maintenance','workOrder.recordDamage','Record spare damage'),('maintenance','workOrder.returnParts','Return unused parts'),('maintenance','workOrder.recordLabor','Record labor'),('maintenance','workOrder.recordExternalCost','Record external cost'),('maintenance','workOrder.test','Test work order'),('maintenance','workOrder.overrideUnresolvedParts','Override unresolved parts'),('maintenance','workOrder.print','Print work order'),
 ('reports','maintenance.view','View maintenance reports'),('reports','maintenance.export','Export maintenance reports'),('reports','maintenance.viewCost','View maintenance report costs')
)
INSERT INTO "Permission" (id,module,action,label,"isArchived") SELECT gen_random_uuid()::text,p.module,p.action,p.label,false FROM permissions p WHERE NOT EXISTS (SELECT 1 FROM "Permission" e WHERE e.module=p.module AND e.action=p.action AND e."isArchived"=false);
