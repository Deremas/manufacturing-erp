import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "crypto";

import {
  inventoryAdjustmentFromQC,
  inventoryFromProcurementGRN,
  inventoryFromSupplierReturn,
  inventoryIssueForSales,
  inventoryIssueToMaintenanceOrFleet,
  inventoryIssueToProduction,
  inventoryReceiveProduction,
  inventoryReturnFromMaintenanceOrFleet,
  inventorySalesReturn,
} from "@/services/inventory/module-integration.service";

import {
  countStockMovements,
  closeTestDatabase,
  createInventoryTestContext,
  ensureStock,
} from "./_helpers";

after(closeTestDatabase);

test("cross-module integration helpers post inventory movements for each module path", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 50, 10);

  const grnId = `grn-${randomUUID()}`;
  await inventoryFromProcurementGRN({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 6,
    unitCost: 9,
    grnId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(grnId, "PURCHASE_RECEIPT"), 1);

  const supplierReturnId = `supplier-return-${randomUUID()}`;
  await inventoryFromSupplierReturn({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 2,
    unitCost: 9,
    supplierReturnId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(supplierReturnId, "PURCHASE_RETURN"), 1);

  const productionIssueId = `production-issue-${randomUUID()}`;
  await inventoryIssueToProduction({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 4,
    unitCost: 10,
    productionOrderId: productionIssueId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(productionIssueId, "PRODUCTION_ISSUE"), 1);

  const productionReceiptId = `production-receipt-${randomUUID()}`;
  await inventoryReceiveProduction({
    itemId: context.itemId,
    locationId: context.destinationLocationId,
    quantity: 5,
    unitCost: 14,
    productionOrderId: productionReceiptId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(productionReceiptId, "PRODUCTION_RECEIPT"), 1);

  const salesInvoiceId = `sales-invoice-${randomUUID()}`;
  await inventoryIssueForSales({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 3,
    unitCost: 10,
    invoiceId: salesInvoiceId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(salesInvoiceId, "SALES_ISSUE"), 1);

  const salesReturnId = `sales-return-${randomUUID()}`;
  await inventorySalesReturn({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 1,
    unitCost: 10,
    returnId: salesReturnId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(salesReturnId, "SALES_RETURN"), 1);

  const maintenanceId = `maintenance-${randomUUID()}`;
  await inventoryIssueToMaintenanceOrFleet({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 2,
    unitCost: 10,
    sourceModule: "maintenance.work-order",
    sourceDocumentId: maintenanceId,
    createdById: context.adminUserId,
  });
  await inventoryReturnFromMaintenanceOrFleet({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 1,
    unitCost: 10,
    sourceModule: "maintenance.work-order",
    sourceDocumentId: maintenanceId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(maintenanceId, "STORE_ISSUE"), 1);
  assert.equal(await countStockMovements(maintenanceId, "STORE_RETURN"), 1);

  const fleetId = `fleet-${randomUUID()}`;
  await inventoryIssueToMaintenanceOrFleet({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    quantity: 2,
    unitCost: 10,
    sourceModule: "fleet.issue",
    sourceDocumentId: fleetId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(fleetId, "STORE_ISSUE"), 1);

  const qcId = `qc-${randomUUID()}`;
  await inventoryAdjustmentFromQC({
    itemId: context.itemId,
    locationId: context.quarantineLocationId,
    differenceQty: 2,
    unitCost: 10,
    qcDocumentId: qcId,
    createdById: context.adminUserId,
  });
  assert.equal(await countStockMovements(qcId, "ADJUSTMENT_IN"), 1);
});
