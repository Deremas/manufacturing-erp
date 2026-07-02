import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "crypto";

import { postStockMovement } from "@/services/inventory/inventory-posting.service";

import {
  countAuditLogs,
  closeTestDatabase,
  countDocumentHistory,
  createInventoryTestContext,
  ensureStock,
  getStockBalance,
} from "./_helpers";

after(closeTestDatabase);

test("IN movement increases stock balance and records audit/history", async () => {
  const context = await createInventoryTestContext();
  const before = await getStockBalance(context.itemId, context.sourceLocationId);
  const sourceDocumentId = `posting-in-${randomUUID()}`;

  const result = await postStockMovement({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    movementType: "PURCHASE_RECEIPT",
    sourceModule: "inventory.test.posting",
    sourceDocumentId,
    qtyIn: 12,
    qtyOut: 0,
    unitCost: 14,
    remarks: "posting test in",
    createdById: context.adminUserId,
  });

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(after.quantity, before.quantity + 12);
  assert.equal(result.quantity, after.quantity);
  assert.ok((await countAuditLogs(result.movementNumber, "inventory")) >= 1);
  assert.ok((await countDocumentHistory("inventory.test.posting", sourceDocumentId)) >= 1);
});

test("OUT movement decreases stock balance and blocks over-issue", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 25, 10);
  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  await postStockMovement({
    itemId: context.itemId,
    locationId: context.sourceLocationId,
    movementType: "STORE_ISSUE",
    sourceModule: "inventory.test.posting",
    sourceDocumentId: `posting-out-${randomUUID()}`,
    qtyIn: 0,
    qtyOut: 8,
    unitCost: before.averageCost || 10,
    remarks: "posting test out",
    createdById: context.adminUserId,
  });

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(after.quantity, before.quantity - 8);

  await assert.rejects(
    () =>
      postStockMovement({
        itemId: context.itemId,
        locationId: context.sourceLocationId,
        movementType: "STORE_ISSUE",
        sourceModule: "inventory.test.posting",
        sourceDocumentId: `posting-over-${randomUUID()}`,
        qtyIn: 0,
        qtyOut: after.availableQuantity + 9999,
        unitCost: after.averageCost || 10,
        createdById: context.adminUserId,
      }),
    /Insufficient available stock/,
  );
});
