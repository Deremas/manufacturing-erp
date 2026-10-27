ALTER TABLE "MaintenanceWorkOrder"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "checkedById" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "MaintenanceSpareRequest" (
  "id" TEXT NOT NULL,
  "requestNo" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "requestedById" TEXT NOT NULL,
  "checkedById" TEXT,
  "approvedById" TEXT,
  "rejectedById" TEXT,
  "submittedAt" TIMESTAMP(3),
  "checkedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceSpareRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceSpareRequest_requestNo_key" ON "MaintenanceSpareRequest"("requestNo");
CREATE INDEX IF NOT EXISTS "MaintenanceSpareRequest_workOrderId_status_idx" ON "MaintenanceSpareRequest"("workOrderId", "status");
CREATE INDEX IF NOT EXISTS "MaintenanceSpareRequest_locationId_status_idx" ON "MaintenanceSpareRequest"("locationId", "status");
DO $$ BEGIN ALTER TABLE "MaintenanceSpareRequest" ADD CONSTRAINT "MaintenanceSpareRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "MaintenanceWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceSpareRequest" ADD CONSTRAINT "MaintenanceSpareRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MaintenanceSpareRequestItem" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "workOrderPartId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "requestedQty" DOUBLE PRECISION NOT NULL,
  "approvedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "issuedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceSpareRequestItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceSpareRequestItem_requestId_workOrderPartId_key" ON "MaintenanceSpareRequestItem"("requestId", "workOrderPartId");
CREATE INDEX IF NOT EXISTS "MaintenanceSpareRequestItem_itemId_idx" ON "MaintenanceSpareRequestItem"("itemId");
DO $$ BEGIN ALTER TABLE "MaintenanceSpareRequestItem" ADD CONSTRAINT "MaintenanceSpareRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceSpareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceSpareRequestItem" ADD CONSTRAINT "MaintenanceSpareRequestItem_workOrderPartId_fkey" FOREIGN KEY ("workOrderPartId") REFERENCES "MaintenanceWorkOrderPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MaintenanceSpareRequestItem" ADD CONSTRAINT "MaintenanceSpareRequestItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

WITH permissions(module, action, label) AS (VALUES
  ('maintenance','spareRequest.view','View maintenance spare requests'), ('maintenance','spareRequest.create','Create maintenance spare requests'),
  ('maintenance','spareRequest.submit','Submit maintenance spare requests'), ('maintenance','spareRequest.check','Check maintenance spare requests'),
  ('maintenance','spareRequest.approve','Approve maintenance spare requests'), ('maintenance','spareRequest.reject','Reject maintenance spare requests'),
  ('maintenance','spareRequest.cancel','Cancel maintenance spare requests'), ('maintenance','workOrder.issueParts','Issue approved work-order spare parts'),
  ('maintenance','workOrder.directIssue','Direct emergency issue of work-order spare parts')
)
INSERT INTO "Permission" (id, module, action, label, "isArchived")
SELECT gen_random_uuid()::text, p.module, p.action, p.label, false FROM permissions p
WHERE NOT EXISTS (SELECT 1 FROM "Permission" existing WHERE existing.module = p.module AND existing.action = p.action AND existing."isArchived" = false);
