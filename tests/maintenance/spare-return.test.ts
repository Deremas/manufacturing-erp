import assert from "node:assert/strict";
import { after, test } from "node:test";

import { countStockMovements, getStockBalance } from "../inventory/_helpers";
import { getWorkOrderById, issueWorkOrderParts, returnWorkOrderParts } from "@/services/maintenance/maintenance.service";

import { closeTestDatabase, createMaintenanceTestContext, seedMaintenanceSpareStock } from "./_helpers";

after(closeTestDatabase);

test("maintenance spare return posts inventory return and restores store stock", async () => {
  const context = await createMaintenanceTestContext();
  await seedMaintenanceSpareStock(context, 15, 12);

  const workOrder = await getWorkOrderById(context.workOrderId);
  const partId = workOrder?.parts[0]?.id;
  if (!partId) {
    throw new Error("Expected maintenance work order part");
  }

  await issueWorkOrderParts({
    workOrderId: context.workOrderId,
    createdById: context.adminUserId,
    lines: [{ partId, quantity: 4, unitCost: 12, remarks: "Issue before return" }],
  });

  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  const updated = await returnWorkOrderParts({
    workOrderId: context.workOrderId,
    createdById: context.adminUserId,
    lines: [{ partId, quantity: 1, unitCost: 12, remarks: "Unused spare returned" }],
  });

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  const part = updated?.parts[0];

  assert.ok(updated);
  assert.equal(part?.issuedQty, 4);
  assert.equal(part?.returnedQty, 1);
  assert.equal(part?.usedQty, 3);
  assert.equal(after.quantity, before.quantity + 1);
  assert.equal(await countStockMovements(context.workOrderId, "STORE_RETURN"), 1);
});
