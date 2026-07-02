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
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'CHEQUE', 'MOBILE_MONEY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PurchaseRequisition" (
  id text PRIMARY KEY,
  "requisitionNo" text NOT NULL UNIQUE,
  "requisitionDate" timestamp(3) NOT NULL,
  "requestedById" text NOT NULL,
  "departmentId" text NOT NULL,
  "locationId" text NOT NULL,
  "neededByDate" timestamp(3),
  purpose text NOT NULL,
  status "ProcurementDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  remarks text,
  "approvedById" text,
  "approvedAt" timestamp(3),
  "rejectedById" text,
  "rejectedAt" timestamp(3),
  "rejectionReason" text,
  "createdById" text NOT NULL,
  "updatedById" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PurchaseRequisitionItem" (
  id text PRIMARY KEY,
  "requisitionId" text NOT NULL,
  "itemId" text NOT NULL,
  "uomId" text,
  "requestedQty" double precision NOT NULL,
  "approvedQty" double precision NOT NULL,
  "estimatedUnitPrice" double precision NOT NULL,
  "estimatedTotal" double precision NOT NULL,
  remarks text
);

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  id text PRIMARY KEY,
  "poNo" text NOT NULL UNIQUE,
  "poDate" timestamp(3) NOT NULL,
  "supplierId" text NOT NULL,
  "prId" text,
  "deliveryLocationId" text NOT NULL,
  "expectedDeliveryDate" timestamp(3),
  "paymentTerms" text,
  status "ProcurementDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  subtotal double precision NOT NULL DEFAULT 0,
  "taxAmount" double precision NOT NULL DEFAULT 0,
  "discountAmount" double precision NOT NULL DEFAULT 0,
  "totalAmount" double precision NOT NULL DEFAULT 0,
  remarks text,
  "approvedById" text,
  "approvedAt" timestamp(3),
  "createdById" text NOT NULL,
  "updatedById" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  id text PRIMARY KEY,
  "poId" text NOT NULL,
  "prItemId" text,
  "itemId" text NOT NULL,
  "uomId" text,
  "orderedQty" double precision NOT NULL,
  "receivedQty" double precision NOT NULL DEFAULT 0,
  "returnedQty" double precision NOT NULL DEFAULT 0,
  "unitPrice" double precision NOT NULL,
  "taxCodeId" text,
  "taxRate" double precision NOT NULL DEFAULT 0,
  "taxAmount" double precision NOT NULL DEFAULT 0,
  "lineTotal" double precision NOT NULL DEFAULT 0,
  remarks text
);

CREATE TABLE IF NOT EXISTS "SupplierReturn" (
  id text PRIMARY KEY,
  "returnNo" text NOT NULL UNIQUE,
  "returnDate" timestamp(3) NOT NULL,
  "supplierId" text NOT NULL,
  "grnId" text,
  "poId" text,
  "returnLocationId" text NOT NULL,
  reason text NOT NULL,
  status "ProcurementDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  subtotal double precision NOT NULL DEFAULT 0,
  "taxAmount" double precision NOT NULL DEFAULT 0,
  "totalAmount" double precision NOT NULL DEFAULT 0,
  "postedById" text,
  "postedAt" timestamp(3),
  remarks text,
  "createdById" text NOT NULL,
  "updatedById" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SupplierReturnItem" (
  id text PRIMARY KEY,
  "returnId" text NOT NULL,
  "grnItemId" text,
  "poItemId" text,
  "itemId" text NOT NULL,
  "uomId" text,
  "returnQty" double precision NOT NULL,
  "unitCost" double precision NOT NULL,
  "taxAmount" double precision NOT NULL DEFAULT 0,
  "lineTotal" double precision NOT NULL DEFAULT 0,
  reason text,
  remarks text
);

