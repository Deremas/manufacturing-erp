import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertUserCanUseSalesChannel,
  userCanUseSalesChannel,
} from "@/services/sales/sales-access.service";

const baseUser = {
  id: "user-agent-policy",
  name: "Scoped Sales User",
  email: "scoped@example.com",
  role: "Sales",
  permissions: [] as string[],
  accessibleLocationIds: ["loc-1"],
};

test("agent sales permission allows AGENT while blocking unrelated channels when scoped", () => {
  const user = {
    ...baseUser,
    permissions: ["sales.agent.use"],
  };

  assert.equal(userCanUseSalesChannel(user, "AGENT"), true);
  assert.equal(userCanUseSalesChannel(user, "FACTORY"), false);
  assert.equal(userCanUseSalesChannel(user, "TRUCK"), false);
  assert.throws(() => assertUserCanUseSalesChannel(user, "BRANCH"));
});

test("agent sales permission can be denied by the effective permission set", () => {
  const user = {
    ...baseUser,
    permissions: ["sales.factory.use"],
  };

  assert.equal(userCanUseSalesChannel(user, "AGENT"), false);
  assert.throws(() => assertUserCanUseSalesChannel(user, "AGENT"));
});
