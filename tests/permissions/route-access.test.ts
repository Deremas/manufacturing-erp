import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequiredPermission,
  hasRouteAccess,
  isProtectedPath,
} from "@/lib/auth/route-access";

test("assets pages are protected and map to granular asset permissions", () => {
  assert.equal(isProtectedPath("/assets"), true);
  assert.equal(isProtectedPath("/assets/create"), true);
  assert.equal(getRequiredPermission("/assets", "GET"), "asset.master.view");
  assert.equal(getRequiredPermission("/assets/create", "GET"), "asset.master.create");
  assert.equal(getRequiredPermission("/assets/abc/edit", "GET"), "asset.master.update");
  assert.equal(getRequiredPermission("/assets/abc/assign", "GET"), "asset.assignment.create");
  assert.equal(getRequiredPermission("/assets/abc/transfer", "GET"), "asset.transfer.create");
  assert.equal(getRequiredPermission("/assets/abc/history", "GET"), "asset.lifecycle.viewHistory");
  assert.equal(getRequiredPermission("/assets/assignments", "GET"), "asset.assignment.view");
  assert.equal(getRequiredPermission("/assets/transfers/create", "GET"), "asset.transfer.create");
  assert.equal(getRequiredPermission("/assets/transfers/abc/edit", "GET"), "asset.transfer.update");
  assert.equal(getRequiredPermission("/assets/assignments/abc/return", "GET"), "asset.assignment.return");
  assert.equal(getRequiredPermission("/assets/abc/retire", "GET"), "asset.lifecycle.retire");
  assert.equal(getRequiredPermission("/assets/abc/dispose", "GET"), "asset.lifecycle.dispose");
  assert.equal(getRequiredPermission("/api/maintenance/asset-types/abc", "PUT"), "asset.master.update");
  assert.equal(getRequiredPermission("/api/maintenance/asset-categories/abc", "PUT"), "asset.master.update");
});

test("maintenance asset APIs map to asset.* instead of maintenance.view", () => {
  assert.equal(getRequiredPermission("/api/maintenance/assets", "GET"), "asset.master.view");
  assert.equal(getRequiredPermission("/api/maintenance/assets", "POST"), "asset.master.create");
  assert.equal(getRequiredPermission("/api/maintenance/assets/abc", "PUT"), "asset.master.update");
  assert.equal(getRequiredPermission("/api/maintenance/asset-assignments/abc", "PUT"), "asset.assignment.update");
  assert.equal(getRequiredPermission("/api/maintenance/asset-assignments/abc/reject", "POST"), "asset.assignment.reject");
  assert.equal(getRequiredPermission("/api/maintenance/asset-transfers/abc/post", "POST"), "asset.transfer.post");
  assert.equal(getRequiredPermission("/api/maintenance/assets/abc/lifecycle", "POST"), null);
});

test("hasRouteAccess honors wildcard, exact permission, and maintenance.view fallback on pages", () => {
  assert.equal(hasRouteAccess(["*"], "/assets", "GET"), true);
  assert.equal(hasRouteAccess(["asset.master.view"], "/assets", "GET"), true);
  assert.equal(hasRouteAccess(["maintenance.view"], "/assets", "GET"), true);
  assert.equal(hasRouteAccess(["maintenance.view"], "/assets/create", "GET"), false);
  assert.equal(hasRouteAccess(["maintenance.view"], "/api/maintenance/assets", "GET"), false);
  assert.equal(hasRouteAccess(["asset.master.view"], "/api/maintenance/assets", "GET"), true);
});

test("maintenance ticket, work order, PM, and downtime routes map to granular permissions", () => {
  assert.equal(getRequiredPermission("/maintenance/tickets", "GET"), "maintenance.ticket.view");
  assert.equal(getRequiredPermission("/maintenance/tickets/create", "GET"), "maintenance.ticket.create");
  assert.equal(getRequiredPermission("/maintenance/tickets/abc/close", "GET"), "maintenance.ticket.close");
  assert.equal(getRequiredPermission("/maintenance/tickets/abc/print", "GET"), "maintenance.ticket.print");
  assert.equal(getRequiredPermission("/api/maintenance/tickets", "POST"), "maintenance.ticket.create");
  assert.equal(getRequiredPermission("/api/maintenance/tickets/abc/submit", "POST"), "maintenance.ticket.submit");
  assert.equal(getRequiredPermission("/maintenance/work-orders/abc/close", "GET"), "maintenance.workOrder.close");
  assert.equal(getRequiredPermission("/api/maintenance/work-orders/abc/issue-parts", "POST"), "maintenance.workOrder.issueParts");
  assert.equal(getRequiredPermission("/maintenance/pm", "GET"), "maintenance.pm.view");
  assert.equal(getRequiredPermission("/maintenance/pm/history", "GET"), "maintenance.pm.view");
  assert.equal(getRequiredPermission("/api/maintenance/pm/generate-due", "POST"), "maintenance.pm.generateWorkOrder");
  assert.equal(getRequiredPermission("/production/downtime", "GET"), "production.downtime.view");
  assert.equal(getRequiredPermission("/production/downtime/abc/stop", "GET"), "production.downtime.stop");
  assert.equal(getRequiredPermission("/api/production/downtime", "POST"), "production.downtime.create");
  assert.equal(getRequiredPermission("/assets/abc/meter-readings", "GET"), "asset.master.view");
  assert.equal(getRequiredPermission("/api/maintenance/assets/abc/meter-readings", "GET"), "asset.master.view");
  assert.equal(getRequiredPermission("/api/maintenance/assets/abc/meter-readings", "POST"), "asset.master.update");
});

test("maintenance and downtime view pages fall back to module view, but APIs do not", () => {
  assert.equal(hasRouteAccess(["maintenance.view"], "/maintenance/tickets", "GET"), true);
  assert.equal(hasRouteAccess(["maintenance.view"], "/api/maintenance/tickets", "GET"), false);
  assert.equal(hasRouteAccess(["maintenance.ticket.view"], "/api/maintenance/tickets", "GET"), true);
  assert.equal(hasRouteAccess(["production.view"], "/production/downtime", "GET"), true);
  assert.equal(hasRouteAccess(["production.view"], "/api/production/downtime", "GET"), false);
});

test("procurement pages map to document permissions and coarse grants still open them", () => {
  assert.equal(getRequiredPermission("/procurement/requisitions", "GET"), "procurement.pr.view");
  assert.equal(getRequiredPermission("/procurement/requisitions/create", "GET"), "procurement.pr.create");
  assert.equal(getRequiredPermission("/procurement/requisitions/abc/edit", "GET"), "procurement.pr.update");
  assert.equal(getRequiredPermission("/procurement/requisitions/abc/approve", "GET"), "procurement.pr.approve");
  assert.equal(getRequiredPermission("/procurement/purchase-orders", "GET"), "procurement.po.view");
  assert.equal(hasRouteAccess(["procurement.view"], "/procurement/requisitions", "GET"), true);
  assert.equal(hasRouteAccess(["procurement.pr.view"], "/procurement/requisitions", "GET"), true);
  assert.equal(hasRouteAccess(["procurement.pr.view"], "/procurement/purchase-orders", "GET"), false);
  assert.equal(hasRouteAccess(["procurement.create"], "/procurement/requisitions/create", "GET"), true);
  assert.equal(hasRouteAccess(["procurement.view"], "/procurement/requisitions/create", "GET"), false);
  assert.equal(hasRouteAccess(["procurement.pr.view"], "/api/procurement/requisitions", "GET"), true);
});