CREATE TABLE IF NOT EXISTS "SupplierInvoice" (
  id text PRIMARY KEY,
  "invoiceNo" text NOT NULL UNIQUE,
  "supplierInvoiceNo" text NOT NULL,
  "invoiceDate" timestamp(3) NOT NULL,
  "dueDate" timestamp(3),
  "supplierId" text NOT NULL,
  "poId" text,
  "grnId" text,
  status "ProcurementDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  subtotal double precision NOT NULL DEFAULT 0,
  "taxAmount" double precision NOT NULL DEFAULT 0,
  "discountAmount" double precision NOT NULL DEFAULT 0,
  "totalAmount" double precision NOT NULL DEFAULT 0,
  "amountPaid" double precision NOT NULL DEFAULT 0,
  "balanceDue" double precision NOT NULL DEFAULT 0,
  "recordedById" text NOT NULL,
  "approvedById" text,
  "approvedAt" timestamp(3),
  remarks text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SupplierInvoiceItem" (
  id text PRIMARY KEY,
  "invoiceId" text NOT NULL,
  "itemId" text NOT NULL,
  "uomId" text,
  quantity double precision NOT NULL,
  "unitPrice" double precision NOT NULL,
  "taxAmount" double precision NOT NULL DEFAULT 0,
  "lineTotal" double precision NOT NULL DEFAULT 0,
  remarks text
);

CREATE TABLE IF NOT EXISTS "SupplierPayment" (
  id text PRIMARY KEY,
  "paymentNo" text NOT NULL UNIQUE,
  "paymentDate" timestamp(3) NOT NULL,
  "supplierId" text NOT NULL,
  "invoiceId" text NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "bankAccountId" text,
  "cashAccountId" text,
  "referenceNo" text,
  amount double precision NOT NULL,
  remarks text,
  status "ProcurementDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" text NOT NULL,
  "approvedById" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProcurementFinancePosting" (
  id text PRIMARY KEY,
  "sourceType" text NOT NULL,
  "sourceId" text NOT NULL,
  "postingType" text NOT NULL,
  "supplierId" text NOT NULL,
  "invoiceId" text,
  "paymentId" text,
  "bankAccountId" text,
  amount double precision NOT NULL,
  currency text NOT NULL DEFAULT 'ETB',
  status text NOT NULL DEFAULT 'POSTED',
  memo text,
  "postedById" text,
  "postedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcurementFinancePosting_source_unique" UNIQUE ("sourceType", "sourceId")
);

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_requestedById_idx" ON "PurchaseRequisition"("requestedById");
CREATE INDEX IF NOT EXISTS "PurchaseRequisition_departmentId_idx" ON "PurchaseRequisition"("departmentId");
CREATE INDEX IF NOT EXISTS "PurchaseRequisition_locationId_idx" ON "PurchaseRequisition"("locationId");
CREATE INDEX IF NOT EXISTS "PurchaseRequisitionItem_requisitionId_idx" ON "PurchaseRequisitionItem"("requisitionId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_prId_idx" ON "PurchaseOrder"("prId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_poId_idx" ON "PurchaseOrderItem"("poId");
CREATE INDEX IF NOT EXISTS "SupplierReturn_supplierId_idx" ON "SupplierReturn"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierInvoice_supplierId_idx" ON "SupplierInvoice"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");
CREATE INDEX IF NOT EXISTS "ProcurementFinancePosting_supplierId_idx" ON "ProcurementFinancePosting"("supplierId");

INSERT INTO "DocumentNumbering" (
  id, prefix, description, "prefixFormat", separator, "yearFormat", "monthFormat", "dayFormat",
  "sequenceLength", "currentSequence", "isActive", "isArchived"
)
VALUES
  ('docnum-pr', 'PR', 'Purchase Requisition', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-po', 'PO', 'Purchase Order', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-sret', 'SRET', 'Supplier Return', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-sinv', 'SINV', 'Supplier Invoice', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-spay', 'SPAY', 'Supplier Payment', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false)
ON CONFLICT ("prefix") DO NOTHING;

INSERT INTO "ModuleSetting" (id, module, key, value, "isArchived", "createdAt", "updatedAt")
VALUES
  ('proc-pr-approval', 'procurement', 'pr.requireApproval', 'false', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc-po-approval', 'procurement', 'po.requireApproval', 'false', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc-grn-approval', 'procurement', 'grn.requireApproval', 'false', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc-return-approval', 'procurement', 'supplierReturn.requireApproval', 'false', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc-invoice-approval', 'procurement', 'invoice.requireApproval', 'false', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc-payment-approval', 'procurement', 'payment.requireApproval', 'false', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (module, key) DO NOTHING;
