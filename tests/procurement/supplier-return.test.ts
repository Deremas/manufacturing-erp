import assert from "node:assert/strict";
import { after, test } from "node:test";

import { getSuppliers } from "@/lib/master-data-db";
import {
  approveGoodsReceipt,
  createGoodsReceipt,
  postGoodsReceipt,
} from "@/services/procurement/grn.service";
import {
  approveSupplierReturn,
  createSupplierReturn,
  postSupplierReturn,
} from "@/services/procurement/supplier-return.service";

import {
  closeTestDatabase,
  countStockMovements,
  createInventoryTestContext,
  getStockBalance,
} from "../inventory/_helpers";

after(closeTestDatabase);

test("approved supplier return posts purchase return stock out through inventory integration", async () => {
  const context = await createInventoryTestContext();
  const suppliers = await getSuppliers();

  if (!suppliers[0]?.id) {
    throw new Error("Supplier return test requires at least one supplier");
  }

  const receipt = await createGoodsReceipt({
    grnDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    receivingLocationId: context.sourceLocationId,
    remarks: "supplier return source receipt",
    status: "SUBMITTED",
    createdById: context.adminUserId,
    lineItems: [{ itemId: context.itemId, receivedQty: 10, acceptedQty: 10, rejectedQty: 0, unitCost: 12 }],
  });
  await approveGoodsReceipt(receipt.id, context.adminUserId);
  await postGoodsReceipt(receipt.id, context.adminUserId);

  const postedReceipt = await getStockBalance(context.itemId, context.sourceLocationId);
  const receiptDetail = await import("@/services/procurement/grn.service").then((mod) => mod.getGoodsReceiptById(receipt.id));
  if (!receiptDetail?.items[0]?.id) {
    throw new Error("Posted receipt detail not found for supplier return test");
  }

  const supplierReturn = await createSupplierReturn({
    returnDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    grnId: receipt.id,
    returnLocationId: context.sourceLocationId,
    reason: "damaged on inspection",
    remarks: "supplier return test",
    status: "SUBMITTED",
    createdById: context.adminUserId,
    lineItems: [{
      grnItemId: receiptDetail.items[0].id,
      itemId: context.itemId,
      returnQty: 4,
      unitCost: 12,
      reason: "damaged",
    }],
  });
  await approveSupplierReturn(supplierReturn.id, context.adminUserId);
  await postSupplierReturn(supplierReturn.id, context.adminUserId);

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(after.quantity, postedReceipt.quantity - 4);
  assert.equal(await countStockMovements(supplierReturn.id, "PURCHASE_RETURN"), 1);
});
