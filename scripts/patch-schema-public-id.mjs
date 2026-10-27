/**
 * Patch prisma/schema.prisma: add publicId to all registry entity models.
 * Run: node scripts/patch-schema-public-id.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MODELS = [
  "StockTransfer",
  "StockAdjustment",
  "StockIssue",
  "StockReturn",
  "StoreRequisition",
  "Employee",
  "LeaveRequest",
  "OvertimeRequest",
  "PayrollRun",
  "Asset",
  "AssetAssignment",
  "AssetTransfer",
  "MaintenanceTicket",
  "MaintenanceWorkOrder",
  "PreventiveMaintenancePlan",
  "SalesOrder",
  "SalesQuotation",
  "SalesInvoice",
  "SalesDispatch",
  "LoadingOrder",
  "CustomerReceipt",
  "SalesCreditNote",
  "SalesReturn",
  "Sale",
  "CollectionFollowUp",
  "ProductionBatch",
  "BOM",
  "ShiftSession",
  "QCTestRecord",
  "QCTest",
  "QCTask",
  "QCHoldRelease",
  "QCHoldDecision",
  "QCNonconformity",
  "QCCipRecord",
  "QCRetentionSample",
  "QCManagementReview",
  "QCInternalAudit",
  "QCCorrectiveAction",
  "Item",
  "Customer",
  "Supplier",
  "Category",
  "Unit",
  "Department",
  "Bank",
  "BankAccount",
  "TaxCode",
  "ItemType",
  "PriceList",
  "User",
  "Role",
  "Location",
  "DocumentNumbering",
  "FleetTrip",
  "BankTransfer",
  "BankReconciliation",
  "JournalEntry",
];

const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
let schema = readFileSync(schemaPath, "utf8");
let patched = 0;

for (const model of MODELS) {
  // Skip if already has publicId inside this model block
  const modelStart = schema.indexOf(`model ${model} {`);
  if (modelStart < 0) {
    console.warn(`SKIP missing model: ${model}`);
    continue;
  }
  const modelEnd = schema.indexOf("\n}", modelStart);
  const block = schema.slice(modelStart, modelEnd);
  if (/\bpublicId\b/.test(block)) {
    console.log(`OK already: ${model}`);
    continue;
  }

  // Insert after first `id ... @id @default(cuid())` line
  const idLineRe =
    /(model\s+\w+\s*\{[\s\S]*?\nid\s+String\s+@id\s+@default\(cuid\(\)\)[^\n]*)/;
  const localBlock = schema.slice(modelStart, modelEnd + 2);
  if (!/id\s+String\s+@id\s+@default\(cuid\(\)\)/.test(localBlock)) {
    console.warn(`SKIP no cuid id: ${model}`);
    continue;
  }

  const updatedBlock = localBlock.replace(
    /(id\s+String\s+@id\s+@default\(cuid\(\)\)[^\n]*)/,
    `$1\n  publicId        Int                       @unique @default(autoincrement())`,
  );

  schema = schema.slice(0, modelStart) + updatedBlock + schema.slice(modelEnd + 2);
  patched += 1;
  console.log(`PATCHED: ${model}`);
}

writeFileSync(schemaPath, schema);
console.log(`Done. Patched ${patched} models.`);
