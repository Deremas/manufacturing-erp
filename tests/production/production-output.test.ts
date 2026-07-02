import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase, getStockBalance } from "../inventory/_helpers";
import { createProductionTestContext } from "./_helpers";
import { startShiftSession } from "@/services/shift/shift-session.service";
import { createProductionBatch, postProductionBatch } from "@/services/production/production-batch.service";

after(closeTestDatabase);

function uniqueProductionDate() {
  return new Date(Date.now() + (30 + Math.floor(Math.random() * 365)) * 24 * 60 * 60 * 1000).toISOString();
}

test("Finished goods output increases FG stock", async () => {
  const context = await createProductionTestContext();
  const session = await startShiftSession({
    productionDate: uniqueProductionDate(),
    shiftCode: "SHIFT_C",
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId, role: "Supervisor" }],
  });

  const before = await getStockBalance(context.fgItemId, context.outputLocationId);
  const batch = await createProductionBatch({
    shiftSessionId: session.id,
    finishedGoodId: context.fgItemId,
    locationId: context.outputLocationId,
    producedQty: 20,
    acceptedQty: 20,
    rejectedQty: 0,
    wastageQty: 0,
    createdById: context.adminUserId,
    status: "COMPLETED",
  });
  await postProductionBatch(batch.id, context.adminUserId);

  const after = await getStockBalance(context.fgItemId, context.outputLocationId);
  assert.equal(after.quantity, before.quantity + 20);
});
