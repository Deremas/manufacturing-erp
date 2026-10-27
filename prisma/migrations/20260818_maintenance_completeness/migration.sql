ALTER TABLE "AssetMeterReading" ADD COLUMN IF NOT EXISTS "shiftSessionId" TEXT;
CREATE INDEX IF NOT EXISTS "AssetMeterReading_shiftSessionId_idx" ON "AssetMeterReading"("shiftSessionId");

CREATE TABLE IF NOT EXISTS "AssetSparePart" (
  "id" TEXT NOT NULL,
  "assetId" TEXT,
  "assetTypeId" TEXT,
  "itemId" TEXT NOT NULL,
  "isPreferred" BOOLEAN NOT NULL DEFAULT true,
  "minimumRecommendedQty" DOUBLE PRECISION,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetSparePart_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssetSparePart_assetId_itemId_idx" ON "AssetSparePart"("assetId", "itemId");
CREATE INDEX IF NOT EXISTS "AssetSparePart_assetTypeId_itemId_idx" ON "AssetSparePart"("assetTypeId", "itemId");
CREATE INDEX IF NOT EXISTS "AssetSparePart_itemId_idx" ON "AssetSparePart"("itemId");
CREATE UNIQUE INDEX IF NOT EXISTS "AssetSparePart_assetId_itemId_key" ON "AssetSparePart"("assetId", "itemId") WHERE "assetId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "AssetSparePart_assetTypeId_itemId_key" ON "AssetSparePart"("assetTypeId", "itemId") WHERE "assetTypeId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetSparePart_assetId_fkey'
  ) THEN
    ALTER TABLE "AssetSparePart"
      ADD CONSTRAINT "AssetSparePart_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetSparePart_assetTypeId_fkey'
  ) THEN
    ALTER TABLE "AssetSparePart"
      ADD CONSTRAINT "AssetSparePart_assetTypeId_fkey"
      FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetSparePart_itemId_fkey'
  ) THEN
    ALTER TABLE "AssetSparePart"
      ADD CONSTRAINT "AssetSparePart_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "Permission" ("id", "module", "action", "label", "isArchived") VALUES
  ('asset.lifecycle.reactivate', 'asset', 'lifecycle.reactivate', 'Reactivate retired assets', false),
  ('maintenance.ticket.convertWorkOrder', 'maintenance', 'ticket.convertWorkOrder', 'Convert maintenance ticket to work order', false),
  ('maintenance.ticket.print', 'maintenance', 'ticket.print', 'Print maintenance tickets', false),
  ('maintenance.ticket.export', 'maintenance', 'ticket.export', 'Export maintenance tickets', false),
  ('maintenance.pm.complete', 'maintenance', 'pm.complete', 'Complete preventive maintenance', false),
  ('maintenance.pm.print', 'maintenance', 'pm.print', 'Print preventive maintenance', false),
  ('maintenance.pm.export', 'maintenance', 'pm.export', 'Export preventive maintenance', false),
  ('production.downtime.cancel', 'production', 'downtime.cancel', 'Cancel production downtime', false)
ON CONFLICT ("id") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "label" = EXCLUDED."label",
  "isArchived" = false;

INSERT INTO "RolePermission" ("id", "roleId", "permission", "module", "action", "isArchived")
SELECT role.id || ':' || permission.id, role.id, permission.id, permission.module, permission.action, false
FROM "Role" role
JOIN "Permission" permission ON permission.id IN (
  'asset.lifecycle.reactivate',
  'maintenance.ticket.convertWorkOrder',
  'maintenance.ticket.print',
  'maintenance.ticket.export',
  'maintenance.pm.complete',
  'maintenance.pm.print',
  'maintenance.pm.export',
  'production.downtime.cancel'
)
WHERE role.name = 'Super Admin'
ON CONFLICT ("id") DO UPDATE SET
  "roleId" = EXCLUDED."roleId",
  "permission" = EXCLUDED."permission",
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "isArchived" = false;
