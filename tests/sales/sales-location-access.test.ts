import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertUserCanAccessLocation,
  assertUserCanManageLoadingAction,
  assertUserCanUseSalesChannel,
  filterLocationsForUser,
  userCanAccessLocation,
  userCanManageLoadingAction,
  userCanUseSalesChannel,
} from "@/services/sales/sales-access.service";

const baseUser = {
  id: "user-1",
  name: "Sales User",
  email: "sales@example.com",
  role: "Sales",
  permissions: [] as string[],
  accessibleLocationIds: ["loc-1"],
};

test("location access is limited to assigned locations", () => {
  assert.equal(userCanAccessLocation(baseUser, "loc-1"), true);
  assert.equal(userCanAccessLocation(baseUser, "loc-2"), false);
  assert.throws(() => assertUserCanAccessLocation(baseUser, "loc-2"));

  const filtered = filterLocationsForUser(baseUser, [
    { id: "loc-1", locationCode: "FAC-01", locationName: "Factory", isActive: true, locationType: "FACTORY" },
    { id: "loc-2", locationCode: "BR-01", locationName: "Branch", isActive: true, locationType: "BRANCH" },
  ]);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "loc-1");
});

test("explicit channel permissions block disallowed sales channels", () => {
  const restrictedUser = {
    ...baseUser,
    permissions: ["sales.branch.use"],
  };

  assert.equal(userCanUseSalesChannel(restrictedUser, "BRANCH"), true);
  assert.equal(userCanUseSalesChannel(restrictedUser, "FACTORY"), false);
  assert.throws(() => assertUserCanUseSalesChannel(restrictedUser, "TRUCK"));
});

test("explicit loading permissions block unauthorized loading actions", () => {
  const restrictedUser = {
    ...baseUser,
    permissions: ["sales.loading.create"],
  };

  assert.equal(userCanManageLoadingAction(restrictedUser, "create"), true);
  assert.equal(userCanManageLoadingAction(restrictedUser, "confirm"), false);
  assert.throws(() => assertUserCanManageLoadingAction(restrictedUser, "cancel"));
});
