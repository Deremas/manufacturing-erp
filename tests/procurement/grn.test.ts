import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  approveGoodsReceipt,
  createGoodsReceipt,
  postGoodsReceipt,
} from "@/services/procurement/grn.service";
import { getSuppliers } from "@/lib/master-data-db";

import {
  closeTestDatabase,
  countStockMovements,
  createInventoryTestContext,
  getStockBalance,
} from "../inventory/_helpers";

after(closeTestDatabase);

test("approved GRN posts purchase receipt stock through inventory integration", async () => {
  const context = await createInventoryTestContext();
  const suppliers = await getSuppliers();
  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  if (!suppliers[0]?.id) {
    throw new Error("Procurement GRN test requires at least one supplier");
  }

  const receipt = await createGoodsReceipt({
    grnDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    receivingLocationId: context.sourceLocationId,
    remarks: "procurement grn test",
    status: "SUBMITTED",
    createdById: context.adminUserId,
    lineItems: [{ itemId: context.itemId, receivedQty: 9, acceptedQty: 9, rejectedQty: 0, unitCost: 13 }],
  });

  await approveGoodsReceipt(receipt.id, context.adminUserId);
  await postGoodsReceipt(receipt.id, context.adminUserId);

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(after.quantity, before.quantity + 9);
  assert.equal(await countStockMovements(receipt.id, "PURCHASE_RECEIPT"), 1);
});
