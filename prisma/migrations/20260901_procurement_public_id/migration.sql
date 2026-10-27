ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseRequisition_publicId_key" ON "PurchaseRequisition"("publicId");

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_publicId_key" ON "PurchaseOrder"("publicId");

ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "GoodsReceipt_publicId_key" ON "GoodsReceipt"("publicId");

ALTER TABLE "SupplierReturn" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierReturn_publicId_key" ON "SupplierReturn"("publicId");

ALTER TABLE "SupplierInvoice" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierInvoice_publicId_key" ON "SupplierInvoice"("publicId");

ALTER TABLE "SupplierPayment" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierPayment_publicId_key" ON "SupplierPayment"("publicId");
