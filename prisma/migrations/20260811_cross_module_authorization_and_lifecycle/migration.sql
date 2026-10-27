CREATE TABLE IF NOT EXISTS "UserDepartment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserDepartment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserDepartment_userId_departmentId_key" ON "UserDepartment"("userId", "departmentId");
CREATE INDEX IF NOT EXISTS "UserDepartment_departmentId_idx" ON "UserDepartment"("departmentId");
DO $$ BEGIN ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ApprovalPolicy" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "requireCheck" BOOLEAN NOT NULL DEFAULT false,
  "requireApproval" BOOLEAN NOT NULL DEFAULT true,
  "requirePosting" BOOLEAN NOT NULL DEFAULT false,
  "checkerRoleId" TEXT,
  "approverRoleId" TEXT,
  "posterRoleId" TEXT,
  "amountThreshold" DOUBLE PRECISION,
  "quantityThreshold" DOUBLE PRECISION,
  "makerCannotCheckOwn" BOOLEAN NOT NULL DEFAULT true,
  "checkerCannotApproveOwn" BOOLEAN NOT NULL DEFAULT true,
  "approverCannotPostOwn" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalPolicy_module_resource_key" ON "ApprovalPolicy"("module", "resource");
CREATE INDEX IF NOT EXISTS "ApprovalPolicy_isActive_idx" ON "ApprovalPolicy"("isActive");

ALTER TABLE "MaintenanceWorkOrderPart"
  ADD COLUMN IF NOT EXISTS "damagedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unresolvedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "damageReason" TEXT;
UPDATE "MaintenanceWorkOrderPart" SET "unresolvedQty" = GREATEST(COALESCE("issuedQty", 0) - COALESCE("usedQty", 0) - COALESCE("returnedQty", 0) - COALESCE("damagedQty", 0), 0);

ALTER TABLE "ProductionBatch" ADD COLUMN IF NOT EXISTS "sourceBatchId" TEXT;
CREATE INDEX IF NOT EXISTS "ProductionBatch_sourceBatchId_createdAt_idx" ON "ProductionBatch"("sourceBatchId", "createdAt");
DO $$ BEGIN ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

