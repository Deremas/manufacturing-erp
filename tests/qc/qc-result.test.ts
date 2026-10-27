import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase, postOpeningStock } from "../inventory/_helpers";
import { createProductionTestContext } from "../production/_helpers";
import { createQcTest } from "@/services/qc/qc.service";
import { createQCHoldRelease, releaseQCHold } from "@/services/qc/hold-release.service";

after(closeTestDatabase);

test("QC failed output cannot release", async () => {
  const context = await createProductionTestContext();
  await postOpeningStock({ itemId: context.fgItemId, locationId: context.outputLocationId, sourceModule: "qc.test", sourceDocumentId: `failed-${Date.now()}`, qtyIn: 2, qtyOut: 0, unitCost: 1, remarks: "Failed QC seed", createdById: context.adminUserId });
  const hold = await createQCHoldRelease({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    quantity: 2,
    destinationLocationId: context.storeLocationId,
    holdReason: "Failed visual test",
    createdById: context.adminUserId,
  });

  await createQcTest({
    testType: "cap-inspection",
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    sampleDate: new Date().toISOString(),
    result: "FAILED",
    status: "COMPLETED",
    testedById: context.adminUserId,
    parameters: [{ parameterName: "Visual", actualValue: "Failed", result: "FAILED" }],
  });

  await assert.rejects(() => releaseQCHold(hold.id, context.adminUserId), /cannot be released/i);
});

test("QC passed output can release", async () => {
  const context = await createProductionTestContext();
  await postOpeningStock({ itemId: context.fgItemId, locationId: context.outputLocationId, sourceModule: "qc.test", sourceDocumentId: `passed-${Date.now()}`, qtyIn: 3, qtyOut: 0, unitCost: 1, remarks: "Passed QC seed", createdById: context.adminUserId });
  const hold = await createQCHoldRelease({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    quantity: 3,
    destinationLocationId: context.storeLocationId,
    holdReason: "Awaiting microbial result",
    createdById: context.adminUserId,
  });

  await createQcTest({
    testType: "microbial-test",
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    sampleDate: new Date().toISOString(),
    result: "PASSED",
    status: "COMPLETED",
    testedById: context.adminUserId,
    parameters: [{ parameterName: "TPC", actualValue: "0", result: "PASSED" }],
  });

  await releaseQCHold(hold.id, context.adminUserId, undefined, context.storeLocationId);
  assert.ok(true);
});
