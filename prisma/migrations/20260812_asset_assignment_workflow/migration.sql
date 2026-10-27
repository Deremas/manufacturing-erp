ALTER TYPE "AssetAssignmentStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "AssetAssignmentStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "AssetAssignmentStatus" ADD VALUE IF NOT EXISTS 'CHECKED';
ALTER TYPE "AssetAssignmentStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "AssetAssignmentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "AssetAssignment"
  ADD COLUMN IF NOT EXISTS "checkedById" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

WITH permissions(module, action, label) AS (
  VALUES ('asset','lifecycle.retire','Retire assets'), ('asset','lifecycle.dispose','Dispose assets'), ('asset','lifecycle.viewHistory','View asset lifecycle history')
)
INSERT INTO "Permission" (id, module, action, label, "isArchived")
SELECT gen_random_uuid()::text, p.module, p.action, p.label, false FROM permissions p
WHERE NOT EXISTS (SELECT 1 FROM "Permission" existing WHERE existing.module = p.module AND existing.action = p.action AND existing."isArchived" = false);
