import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "crypto";

import { postTransfer } from "@/services/inventory/inventory-posting.service";

import {
  countStockMovements,
  closeTestDatabase,
  createInventoryTestContext,
  ensureStock,
  getStockBalance,
} from "./_helpers";

after(closeTestDatabase);

test("failed transfer rolls back without leaving partial movement or destination stock change", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 5, 10);

  const sourceBefore = await getStockBalance(context.itemId, context.sourceLocationId);
  const destinationBefore = await getStockBalance(context.itemId, context.destinationLocationId);
  const sourceDocumentId = `rollback-transfer-${randomUUID()}`;

  await assert.rejects(
    () =>
      postTransfer({
        itemId: context.itemId,
        fromLocationId: context.sourceLocationId,
        toLocationId: context.destinationLocationId,
        quantity: sourceBefore.availableQuantity + 100,
        unitCost: sourceBefore.averageCost || 10,
        createdById: context.adminUserId,
        sourceDocumentId,
      }),
    /Insufficient available stock/,
  );

  const sourceAfter = await getStockBalance(context.itemId, context.sourceLocationId);
  const destinationAfter = await getStockBalance(context.itemId, context.destinationLocationId);

  assert.equal(sourceAfter.quantity, sourceBefore.quantity);
  assert.equal(destinationAfter.quantity, destinationBefore.quantity);
  assert.equal(await countStockMovements(sourceDocumentId), 0);
});
