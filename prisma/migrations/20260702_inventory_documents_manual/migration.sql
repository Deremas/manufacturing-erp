ALTER TABLE "StockMovement"
  ADD COLUMN IF NOT EXISTS "sourceModule" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceDocumentId" TEXT;

ALTER TABLE "Approval"
  ADD COLUMN IF NOT EXISTS "assignedApproverId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS "StockTransfer" (
  "id" TEXT PRIMARY KEY,
  "transferNo" TEXT NOT NULL UNIQUE,
  "transferDate" TIMESTAMP NOT NULL,
  "fromLocationId" TEXT NOT NULL REFERENCES "Location"("id") ON DELETE RESTRICT,
  "toLocationId" TEXT NOT NULL REFERENCES "Location"("id") ON DELETE RESTRICT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "approvedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StockTransferItem" (
  "id" TEXT PRIMARY KEY,
  "transferId" TEXT NOT NULL REFERENCES "StockTransfer"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "Item"("id") ON DELETE RESTRICT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT
);

CREATE TABLE IF NOT EXISTS "StockAdjustment" (
  "id" TEXT PRIMARY KEY,
  "adjustmentNo" TEXT NOT NULL UNIQUE,
  "adjustmentDate" TIMESTAMP NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "Location"("id") ON DELETE RESTRICT,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "approvedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StockAdjustmentItem" (
  "id" TEXT PRIMARY KEY,
  "adjustmentId" TEXT NOT NULL REFERENCES "StockAdjustment"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "Item"("id") ON DELETE RESTRICT,
  "systemQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "physicalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "differenceQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT
);

CREATE TABLE IF NOT EXISTS "StockIssue" (
  "id" TEXT PRIMARY KEY,
  "issueNo" TEXT NOT NULL UNIQUE,
  "issueDate" TIMESTAMP NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "Location"("id") ON DELETE RESTRICT,
  "issuedToType" TEXT NOT NULL,
  "issuedToId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "approvedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StockIssueItem" (
  "id" TEXT PRIMARY KEY,
  "issueId" TEXT NOT NULL REFERENCES "StockIssue"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "Item"("id") ON DELETE RESTRICT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT
);

CREATE TABLE IF NOT EXISTS "StockReturn" (
  "id" TEXT PRIMARY KEY,
  "returnNo" TEXT NOT NULL UNIQUE,
  "returnDate" TIMESTAMP NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "Location"("id") ON DELETE RESTRICT,
  "returnedFromType" TEXT NOT NULL,
  "returnedFromId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "approvedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "postedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StockReturnItem" (
  "id" TEXT PRIMARY KEY,
  "returnId" TEXT NOT NULL REFERENCES "StockReturn"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "Item"("id") ON DELETE RESTRICT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT
);

CREATE TABLE IF NOT EXISTS "StoreRequisition" (
  "id" TEXT PRIMARY KEY,
  "requisitionNo" TEXT NOT NULL UNIQUE,
  "requisitionDate" TIMESTAMP NOT NULL,
  "requestedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "fromLocationId" TEXT REFERENCES "Location"("id") ON DELETE RESTRICT,
  "toLocationId" TEXT REFERENCES "Location"("id") ON DELETE RESTRICT,
  "toDepartmentId" TEXT REFERENCES "Department"("id") ON DELETE RESTRICT,
  "purpose" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StoreRequisitionItem" (
  "id" TEXT PRIMARY KEY,
  "requisitionId" TEXT NOT NULL REFERENCES "StoreRequisition"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "Item"("id") ON DELETE RESTRICT,
  "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "approvedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "issuedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockTransfer_transferDate" ON "StockTransfer"("transferDate");
CREATE INDEX IF NOT EXISTS "idx_StockAdjustment_adjustmentDate" ON "StockAdjustment"("adjustmentDate");
CREATE INDEX IF NOT EXISTS "idx_StockIssue_issueDate" ON "StockIssue"("issueDate");
CREATE INDEX IF NOT EXISTS "idx_StockReturn_returnDate" ON "StockReturn"("returnDate");
CREATE INDEX IF NOT EXISTS "idx_StoreRequisition_requisitionDate" ON "StoreRequisition"("requisitionDate");

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
VALUES
  ('docnum-stk', 'STK', 'Stock Movement', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-trf', 'TRF', 'Stock Transfer', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-adj', 'ADJ', 'Stock Adjustment', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-iss', 'ISS', 'Stock Issue', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-ret', 'RET', 'Stock Return', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false),
  ('docnum-srv', 'SRV', 'Store Requisition', 'PREFIX_YEAR', '-', 'YYYY', 'MM', 'DD', 4, 0, true, false)
ON CONFLICT ("prefix") DO NOTHING;
