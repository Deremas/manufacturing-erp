DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcurementDocumentStatus') THEN
    CREATE TYPE "ProcurementDocumentStatus" AS ENUM (
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'PARTIALLY_CONVERTED',
      'CONVERTED',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'PARTIALLY_RETURNED',
      'RETURNED',
      'PARTIAL_PAID',
      'PAID',
      'POSTED',
      'CANCELLED',
      'CLOSED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockMovementType') THEN
    CREATE TYPE "StockMovementType" AS ENUM (
      'OPENING',
      'PURCHASE_RECEIPT',
      'PURCHASE_RETURN',
      'PRODUCTION_ISSUE',
      'PRODUCTION_RECEIPT',
      'SALES_ISSUE',
      'SALES_RETURN',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'STORE_ISSUE',
      'STORE_RETURN',
      'SCRAP',
      'DAMAGED',
      'EXPIRED'
    );
  END IF;
END $$;

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

UPDATE "GoodsReceipt"
SET "receivingLocationId" = COALESCE("receivingLocationId", "locationId")
WHERE "receivingLocationId" IS NULL;

ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "poItemId" TEXT;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "uomId" TEXT;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "orderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "previouslyReceivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "acceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GoodsReceiptItem" ADD COLUMN IF NOT EXISTS "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'GoodsReceipt'
      AND column_name = 'status'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "GoodsReceipt"
      ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "GoodsReceipt"
      ALTER COLUMN status TYPE "ProcurementDocumentStatus"
      USING status::text::"ProcurementDocumentStatus";
    ALTER TABLE "GoodsReceipt"
      ALTER COLUMN status SET DEFAULT 'DRAFT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'SupplierInvoice'
      AND column_name = 'status'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "SupplierInvoice"
      ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "SupplierInvoice"
      ALTER COLUMN status TYPE "ProcurementDocumentStatus"
      USING status::text::"ProcurementDocumentStatus";
    ALTER TABLE "SupplierInvoice"
      ALTER COLUMN status SET DEFAULT 'DRAFT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'SupplierPayment'
      AND column_name = 'status'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "SupplierPayment"
      ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "SupplierPayment"
      ALTER COLUMN status TYPE "ProcurementDocumentStatus"
      USING status::text::"ProcurementDocumentStatus";
    ALTER TABLE "SupplierPayment"
      ALTER COLUMN status SET DEFAULT 'DRAFT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'StockMovement'
      AND column_name = 'movementType'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "StockMovement"
      ALTER COLUMN "movementType" TYPE "StockMovementType"
      USING "movementType"::text::"StockMovementType";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProcurementFinancePosting" (
  id TEXT PRIMARY KEY,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "postingType" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL REFERENCES "Supplier"("id") ON DELETE RESTRICT,
  "invoiceId" TEXT REFERENCES "SupplierInvoice"("id") ON DELETE SET NULL,
  "paymentId" TEXT REFERENCES "SupplierPayment"("id") ON DELETE SET NULL,
  "bankAccountId" TEXT REFERENCES "BankAccount"("id") ON DELETE SET NULL,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ETB',
  status TEXT NOT NULL DEFAULT 'POSTED',
  memo TEXT,
  "postedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "postedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "ProcurementFinancePosting_source_unique" UNIQUE ("sourceType", "sourceId")
);

CREATE INDEX IF NOT EXISTS "idx_GoodsReceipt_receivingLocationId" ON "GoodsReceipt"("receivingLocationId");
CREATE INDEX IF NOT EXISTS "ProcurementFinancePosting_supplierId_idx" ON "ProcurementFinancePosting"("supplierId");