WITH permissions(module, action, label) AS (
  VALUES
    ('administration','approvalPolicy.view','View approval policies'),('administration','approvalPolicy.manage','Manage approval policies'),('administration','role.view','View roles'),('administration','role.create','Create roles'),('administration','role.update','Update roles'),
    ('asset','master.view','View assets'),('asset','master.create','Create assets'),('asset','master.update','Update assets'),('asset','master.deactivate','Deactivate assets'),('asset','master.viewCost','View asset costs'),('asset','master.print','Print assets'),('asset','master.export','Export assets'),
    ('asset','assignment.view','View asset assignments'),('asset','assignment.create','Create asset assignments'),('asset','assignment.update','Update asset assignments'),('asset','assignment.submit','Submit asset assignments'),('asset','assignment.check','Check asset assignments'),('asset','assignment.approve','Approve asset assignments'),('asset','assignment.return','Return assets'),('asset','assignment.cancel','Cancel asset assignments'),
    ('asset','transfer.view','View asset transfers'),('asset','transfer.create','Create asset transfers'),('asset','transfer.update','Update asset transfers'),('asset','transfer.submit','Submit asset transfers'),('asset','transfer.check','Check asset transfers'),('asset','transfer.approve','Approve asset transfers'),('asset','transfer.post','Post asset transfers'),('asset','transfer.reject','Reject asset transfers'),('asset','transfer.cancel','Cancel asset transfers'),
    ('maintenance','ticket.view','View maintenance tickets'),('maintenance','ticket.create','Create maintenance tickets'),('maintenance','ticket.update','Update maintenance tickets'),('maintenance','ticket.submit','Submit maintenance tickets'),('maintenance','ticket.check','Check maintenance tickets'),('maintenance','ticket.approve','Approve maintenance tickets'),('maintenance','ticket.reject','Reject maintenance tickets'),('maintenance','ticket.assign','Assign maintenance tickets'),('maintenance','ticket.close','Close maintenance tickets'),('maintenance','ticket.cancel','Cancel maintenance tickets'),
    ('maintenance','workOrder.view','View work orders'),('maintenance','workOrder.create','Create work orders'),('maintenance','workOrder.update','Update work orders'),('maintenance','workOrder.submit','Submit work orders'),('maintenance','workOrder.check','Check work orders'),('maintenance','workOrder.approve','Approve work orders'),('maintenance','workOrder.assign','Assign work orders'),('maintenance','workOrder.start','Start work orders'),('maintenance','workOrder.requestParts','Request or issue parts'),('maintenance','workOrder.recordUsage','Record parts usage and damage'),('maintenance','workOrder.complete','Complete work orders'),('maintenance','workOrder.test','Test work orders'),('maintenance','workOrder.close','Close work orders'),('maintenance','workOrder.cancel','Cancel work orders'),('maintenance','workOrder.export','Export work orders'),
    ('maintenance','pm.view','View preventive maintenance'),('maintenance','pm.create','Create preventive maintenance'),('maintenance','pm.update','Update preventive maintenance'),('maintenance','pm.activate','Activate preventive maintenance'),('maintenance','pm.deactivate','Deactivate preventive maintenance'),('maintenance','pm.generateWorkOrder','Generate PM work orders'),
    ('inventory','transfer.view','View transfers'),('inventory','transfer.create','Create transfers'),('inventory','transfer.update','Update transfers'),('inventory','transfer.approve','Approve transfers'),('inventory','transfer.post','Post transfers'),('inventory','transfer.reject','Reject transfers'),('inventory','transfer.cancel','Cancel transfers'),
    ('inventory','adjustment.view','View adjustments'),('inventory','adjustment.create','Create adjustments'),('inventory','adjustment.update','Update adjustments'),('inventory','adjustment.approve','Approve adjustments'),('inventory','adjustment.post','Post adjustments'),('inventory','adjustment.reject','Reject adjustments'),('inventory','adjustment.cancel','Cancel adjustments'),
    ('inventory','issue.view','View issues'),('inventory','issue.create','Create issues'),('inventory','issue.update','Update issues'),('inventory','issue.approve','Approve issues'),('inventory','issue.post','Post issues'),('inventory','issue.reject','Reject issues'),('inventory','issue.cancel','Cancel issues'),
    ('inventory','return.view','View returns'),('inventory','return.create','Create returns'),('inventory','return.update','Update returns'),('inventory','return.approve','Approve returns'),('inventory','return.post','Post returns'),('inventory','return.reject','Reject returns'),('inventory','return.cancel','Cancel returns'),
    ('inventory','srv.view','View store requisitions'),('inventory','srv.create','Create store requisitions'),('inventory','srv.update','Update store requisitions'),('inventory','srv.approve','Approve store requisitions'),('inventory','srv.reject','Reject store requisitions'),('inventory','srv.cancel','Cancel store requisitions'),('inventory','srv.generateIssue','Generate stock issue'),
    ('procurement','pr.view','View purchase requisitions'),('procurement','pr.create','Create purchase requisitions'),('procurement','pr.update','Update purchase requisitions'),('procurement','pr.approve','Approve purchase requisitions'),('procurement','pr.reject','Reject purchase requisitions'),('procurement','pr.cancel','Cancel purchase requisitions'),
    ('procurement','po.view','View purchase orders'),('procurement','po.create','Create purchase orders'),('procurement','po.update','Update purchase orders'),('procurement','po.approve','Approve purchase orders'),('procurement','po.reject','Reject purchase orders'),('procurement','po.cancel','Cancel purchase orders'),
    ('procurement','grn.view','View goods receipts'),('procurement','grn.create','Create goods receipts'),('procurement','grn.update','Update goods receipts'),('procurement','grn.approve','Approve goods receipts'),('procurement','grn.post','Post goods receipts'),('procurement','grn.reject','Reject goods receipts'),('procurement','grn.cancel','Cancel goods receipts'),('procurement','grn.registerAsset','Register assets from goods receipts'),
    ('production','batch.view','View production batches'),('production','batch.export','Export batch traceability'),('production','stage.manage','Manage production stages'),('production','downtime.create','Create production downtime'),('production','downtime.close','Close production downtime'),
    ('qc','rework.approve','Approve QC rework'),('qc','nc.close','Close nonconformities')
)
INSERT INTO "Permission" (id, module, action, label, "isArchived")
SELECT gen_random_uuid()::text, p.module, p.action, p.label, false FROM permissions p
WHERE NOT EXISTS (SELECT 1 FROM "Permission" existing WHERE existing.module = p.module AND existing.action = p.action AND existing."isArchived" = false);
