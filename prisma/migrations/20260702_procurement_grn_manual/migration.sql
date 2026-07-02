CREATE TABLE IF NOT EXISTS "GoodsReceipt" (
  "id" TEXT PRIMARY KEY,
  "grnNo" TEXT NOT NULL UNIQUE,
  "grnDate" TIMESTAMP NOT NULL,
  "poId" TEXT,
  "supplierId" TEXT NOT NULL REFERENCES "Supplier"("id") ON DELETE RESTRICT,
  "receivingLocationId" TEXT NOT NULL REFERENCES "Location"("id") ON DELETE RESTRICT,
  "deliveryNoteNo" TEXT,
  "supplierInvoiceNo" TEXT,
  "vehiclePlate" TEXT,
  "deliveredBy" TEXT,
  "receivedById" TEXT,
  "status" "ProcurementDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "updatedById" TEXT,
  "approvedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GoodsReceiptItem" (
  "id" TEXT PRIMARY KEY,
  "goodsReceiptId" TEXT NOT NULL REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE,
  "poItemId" TEXT,
  "itemId" TEXT NOT NULL REFERENCES "Item"("id") ON DELETE RESTRICT,
  "uomId" TEXT,
  "orderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "previouslyReceivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantityReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "acceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT
);

ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "poId" TEXT;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "receivingLocationId" TEXT;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "deliveryNoteNo" TEXT;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "supplierInvoiceNo" TEXT;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "deliveredBy" TEXT;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "receivedById" TEXT;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'GoodsReceipt'
      AND column_name = 'locationId'
  ) THEN
    EXECUTE 'UPDATE "GoodsReceipt" SET "receivingLocationId" = COALESCE("receivingLocationId", "locationId")';
  END IF;
END $$;

ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "poItemId" TEXT;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "uomId" TEXT;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "orderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "previouslyReceivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "acceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_GoodsReceipt_grnDate" ON "GoodsReceipt"("grnDate");

INSERT INTO "DocumentNumbering" (
  "id",
  "prefix",
  "description",
  "prefixFormat",
  "separator",
  "yearFormat",
  "monthFormat",
  "dayFormat",
  "sequenceLength",
  "currentSequence",
  "isActive",
  "isArchived"
)
VALUES (
  'docnum-grn',
  'GRN',
  'Goods Receipt',
  'PREFIX_YEAR',
  '-',
  'YYYY',
  'MM',
  'DD',
  4,
  0,
  true,
  false
)
ON CONFLICT ("prefix") DO NOTHING;
