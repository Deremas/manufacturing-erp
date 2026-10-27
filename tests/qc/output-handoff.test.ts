import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase, getStockBalance } from "../inventory/_helpers";
import { createProductionTestContext } from "../production/_helpers";
import { startShiftSession } from "@/services/shift/shift-session.service";
import { createProductionBatch } from "@/services/production/production-batch.service";
import { createQcTest } from "@/services/qc/qc.service";

after(closeTestDatabase);

function uniqueProductionDate() {
  return new Date(Date.now() + (60 + Math.floor(Math.random() * 365)) * 24 * 60 * 60 * 1000).toISOString();
}

test("shift output -> QC pass -> production batch post", async () => {
  const context = await createProductionTestContext();
  const session = await startShiftSession({
    productionDate: uniqueProductionDate(),
    shiftCode: "SHIFT_QC_PASS",
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId, role: "Supervisor" }],
  });

  const before = await getStockBalance(context.fgItemId, context.outputLocationId);
  const batch = await createProductionBatch({
    shiftSessionId: session.id,
    finishedGoodId: context.fgItemId,
    locationId: context.outputLocationId,
    producedQty: 8,
    acceptedQty: 8,
    rejectedQty: 0,
    wastageQty: 0,
    createdById: context.adminUserId,
    status: "COMPLETED",
  });

  await createQcTest({
    testType: "water-test",
    productionBatchId: batch.id,
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    sampleDate: new Date().toISOString(),
    result: "PASSED",
    status: "COMPLETED",
    testedById: context.adminUserId,
    parameters: [{ parameterName: "pH", actualValue: "7.1", result: "PASSED" }],
  });

  const after = await getStockBalance(context.fgItemId, context.outputLocationId);
  assert.equal(after.quantity, before.quantity + 8);
});

test("shift output -> QC fail -> no stock release", async () => {
  const context = await createProductionTestContext();
  const session = await startShiftSession({
    productionDate: uniqueProductionDate(),
    shiftCode: "SHIFT_QC_FAIL",
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId, role: "Supervisor" }],
  });

  const before = await getStockBalance(context.fgItemId, context.outputLocationId);
  const batch = await createProductionBatch({
    shiftSessionId: session.id,
    finishedGoodId: context.fgItemId,
    locationId: context.outputLocationId,
    producedQty: 6,
    acceptedQty: 6,
    rejectedQty: 0,
    wastageQty: 0,
    createdById: context.adminUserId,
    status: "COMPLETED",
  });

  await createQcTest({
    testType: "water-test",
    productionBatchId: batch.id,
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    sampleDate: new Date().toISOString(),
    result: "FAILED",
    status: "COMPLETED",
    testedById: context.adminUserId,
    parameters: [{ parameterName: "pH", actualValue: "4.2", result: "FAILED" }],
  });

  const after = await getStockBalance(context.fgItemId, context.outputLocationId);
  assert.equal(after.quantity, before.quantity);
});
