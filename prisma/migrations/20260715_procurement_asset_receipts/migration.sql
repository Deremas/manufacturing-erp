CREATE TYPE "ProcurementRequestType" AS ENUM (
  'INVENTORY_PURCHASE',
  'MAINTENANCE_SPARE',
  'ASSET_PURCHASE',
  'EXTERNAL_SERVICE'
);

CREATE TYPE "ProcurementReceiptType" AS ENUM ('INVENTORY', 'ASSET', 'SERVICE');

CREATE TYPE "AssetReceiptStatus" AS ENUM (
  'PENDING',
  'PARTIALLY_REGISTERED',
  'REGISTERED',
  'CANCELLED'
);

ALTER TABLE "PurchaseRequisition"
  ADD COLUMN "requestType" "ProcurementRequestType" NOT NULL DEFAULT 'INVENTORY_PURCHASE';

ALTER TABLE "PurchaseOrder"
  ADD COLUMN "requestType" "ProcurementRequestType" NOT NULL DEFAULT 'INVENTORY_PURCHASE';

ALTER TABLE "PurchaseOrderItem"
  ADD COLUMN "receiptType" "ProcurementReceiptType" NOT NULL DEFAULT 'INVENTORY';

ALTER TABLE "GoodsReceiptItem"
  ADD COLUMN "receiptType" "ProcurementReceiptType" NOT NULL DEFAULT 'INVENTORY';

ALTER TABLE "Asset"
  ADD COLUMN "assetReceiptId" TEXT;

CREATE TABLE "AssetReceipt" (
  "id" TEXT NOT NULL,
  "assetReceiptNo" TEXT NOT NULL,
  "grnId" TEXT NOT NULL,
  "grnItemId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "receivedQty" DOUBLE PRECISION NOT NULL,
  "registeredQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remainingQty" DOUBLE PRECISION NOT NULL,
  "status" "AssetReceiptStatus" NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetReceipt_assetReceiptNo_key" ON "AssetReceipt"("assetReceiptNo");
CREATE UNIQUE INDEX "AssetReceipt_grnItemId_key" ON "AssetReceipt"("grnItemId");
CREATE INDEX "AssetReceipt_grnId_status_idx" ON "AssetReceipt"("grnId", "status");
CREATE INDEX "AssetReceipt_itemId_status_idx" ON "AssetReceipt"("itemId", "status");
CREATE INDEX "Asset_assetReceiptId_idx" ON "Asset"("assetReceiptId");

ALTER TABLE "AssetReceipt"
  ADD CONSTRAINT "AssetReceipt_grnId_fkey"
  FOREIGN KEY ("grnId") REFERENCES "GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssetReceipt"
  ADD CONSTRAINT "AssetReceipt_grnItemId_fkey"
  FOREIGN KEY ("grnItemId") REFERENCES "GoodsReceiptItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssetReceipt"
  ADD CONSTRAINT "AssetReceipt_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssetReceipt"
  ADD CONSTRAINT "AssetReceipt_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Asset"
  ADD CONSTRAINT "Asset_assetReceiptId_fkey"
  FOREIGN KEY ("assetReceiptId") REFERENCES "AssetReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
