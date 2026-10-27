import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase, getStockBalance, postOpeningStock } from "../inventory/_helpers";
import { createProductionTestContext } from "../production/_helpers";
import { createQCHoldRelease, disposeQcHold, listHoldReleases, releaseQCHold } from "@/services/qc/hold-release.service";

after(closeTestDatabase);

test("Hold blocks release until QC passes", async () => {
  const context = await createProductionTestContext();
  await postOpeningStock({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    sourceModule: "qc.test",
    sourceDocumentId: `hold-${Date.now()}`,
    qtyIn: 10,
    qtyOut: 0,
    unitCost: 10,
    remarks: "QC hold reserve seed",
    createdById: context.adminUserId,
  });

  const before = await getStockBalance(context.fgItemId, context.outputLocationId);
  const hold = await createQCHoldRelease({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    quantity: 5,
    holdReason: "Awaiting QC",
    createdById: context.adminUserId,
  });

  const reserved = await getStockBalance(context.fgItemId, context.outputLocationId);
  assert.equal(reserved.availableQuantity, before.availableQuantity - 5);

  await releaseQCHold(hold.id, context.adminUserId, undefined, context.storeLocationId);
  const rows = await listHoldReleases();
  const updated = rows.find((row) => row.id === hold.id);
  assert.equal(updated?.status, "RELEASED");
  const after = await getStockBalance(context.fgItemId, context.outputLocationId);
  assert.equal(after.availableQuantity, before.availableQuantity);
});

test("partial disposition is traceable and an invalid remainder rolls back", async () => {
  const context = await createProductionTestContext();
  await postOpeningStock({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    sourceModule: "qc.test",
    sourceDocumentId: `partial-hold-${Date.now()}`,
    qtyIn: 8,
    qtyOut: 0,
    unitCost: 15,
    remarks: "Partial disposition seed",
    createdById: context.adminUserId,
  });
  const hold = await createQCHoldRelease({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    destinationLocationId: context.storeLocationId,
    quantity: 6,
    holdReason: "Partial release regression",
    createdById: context.adminUserId,
  });

  const partial = await disposeQcHold({
    holdId: hold.id,
    dispositionType: "RELEASE",
    quantity: 2,
    destinationLocationId: context.storeLocationId,
    reason: "Approved partial quantity",
    userId: context.adminUserId,
  });
  assert.equal(partial.status, "PARTIALLY_DISPOSED");
  assert.equal(partial.remainingQty, 4);

  const beforeRollback = await getStockBalance(context.fgItemId, context.outputLocationId);
  await assert.rejects(() => disposeQcHold({
    holdId: hold.id,
    dispositionType: "RELEASE",
    quantity: 5,
    destinationLocationId: context.storeLocationId,
    reason: "Must exceed remaining quantity",
    userId: context.adminUserId,
  }), /only 4 remains/i);
  const afterRollback = await getStockBalance(context.fgItemId, context.outputLocationId);
  assert.deepEqual(afterRollback, beforeRollback);
});
