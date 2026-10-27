import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getAccessibleReportGroups,
  userCanViewReportGroup,
} from "@/services/reports/report-access.service";

const baseUser = {
  id: "user-1",
  name: "Reports User",
  email: "reports@example.com",
  role: "User",
  permissions: [] as string[],
  accessibleLocationIds: ["loc-1"],
  isSystem: false,
};

test("report registry hides groups when the user has no reports permissions", () => {
  const groups = getAccessibleReportGroups(baseUser);
  assert.equal(groups.length, 0);
  assert.equal(userCanViewReportGroup(baseUser, "inventory"), false);
});

test("explicit report permissions scope visible groups", () => {
  const financeOnlyUser = {
    ...baseUser,
    permissions: ["reports.finance.view"],
  };

  const groups = getAccessibleReportGroups(financeOnlyUser);
  assert.equal(groups.some((group) => group.key === "finance"), true);
  assert.equal(groups.some((group) => group.key === "inventory"), false);
  assert.equal(userCanViewReportGroup(financeOnlyUser, "finance"), true);
  assert.equal(userCanViewReportGroup(financeOnlyUser, "inventory"), false);
});
