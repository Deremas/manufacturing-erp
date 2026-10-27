import assert from "node:assert/strict";
import { after, test } from "node:test";

import { countStockMovements, getStockBalance } from "../inventory/_helpers";
import { getWorkOrderById, issueWorkOrderParts } from "@/services/maintenance/maintenance.service";

import { closeTestDatabase, createMaintenanceTestContext, seedMaintenanceSpareStock } from "./_helpers";

after(closeTestDatabase);

test("maintenance spare issue posts inventory issue and updates work order part usage", async () => {
  const context = await createMaintenanceTestContext();
  await seedMaintenanceSpareStock(context, 12, 12);

  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  const updated = await issueWorkOrderParts({
    workOrderId: context.workOrderId,
    createdById: context.adminUserId,
    lines: [
      {
        partId: (await getWorkOrderById(context.workOrderId))!.parts[0].id,
        quantity: 3,
        unitCost: 12,
        remarks: "Issued by maintenance test",
      },
    ],
  });

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  const part = updated?.parts[0];

  assert.ok(updated);
  assert.ok(part?.stockIssueId);
  assert.equal(part?.issuedQty, 3);
  assert.equal(part?.usedQty, 3);
  assert.equal(after.quantity, before.quantity - 3);
  assert.equal(await countStockMovements(context.workOrderId, "STORE_ISSUE"), 1);
});
