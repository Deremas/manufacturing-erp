import assert from "node:assert/strict";
import { after, test } from "node:test";

import { getAssetById } from "@/services/maintenance/maintenance.service";

import { closeTestDatabase, createMaintenanceTestContext } from "./_helpers";

after(closeTestDatabase);

test("asset create flow stores real DB-backed maintenance assets", async () => {
  const context = await createMaintenanceTestContext();

  const asset = await getAssetById(context.assetId);

  assert.ok(asset);
  assert.equal(asset?.id, context.assetId);
  assert.equal(asset?.locationId, context.sourceLocationId);
  assert.equal(asset?.status, "ACTIVE");
  assert.equal(asset?.criticality, "HIGH");
});
