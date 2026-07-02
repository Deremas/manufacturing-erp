import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  createReturn,
  postReturnDocument,
} from "@/services/inventory/inventory-documents.service";

import {
  countStockMovements,
  closeTestDatabase,
  createInventoryTestContext,
  getStockBalance,
} from "./_helpers";

after(closeTestDatabase);

test("return creates STORE_RETURN and increases stock", async () => {
  const context = await createInventoryTestContext();
  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  const returnDoc = await createReturn({
    returnDate: new Date().toISOString(),
    locationId: context.sourceLocationId,
    returnedFromType: "Department",
    returnedFromId: context.departmentId,
    reason: "unused return",
    createdById: context.adminUserId,
    status: "APPROVED",
    lineItems: [{ itemId: context.itemId, quantity: 7, unitCost: 8 }],
  });

  await postReturnDocument(returnDoc.id, context.adminUserId);

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(after.quantity, before.quantity + 7);
  assert.equal(await countStockMovements(returnDoc.id, "STORE_RETURN"), 1);
});
