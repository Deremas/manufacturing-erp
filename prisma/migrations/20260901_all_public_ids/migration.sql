-- Add publicId to all ERP entity tables (safe to re-run)
-- Run: npm run db:public-id

-- Procurement (may already exist)
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

-- Inventory
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "StockTransfer_publicId_key" ON "StockTransfer"("publicId");
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "StockAdjustment_publicId_key" ON "StockAdjustment"("publicId");
ALTER TABLE "StockIssue" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "StockIssue_publicId_key" ON "StockIssue"("publicId");
ALTER TABLE "StockReturn" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "StockReturn_publicId_key" ON "StockReturn"("publicId");
ALTER TABLE "StoreRequisition" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "StoreRequisition_publicId_key" ON "StoreRequisition"("publicId");

-- HR
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_publicId_key" ON "Employee"("publicId");
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveRequest_publicId_key" ON "LeaveRequest"("publicId");
ALTER TABLE "OvertimeRequest" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "OvertimeRequest_publicId_key" ON "OvertimeRequest"("publicId");
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_publicId_key" ON "PayrollRun"("publicId");

-- Maintenance
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_publicId_key" ON "Asset"("publicId");
ALTER TABLE "AssetAssignment" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "AssetAssignment_publicId_key" ON "AssetAssignment"("publicId");
ALTER TABLE "AssetTransfer" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "AssetTransfer_publicId_key" ON "AssetTransfer"("publicId");
ALTER TABLE "MaintenanceTicket" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceTicket_publicId_key" ON "MaintenanceTicket"("publicId");
ALTER TABLE "MaintenanceWorkOrder" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceWorkOrder_publicId_key" ON "MaintenanceWorkOrder"("publicId");
ALTER TABLE "PreventiveMaintenancePlan" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "PreventiveMaintenancePlan_publicId_key" ON "PreventiveMaintenancePlan"("publicId");

-- Sales
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_publicId_key" ON "SalesOrder"("publicId");
ALTER TABLE "SalesQuotation" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SalesQuotation_publicId_key" ON "SalesQuotation"("publicId");
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SalesInvoice_publicId_key" ON "SalesInvoice"("publicId");
ALTER TABLE "SalesDispatch" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SalesDispatch_publicId_key" ON "SalesDispatch"("publicId");
ALTER TABLE "LoadingOrder" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "LoadingOrder_publicId_key" ON "LoadingOrder"("publicId");
ALTER TABLE "CustomerReceipt" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerReceipt_publicId_key" ON "CustomerReceipt"("publicId");
ALTER TABLE "SalesCreditNote" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SalesCreditNote_publicId_key" ON "SalesCreditNote"("publicId");
ALTER TABLE "SalesReturn" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "SalesReturn_publicId_key" ON "SalesReturn"("publicId");
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_publicId_key" ON "Sale"("publicId");
ALTER TABLE "CollectionFollowUp" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "CollectionFollowUp_publicId_key" ON "CollectionFollowUp"("publicId");

-- Production
ALTER TABLE "ProductionBatch" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionBatch_publicId_key" ON "ProductionBatch"("publicId");
ALTER TABLE "BOM" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "BOM_publicId_key" ON "BOM"("publicId");
ALTER TABLE "ShiftSession" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftSession_publicId_key" ON "ShiftSession"("publicId");

-- QC
ALTER TABLE "QCTestRecord" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCTestRecord_publicId_key" ON "QCTestRecord"("publicId");
ALTER TABLE "QCTest" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCTest_publicId_key" ON "QCTest"("publicId");
ALTER TABLE "QCTask" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCTask_publicId_key" ON "QCTask"("publicId");
ALTER TABLE "QCHoldRelease" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCHoldRelease_publicId_key" ON "QCHoldRelease"("publicId");
ALTER TABLE "QCHoldDecision" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCHoldDecision_publicId_key" ON "QCHoldDecision"("publicId");
ALTER TABLE "QCNonconformity" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCNonconformity_publicId_key" ON "QCNonconformity"("publicId");
ALTER TABLE "QCCipRecord" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCCipRecord_publicId_key" ON "QCCipRecord"("publicId");
ALTER TABLE "QCRetentionSample" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCRetentionSample_publicId_key" ON "QCRetentionSample"("publicId");
ALTER TABLE "QCManagementReview" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCManagementReview_publicId_key" ON "QCManagementReview"("publicId");
ALTER TABLE "QCInternalAudit" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCInternalAudit_publicId_key" ON "QCInternalAudit"("publicId");
ALTER TABLE "QCCorrectiveAction" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "QCCorrectiveAction_publicId_key" ON "QCCorrectiveAction"("publicId");

-- Master data
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Item_publicId_key" ON "Item"("publicId");
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_publicId_key" ON "Customer"("publicId");
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_publicId_key" ON "Supplier"("publicId");
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Category_publicId_key" ON "Category"("publicId");
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_publicId_key" ON "Unit"("publicId");
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Department_publicId_key" ON "Department"("publicId");
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_publicId_key" ON "Bank"("publicId");
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "BankAccount_publicId_key" ON "BankAccount"("publicId");
ALTER TABLE "TaxCode" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "TaxCode_publicId_key" ON "TaxCode"("publicId");
ALTER TABLE "ItemType" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "ItemType_publicId_key" ON "ItemType"("publicId");
ALTER TABLE "PriceList" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "PriceList_publicId_key" ON "PriceList"("publicId");

-- Administration
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_publicId_key" ON "User"("publicId");
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Role_publicId_key" ON "Role"("publicId");
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Location_publicId_key" ON "Location"("publicId");
ALTER TABLE "DocumentNumbering" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentNumbering_publicId_key" ON "DocumentNumbering"("publicId");

-- Fleet
ALTER TABLE "FleetTrip" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "FleetTrip_publicId_key" ON "FleetTrip"("publicId");

-- Finance
ALTER TABLE "BankTransfer" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "BankTransfer_publicId_key" ON "BankTransfer"("publicId");
ALTER TABLE "BankReconciliation" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "BankReconciliation_publicId_key" ON "BankReconciliation"("publicId");

-- Accounting
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_publicId_key" ON "JournalEntry"("publicId");
