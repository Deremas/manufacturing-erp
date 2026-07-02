import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  createAdjustment,
  postAdjustmentDocument,
} from "@/services/inventory/inventory-documents.service";

import {
  countStockMovements,
  closeTestDatabase,
  createInventoryTestContext,
  ensureStock,
  getStockBalance,
} from "./_helpers";

after(closeTestDatabase);

test("positive variance creates ADJUSTMENT_IN and negative variance creates ADJUSTMENT_OUT", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 30, 11);

  const before = await getStockBalance(context.itemId, context.sourceLocationId);
  const positive = await createAdjustment({
    adjustmentDate: new Date().toISOString(),
    locationId: context.sourceLocationId,
    reason: "positive variance",
    createdById: context.adminUserId,
    status: "APPROVED",
    lineItems: [{ itemId: context.itemId, systemQty: before.quantity, physicalQty: before.quantity + 4, differenceQty: 4, unitCost: 11 }],
  });
  await postAdjustmentDocument(positive.id, context.adminUserId);
  assert.equal(await countStockMovements(positive.id, "ADJUSTMENT_IN"), 1);

  const middle = await getStockBalance(context.itemId, context.sourceLocationId);
  const negative = await createAdjustment({
    adjustmentDate: new Date().toISOString(),
    locationId: context.sourceLocationId,
    reason: "negative variance",
    createdById: context.adminUserId,
    status: "APPROVED",
    lineItems: [{ itemId: context.itemId, systemQty: middle.quantity, physicalQty: middle.quantity - 3, differenceQty: -3, unitCost: middle.averageCost }],
  });
  await postAdjustmentDocument(negative.id, context.adminUserId);
  assert.equal(await countStockMovements(negative.id, "ADJUSTMENT_OUT"), 1);
});

test("zero variance adjustment creates no movement", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 12, 10);
  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  const adjustment = await createAdjustment({
    adjustmentDate: new Date().toISOString(),
    locationId: context.sourceLocationId,
    reason: "zero variance",
    createdById: context.adminUserId,
    status: "APPROVED",
    lineItems: [{ itemId: context.itemId, systemQty: before.quantity, physicalQty: before.quantity, differenceQty: 0, unitCost: before.averageCost }],
  });

  await postAdjustmentDocument(adjustment.id, context.adminUserId);
  assert.equal(await countStockMovements(adjustment.id), 0);
});
