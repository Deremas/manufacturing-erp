import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "crypto";

import {
  issueForSales,
  postTransfer,
  receivePurchase,
} from "@/services/inventory/inventory-posting.service";

import {
  createInventoryTestContext,
  closeTestDatabase,
  getStockBalance,
} from "./_helpers";

after(closeTestDatabase);

test("purchase receipt recalculates weighted average cost and OUT movement keeps average cost", async () => {
  const context = await createInventoryTestContext();
  const openingDocumentId = `avg-open-${randomUUID()}`;

  await receivePurchase({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    sourceModule: "inventory.test.average-cost",
    sourceDocumentId: openingDocumentId,
    qtyIn: 10,
    qtyOut: 0,
    unitCost: 10,
    createdById: context.adminUserId,
  });

  await receivePurchase({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    sourceModule: "inventory.test.average-cost",
    sourceDocumentId: `avg-in-${randomUUID()}`,
    qtyIn: 10,
    qtyOut: 0,
    unitCost: 20,
    createdById: context.adminUserId,
  });

  const afterReceipt = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(afterReceipt.averageCost, 15);

  await issueForSales({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    sourceModule: "inventory.test.average-cost",
    sourceDocumentId: `avg-out-${randomUUID()}`,
    qtyIn: 5,
    qtyOut: 0,
    unitCost: afterReceipt.averageCost,
    createdById: context.adminUserId,
  });

  const afterIssue = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(afterIssue.averageCost, 15);
});

test("transfer IN uses source average cost", async () => {
  const context = await createInventoryTestContext();

  await receivePurchase({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    sourceModule: "inventory.test.average-cost",
    sourceDocumentId: `avg-transfer-${randomUUID()}`,
    qtyIn: 8,
    qtyOut: 0,
    unitCost: 18,
    createdById: context.adminUserId,
  });

  const beforeTransfer = await getStockBalance(context.itemId, context.sourceLocationId);
  await postTransfer({
    itemId: context.itemId,
    fromLocationId: context.sourceLocationId,
    toLocationId: context.destinationLocationId,
    quantity: 3,
    unitCost: beforeTransfer.averageCost,
    createdById: context.adminUserId,
    sourceDocumentId: `avg-transfer-doc-${randomUUID()}`,
  });

  const destination = await getStockBalance(context.itemId, context.destinationLocationId);
  assert.equal(destination.averageCost, beforeTransfer.averageCost);
});
