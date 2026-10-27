CREATE TYPE "PreventiveMaintenanceTriggerType" AS ENUM ('CALENDAR', 'METER', 'HYBRID');
CREATE TYPE "PreventiveMaintenanceExecutionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED');

ALTER TABLE "PreventiveMaintenancePlan"
  ADD COLUMN "triggerType" "PreventiveMaintenanceTriggerType" NOT NULL DEFAULT 'CALENDAR',
  ADD COLUMN "leadTimeDays" INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "autoGenerateWorkOrder" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "preferredTechnicianId" TEXT,
  ADD COLUMN "plannedDowntimeMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastGeneratedAt" TIMESTAMP(3);

ALTER TABLE "PreventiveMaintenanceExecution"
  ADD COLUMN "triggerType" "PreventiveMaintenanceTriggerType" NOT NULL DEFAULT 'CALENDAR',
  ADD COLUMN "triggerValue" DOUBLE PRECISION,
  ADD COLUMN "status" "PreventiveMaintenanceExecutionStatus" NOT NULL DEFAULT 'SCHEDULED';

CREATE TABLE "PreventiveMaintenancePlanTask" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0,
  "task" TEXT NOT NULL,
  "instructions" TEXT,
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "expectedResult" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreventiveMaintenancePlanTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PreventiveMaintenancePlanSpare" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreventiveMaintenancePlanSpare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PreventiveMaintenanceChecklistResult" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "result" TEXT,
  "reading" TEXT,
  "remarks" TEXT,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreventiveMaintenanceChecklistResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PreventiveMaintenanceScheduleChange" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "executionId" TEXT,
  "previousDueDate" TIMESTAMP(3) NOT NULL,
  "requestedDueDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedById" TEXT NOT NULL,
  "checkedById" TEXT,
  "approvedById" TEXT,
  "rejectedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "remarks" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreventiveMaintenanceScheduleChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PreventiveMaintenancePlanTask_planId_sequence_idx" ON "PreventiveMaintenancePlanTask"("planId", "sequence");
CREATE UNIQUE INDEX "PreventiveMaintenancePlanSpare_planId_itemId_key" ON "PreventiveMaintenancePlanSpare"("planId", "itemId");
CREATE INDEX "PreventiveMaintenancePlanSpare_itemId_idx" ON "PreventiveMaintenancePlanSpare"("itemId");
CREATE UNIQUE INDEX "PreventiveMaintenanceChecklistResult_executionId_taskId_key" ON "PreventiveMaintenanceChecklistResult"("executionId", "taskId");
CREATE INDEX "PreventiveMaintenanceChecklistResult_executionId_completed_idx" ON "PreventiveMaintenanceChecklistResult"("executionId", "completed");
CREATE INDEX "PreventiveMaintenanceScheduleChange_planId_status_idx" ON "PreventiveMaintenanceScheduleChange"("planId", "status");
CREATE INDEX "PreventiveMaintenanceScheduleChange_executionId_idx" ON "PreventiveMaintenanceScheduleChange"("executionId");

ALTER TABLE "PreventiveMaintenancePlanTask" ADD CONSTRAINT "PreventiveMaintenancePlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PreventiveMaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreventiveMaintenancePlanSpare" ADD CONSTRAINT "PreventiveMaintenancePlanSpare_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PreventiveMaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreventiveMaintenancePlanSpare" ADD CONSTRAINT "PreventiveMaintenancePlanSpare_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreventiveMaintenanceChecklistResult" ADD CONSTRAINT "PreventiveMaintenanceChecklistResult_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "PreventiveMaintenanceExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreventiveMaintenanceChecklistResult" ADD CONSTRAINT "PreventiveMaintenanceChecklistResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PreventiveMaintenancePlanTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreventiveMaintenanceScheduleChange" ADD CONSTRAINT "PreventiveMaintenanceScheduleChange_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PreventiveMaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreventiveMaintenanceScheduleChange" ADD CONSTRAINT "PreventiveMaintenanceScheduleChange_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "PreventiveMaintenanceExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "module", "action", "label", "isArchived") VALUES
  ('maintenance.pm.view', 'maintenance', 'pm.view', 'Preventive Maintenance View', false),
  ('maintenance.pm.create', 'maintenance', 'pm.create', 'Preventive Maintenance Create', false),
  ('maintenance.pm.update', 'maintenance', 'pm.update', 'Preventive Maintenance Update', false),
  ('maintenance.pm.generateWorkOrder', 'maintenance', 'pm.generateWorkOrder', 'Generate Preventive Maintenance Work Order', false),
  ('maintenance.pm.recordChecklist', 'maintenance', 'pm.recordChecklist', 'Record Preventive Maintenance Checklist', false),
  ('maintenance.pm.reschedule', 'maintenance', 'pm.reschedule', 'Request Preventive Maintenance Reschedule', false),
  ('maintenance.pm.checkReschedule', 'maintenance', 'pm.checkReschedule', 'Check Preventive Maintenance Reschedule', false),
  ('maintenance.pm.approveReschedule', 'maintenance', 'pm.approveReschedule', 'Approve Preventive Maintenance Reschedule', false),
  ('maintenance.pm.rejectReschedule', 'maintenance', 'pm.rejectReschedule', 'Reject Preventive Maintenance Reschedule', false),
  ('reports.maintenance.pmCompliance', 'reports', 'maintenance.pmCompliance', 'Preventive Maintenance Compliance Report', false)
ON CONFLICT ("id") DO UPDATE SET "module" = EXCLUDED."module", "action" = EXCLUDED."action", "label" = EXCLUDED."label", "isArchived" = false;

INSERT INTO "RolePermission" ("id", "roleId", "permission", "module", "action", "isArchived")
SELECT role.id || ':' || permission.id, role.id, permission.id, permission.module, permission.action, false
FROM "Role" role
JOIN "Permission" permission ON permission.id IN (
  'maintenance.pm.view','maintenance.pm.create','maintenance.pm.update','maintenance.pm.generateWorkOrder',
  'maintenance.pm.recordChecklist','maintenance.pm.reschedule','maintenance.pm.checkReschedule',
  'maintenance.pm.approveReschedule','maintenance.pm.rejectReschedule','reports.maintenance.pmCompliance'
)
WHERE role.name='Super Admin'
ON CONFLICT ("id") DO UPDATE SET "roleId"=EXCLUDED."roleId", "permission"=EXCLUDED."permission", "module"=EXCLUDED."module", "action"=EXCLUDED."action", "isArchived"=false;
