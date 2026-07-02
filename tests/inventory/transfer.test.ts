import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  createTransfer,
  getTransferById,
  postTransferDocument,
  updateTransfer,
} from "@/services/inventory/inventory-documents.service";

import {
  countStockMovements,
  closeTestDatabase,
  createInventoryTestContext,
  ensureStock,
  getStockBalance,
} from "./_helpers";

after(closeTestDatabase);

test("transfer posting creates TRANSFER_OUT and TRANSFER_IN and moves balances", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 40, 12);

  const sourceBefore = await getStockBalance(context.itemId, context.sourceLocationId);
  const destinationBefore = await getStockBalance(context.itemId, context.destinationLocationId);

  const transfer = await createTransfer({
    transferDate: new Date().toISOString(),
    fromLocationId: context.sourceLocationId,
    toLocationId: context.destinationLocationId,
    createdById: context.adminUserId,
    status: "APPROVED",
    lineItems: [{ itemId: context.itemId, quantity: 10, unitCost: sourceBefore.averageCost || 12 }],
  });

  await postTransferDocument(transfer.id, context.adminUserId);

  const sourceAfter = await getStockBalance(context.itemId, context.sourceLocationId);
  const destinationAfter = await getStockBalance(context.itemId, context.destinationLocationId);

  assert.equal(sourceAfter.quantity, sourceBefore.quantity - 10);
  assert.equal(destinationAfter.quantity, destinationBefore.quantity + 10);
  assert.equal(await countStockMovements(transfer.id, "TRANSFER_OUT"), 1);
  assert.equal(await countStockMovements(transfer.id, "TRANSFER_IN"), 1);
});

test("transfer cannot use same location and posted transfer cannot be edited", async () => {
  const context = await createInventoryTestContext();

  await assert.rejects(
    () =>
      createTransfer({
        transferDate: new Date().toISOString(),
        fromLocationId: context.sourceLocationId,
        toLocationId: context.sourceLocationId,
        createdById: context.adminUserId,
        status: "DRAFT",
        lineItems: [{ itemId: context.itemId, quantity: 1, unitCost: 10 }],
      }),
    /cannot be the same/,
  );

  await ensureStock(context, 20, 10);
  const transfer = await createTransfer({
    transferDate: new Date().toISOString(),
    fromLocationId: context.sourceLocationId,
    toLocationId: context.destinationLocationId,
    createdById: context.adminUserId,
    status: "APPROVED",
    lineItems: [{ itemId: context.itemId, quantity: 2, unitCost: 10 }],
  });
  await postTransferDocument(transfer.id, context.adminUserId);
  const posted = await getTransferById(transfer.id);
  assert.equal(posted?.status, "POSTED");

  await assert.rejects(
    () =>
      updateTransfer(transfer.id, {
        transferDate: new Date().toISOString(),
        fromLocationId: context.sourceLocationId,
        toLocationId: context.destinationLocationId,
        createdById: context.adminUserId,
        status: "DRAFT",
        lineItems: [{ itemId: context.itemId, quantity: 3, unitCost: 10 }],
      }),
    /cannot be edited/,
  );
});
