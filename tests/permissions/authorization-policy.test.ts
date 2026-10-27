import assert from "node:assert/strict";
import test from "node:test";

import { assertUserScope } from "@/lib/auth/scope";
import {
  buildResourcePermission,
  checkPermission,
  getAction,
  getModule,
  getResource,
  hasGrantedPermission,
  permissionMatches,
} from "@/lib/permissions/permissions";
import { assertSegregation } from "@/services/approval/segregation";

const user = {
  id: "user-1", name: "Scoped User", email: "scoped@example.com", role: "operator", permissions: [],
  accessibleLocationIds: ["location-1"], accessibleDepartmentIds: ["department-1"],
};

test("resource permission keys preserve module, resource, and action", () => {
  const permission = buildResourcePermission("maintenance", "workOrder", "recordUsage");
  assert.equal(permission, "maintenance.workOrder.recordUsage");
  assert.equal(getModule(permission), "maintenance");
  assert.equal(getResource(permission), "workOrder");
  assert.equal(getAction(permission), "recordUsage");
});

test("location and department scope reject out-of-scope operations", () => {
  assert.doesNotThrow(() => assertUserScope(user, { locationId: "location-1", departmentId: "department-1" }));
  assert.throws(() => assertUserScope(user, { locationId: "location-2" }), /location.*scope/i);
  assert.throws(() => assertUserScope(user, { departmentId: "department-2" }), /department.*scope/i);
});

test("approval policy enforces maker-checker-approver separation", () => {
  assert.throws(() => assertSegregation({ actorId: "maker", makerId: "maker", action: "CHECK" }), /maker cannot check/i);
  assert.throws(() => assertSegregation({ actorId: "checker", checkerId: "checker", action: "APPROVE" }), /checker cannot approve/i);
  assert.throws(() => assertSegregation({ actorId: "approver", approverId: "approver", action: "POST" }), /approver cannot post/i);
});

test("coarse module grants cover matching resource permissions", () => {
  assert.equal(permissionMatches("*", "procurement.pr.approve"), true);
  assert.equal(permissionMatches("procurement.approve", "procurement.pr.approve"), true);
  assert.equal(permissionMatches("procurement.edit", "procurement.pr.update"), true);
  assert.equal(permissionMatches("procurement.pr.view", "procurement.po.view"), false);
  assert.equal(hasGrantedPermission(["procurement.view"], "procurement.pr.view"), true);
  assert.equal(
    checkPermission({ ...user, permissions: ["procurement.approve"] }, "procurement.pr.approve"),
    true,
  );
  assert.equal(
    checkPermission({ ...user, permissions: ["procurement.view"] }, "procurement.pr.approve"),
    false,
  );
});
