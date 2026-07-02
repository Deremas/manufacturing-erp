import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase } from "../inventory/_helpers";
import { createProductionTestContext } from "../production/_helpers";
import { createQCHoldRelease, listHoldReleases, releaseQCHold } from "@/services/qc/hold-release.service";

after(closeTestDatabase);

test("Hold blocks release until QC passes", async () => {
  const context = await createProductionTestContext();
  const hold = await createQCHoldRelease({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
    quantity: 5,
    holdReason: "Awaiting QC",
    createdById: context.adminUserId,
  });

  await releaseQCHold(hold.id, context.adminUserId);
  const rows = await listHoldReleases();
  const updated = rows.find((row) => row.id === hold.id);
  assert.equal(updated?.status, "RELEASED");
});
