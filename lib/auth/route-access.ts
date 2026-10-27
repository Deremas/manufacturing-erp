import { hasGrantedPermission, hasModulePermission, parsePermission } from "@/lib/permissions/permissions";

const MODULES = new Set([
  "administration",
  "master-data",
  "procurement",
  "inventory",
  "production",
  "sales",
  "finance",
  "accounting",
  "hr",
  "fleet",
  "maintenance",
  "reports",
  "qc",
  "shifts",
  "assets",
]);

const PUBLIC_PATHS = ["/auth/login"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return false;
  if (isPublicPath(pathname)) return false;
  if (pathname === "/" || pathname === "/dashboard") return true;
  if (pathname === "/approval-inbox") return true;
  if (pathname === "/production-bin-cards" || pathname.startsWith("/production-bin-cards/")) return true;
  if (pathname.startsWith("/api/")) return true;
  return MODULES.has(pathname.split("/").filter(Boolean)[0] ?? "");
}

function canAccessApprovalInboxRoute(permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  return permissions.some((permission) => permission.endsWith(".approve"));
}

function getModuleAndAction(
  pathname: string,
  method: string,
): { module: string; action: string | null } | null {
  const parts = pathname.split("/").filter(Boolean);
  const offset = parts[0] === "api" ? 1 : 0;
  const module = parts[offset];
  if (!module || !MODULES.has(module)) return null;

  let action = "view";
  if (method === "DELETE" || parts.includes("delete")) action = "delete";
  else if (parts.includes("create")) action = "create";
  else if (parts.includes("edit")) action = "edit";
  else if (parts.includes("approve")) action = "approve";
  else if (parts.includes("reject")) action = "reject";
  else if (parts.includes("cancel")) action = "cancel";
  else if (parts.includes("post")) action = "post";
  else if (parts.includes("submit")) action = "update";
  else if (parts.includes("print")) action = "print";
  else if (parts.includes("export")) action = "export";

  return { module, action };
}

function resourceActionFromRest(rest: string[]): string {
  if (rest.includes("delete")) return "delete";
  if (rest.includes("create")) return "create";
  if (rest.includes("edit")) return "update";
  if (rest.includes("approve")) return "approve";
  if (rest.includes("reject")) return "reject";
  if (rest.includes("cancel")) return "cancel";
  if (rest.includes("post")) return "post";
  if (rest.includes("submit")) return "update";
  if (rest.includes("print")) return "print";
  if (rest.includes("export")) return "export";
  return "view";
}

const DOCUMENT_PAGE_PREFIXES: Array<[string, string]> = [
  ["/procurement/requisitions", "procurement.pr"],
  ["/procurement/purchase-orders", "procurement.po"],
  ["/procurement/grn", "procurement.grn"],
  ["/procurement/supplier-returns", "procurement.supplierReturn"],
  ["/procurement/supplier-invoices", "procurement.invoice"],
  ["/procurement/payments", "procurement.payment"],
  ["/inventory/transfers", "inventory.transfer"],
  ["/inventory/adjustments", "inventory.adjustment"],
  ["/inventory/issues", "inventory.issue"],
  ["/inventory/returns", "inventory.return"],
  ["/inventory/ret", "inventory.return"],
  ["/inventory/requisitions", "inventory.srv"],
  ["/inventory/srv", "inventory.srv"],
  ["/sales/loading", "sales.loading"],
];

function getDocumentPagePermission(pathname: string): string | undefined {
  if (pathname.startsWith("/api/")) return undefined;
  const match = DOCUMENT_PAGE_PREFIXES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!match) return undefined;
  const rest = pathname.slice(match[0].length).split("/").filter(Boolean);
  return `${match[1]}.${resourceActionFromRest(rest)}`;
}

function granularCoversCoarse(granted: string, required: string): boolean {
  const g = parsePermission(granted);
  const r = parsePermission(required);
  if (!g.module || g.module !== r.module) return false;
  const sameAction =
    (g.action === "edit" ? "update" : g.action) === (r.action === "edit" ? "update" : r.action);
  return sameAction && Boolean(g.resource && !r.resource);
}

function assetPagePermission(rest: string[]): string {
  const [first, second, third] = rest;
  if (!first) return "asset.master.view";
  if (first === "create") return "asset.master.create";
  if (first === "types" || first === "categories" || first === "setup") return "asset.master.view";
  if (first === "assignments") {
    if (second === "create") return "asset.assignment.create";
    if (third === "edit" || second === "edit") return "asset.assignment.update";
    if (third === "return") return "asset.assignment.return";
    return "asset.assignment.view";
  }
  if (first === "transfers") {
    if (second === "create") return "asset.transfer.create";
    if (third === "edit") return "asset.transfer.update";
    return "asset.transfer.view";
  }
  if (second === "edit") return "asset.master.update";
  if (second === "print") return "asset.master.view";
  if (second === "assign") return "asset.assignment.create";
  if (second === "transfer") return "asset.transfer.create";
  if (second === "history") return "asset.lifecycle.viewHistory";
  if (second === "meter-readings") return "asset.master.view";
  if (second === "retire") return "asset.lifecycle.retire";
  if (second === "dispose") return "asset.lifecycle.dispose";
  if (second === "reactivate") return "asset.lifecycle.reactivate";
  return "asset.master.view";
}

function assetApiPermission(rest: string[], method: string): string | null {
  const [resource, id, sub] = rest;
  if (resource === "asset-types" || resource === "asset-categories") {
    if (method === "POST") return "asset.master.create";
    if (method === "PUT") return "asset.master.update";
    return "asset.master.view";
  }
  if (resource === "assets") {
    if (sub === "lifecycle") return null;
    if (sub === "meter-readings") return method === "POST" ? "asset.master.update" : "asset.master.view";
    if (sub === "spare-parts") return method === "GET" ? "asset.master.view" : "asset.master.update";
    if (sub === "history") return "asset.lifecycle.viewHistory";
    if (!id) return method === "POST" ? "asset.master.create" : "asset.master.view";
    if (method === "PUT") return "asset.master.update";
    return "asset.master.view";
  }
  if (resource === "asset-assignments") {
    if (!id) return method === "POST" ? "asset.assignment.create" : "asset.assignment.view";
    if (method === "PUT") return "asset.assignment.update";
    if (sub === "return") return "asset.assignment.return";
    if (sub) return `asset.assignment.${sub}`;
    return "asset.assignment.view";
  }
  if (resource === "asset-transfers") {
    if (!id) return method === "POST" ? "asset.transfer.create" : "asset.transfer.view";
    if (method === "PUT") return "asset.transfer.update";
    if (sub) return `asset.transfer.${sub}`;
    return "asset.transfer.view";
  }
  return null;
}

export function getAssetRoutePermission(pathname: string, method: string): string | null | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "api" && parts[1] === "maintenance") {
    const resource = parts[2];
    if (
      resource === "assets" ||
      resource === "asset-types" ||
      resource === "asset-categories" ||
      resource === "asset-assignments" ||
      resource === "asset-transfers"
    ) {
      return assetApiPermission(parts.slice(2), method);
    }
    return undefined;
  }
  if (parts[0] === "assets") return assetPagePermission(parts.slice(1));
  if (parts[0] === "maintenance" && parts[1] === "assets") return assetPagePermission(parts.slice(2));
  return undefined;
}

function ticketPagePermission(rest: string[]): string {
  const [first, second] = rest;
  if (!first) return "maintenance.ticket.view";
  if (first === "create") return "maintenance.ticket.create";
  if (second === "edit") return "maintenance.ticket.update";
  if (second === "assign") return "maintenance.ticket.assign";
  if (second === "close") return "maintenance.ticket.close";
  if (second === "print") return "maintenance.ticket.print";
  return "maintenance.ticket.view";
}

function workOrderPagePermission(rest: string[]): string {
  const [first, second] = rest;
  if (!first) return "maintenance.workOrder.view";
  if (first === "create") return "maintenance.workOrder.create";
  if (second === "edit") return "maintenance.workOrder.update";
  if (second === "assign") return "maintenance.workOrder.assign";
  if (second === "close") return "maintenance.workOrder.close";
  if (second === "complete") return "maintenance.workOrder.complete";
  if (second === "print") return "maintenance.workOrder.print";
  if (second === "cancel") return "maintenance.workOrder.cancel";
  if (second === "reopen") return "maintenance.workOrder.start";
  return "maintenance.workOrder.view";
}

function pmPagePermission(rest: string[]): string {
  const [first, second] = rest;
  if (!first || first === "due" || first === "calendar" || first === "history") return "maintenance.pm.view";
  if (first === "create") return "maintenance.pm.create";
  if (second === "edit") return "maintenance.pm.update";
  if (second === "print") return "maintenance.pm.print";
  return "maintenance.pm.view";
}

function ticketApiPermission(rest: string[], method: string): string {
  const [, id, sub] = rest;
  if (!id) return method === "POST" ? "maintenance.ticket.create" : "maintenance.ticket.view";
  if (method === "PUT") return "maintenance.ticket.update";
  if (sub) return `maintenance.ticket.${sub}`;
  return "maintenance.ticket.view";
}

function workOrderApiPermission(rest: string[], method: string): string {
  const [, id, sub] = rest;
  if (!id) return method === "POST" ? "maintenance.workOrder.create" : "maintenance.workOrder.view";
  if (method === "PUT") return "maintenance.workOrder.update";
  if (!sub) return "maintenance.workOrder.view";
  if (sub === "issue-parts") return "maintenance.workOrder.issueParts";
  if (sub === "return-parts") return "maintenance.workOrder.returnParts";
  if (sub === "spare-requests") return method === "GET" ? "maintenance.spareRequest.view" : "maintenance.spareRequest.create";
  if (sub === "check-in" || sub === "reopen") return "maintenance.workOrder.start";
  if (sub === "check-out") return "maintenance.workOrder.recordLabor";
  if (sub === "execution") return method === "GET" ? "maintenance.workOrder.view" : "maintenance.workOrder.update";
  if (sub === "pm-checklist") return method === "GET" ? "maintenance.pm.view" : "maintenance.pm.recordChecklist";
  if (sub === "usage") return "maintenance.workOrder.update";
  return `maintenance.workOrder.${sub.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;
}

function pmApiPermission(rest: string[], method: string): string {
  const [, second, third, fourth] = rest;
  if (!second) return method === "POST" ? "maintenance.pm.create" : "maintenance.pm.view";
  if (second === "generate-due") return "maintenance.pm.generateWorkOrder";
  if (second === "automation") return "maintenance.pm.generateWorkOrder";
  if (second === "reschedule" && fourth) return `maintenance.pm.${fourth}Reschedule`;
  if (third === "reschedule") return "maintenance.pm.reschedule";
  if (method === "PUT") return "maintenance.pm.update";
  return "maintenance.pm.view";
}

export function getMaintenanceRoutePermission(pathname: string, method: string): string | null | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "api" && parts[1] === "maintenance") {
    const resource = parts[2];
    if (resource === "tickets") return ticketApiPermission(parts.slice(2), method);
    if (resource === "work-orders") return workOrderApiPermission(parts.slice(2), method);
    if (resource === "pm") return pmApiPermission(parts.slice(2), method);
    return undefined;
  }
  if (parts[0] === "maintenance") {
    if (!parts[1]) return "maintenance.view";
    if (parts[1] === "tickets") return ticketPagePermission(parts.slice(2));
    if (parts[1] === "work-orders") return workOrderPagePermission(parts.slice(2));
    if (parts[1] === "pm") return pmPagePermission(parts.slice(2));
    return undefined;
  }
  return undefined;
}

function downtimePagePermission(rest: string[]): string {
  const [first, second] = rest;
  if (!first) return "production.downtime.view";
  if (first === "create") return "production.downtime.create";
  if (second === "edit") return "production.downtime.update";
  if (second === "close") return "production.downtime.close";
  if (second === "stop") return "production.downtime.stop";
  if (second === "create-ticket") return "production.downtime.createMaintenanceTicket";
  if (second === "cancel") return "production.downtime.cancel";
  return "production.downtime.view";
}

export function getProductionDowntimeRoutePermission(pathname: string, method: string): string | null | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "api" && parts[1] === "production" && parts[2] === "downtime") {
    const [, , , id, sub] = parts;
    if (!id || id === "reference-data") return method === "POST" ? "production.downtime.create" : "production.downtime.view";
    if (method === "PUT") return "production.downtime.update";
    if (sub === "stop") return "production.downtime.stop";
    if (sub === "close") return "production.downtime.close";
    if (sub === "create-ticket") return "production.downtime.createMaintenanceTicket";
    if (sub === "cancel") return "production.downtime.cancel";
    return "production.downtime.view";
  }
  if (parts[0] === "production" && parts[1] === "downtime") return downtimePagePermission(parts.slice(2));
  return undefined;
}

const QC_PAGE_RESOURCES: Record<string, string> = {
  "daily-records": "daily",
  "master-data": "setup",
  water: "water",
  "water-test": "water",
  "raw-water": "water",
  "chlorine-residual": "chlorine",
  "treatment-monitoring": "treatment",
  physicochemical: "physicochemical",
  microbial: "microbial",
  "microbial-test": "microbial",
  preform: "preform",
  "preform-inspection": "preform",
  handle: "handle",
  "handle-inspection": "handle",
  cap: "cap",
  "cap-inspection": "cap",
  packaging: "packaging",
  cip: "cip",
  "retention-samples": "retention",
  "hold-release": "hold",
  "inventory-holds": "hold",
  nonconformity: "nc",
  "management-review": "review",
  "internal-audit": "audit",
  "corrective-action": "capa",
  tasks: "task",
  setup: "setup",
  "production-output": "task",
};

function qcActionFromRest(rest: string[], method: string) {
  if (rest.includes("create")) return "create";
  if (rest.includes("edit")) return "update";
  if (rest.includes("print")) return "print";
  if (method === "POST" && ["submit", "check", "approve", "reject", "cancel"].some((action) => rest.includes(action))) {
    return rest.find((part) => ["submit", "check", "approve", "reject", "cancel"].includes(part)) ?? "view";
  }
  return "view";
}

export function getQcRoutePermission(pathname: string, method: string): string | null | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "api" && parts[1] === "qc") {
    const resource = parts[2];
    if (resource === "dashboard") return "qc.dashboard.view";
    if (resource === "daily") return method === "GET" ? "qc.daily.view" : "qc.daily.export";
    if (resource === "master") return method === "PUT" ? "qc.setup.update" : "qc.setup.view";
    if (resource === "records") return null;
    if (resource === "cip") return `qc.cip.${method === "POST" && !parts[3] ? "create" : parts[4] === "submit" ? "submit" : method === "PUT" ? "update" : "view"}`;
    if (resource === "retention-samples") return `qc.retention.${method === "POST" ? "create" : method === "PUT" ? "update" : "view"}`;
    if (resource === "hold-decisions") return `qc.hold.${method === "POST" && !parts[3] ? "create" : method === "PUT" ? "update" : method === "POST" ? "approve" : "view"}`;
    if (resource === "management-reviews") return `qc.review.${method === "POST" && !parts[3] ? "create" : method === "PUT" ? "update" : "view"}`;
    if (resource === "internal-audits") return `qc.audit.${method === "POST" ? "create" : method === "PUT" ? "update" : "view"}`;
    if (resource === "corrective-actions") return `qc.capa.${method === "POST" && !parts[3] ? "create" : method === "PUT" ? "update" : "view"}`;
    return undefined;
  }
  if (parts[0] === "qc") {
    if (!parts[1]) return "qc.dashboard.view";
    const resource = QC_PAGE_RESOURCES[parts[1]];
    if (!resource) return "qc.view";
    const action = qcActionFromRest(parts.slice(2), method);
    if (resource === "daily") return action === "view" ? "qc.daily.view" : "qc.daily.export";
    if (resource === "setup" && action === "view") return "qc.setup.view";
    if (resource === "task") return action === "view" ? "qc.task.view" : `qc.task.${action}`;
    return `qc.${resource}.${action === "update" ? "update" : action}`;
  }
  return undefined;
}

export function getRequiredPermission(
  pathname: string,
  method: string,
): string | null {
  if (pathname === "/" || pathname === "/dashboard") return null;
  if (pathname === "/production-bin-cards" || pathname.startsWith("/production-bin-cards/")) {
    return "inventory.view";
  }
  if (pathname.startsWith("/auth")) return null;
  if (pathname.startsWith("/api/auth")) return null;

  const assetPermission = getAssetRoutePermission(pathname, method);
  if (assetPermission !== undefined) return assetPermission ?? null;

  const maintenancePermission = getMaintenanceRoutePermission(pathname, method);
  if (maintenancePermission !== undefined) return maintenancePermission ?? null;

  const downtimePermission = getProductionDowntimeRoutePermission(pathname, method);
  if (downtimePermission !== undefined) return downtimePermission ?? null;

  const qcPermission = getQcRoutePermission(pathname, method);
  if (qcPermission !== undefined) return qcPermission ?? null;

  const documentPermission = getDocumentPagePermission(pathname);
  if (documentPermission) return documentPermission;

  const access = getModuleAndAction(pathname, method);
  if (!access) return null;
  return `${access.module}.${access.action}`;
}

function isAssetViewPermission(permission: string) {
  return (
    permission === "asset.master.view" ||
    permission === "asset.assignment.view" ||
    permission === "asset.transfer.view" ||
    permission === "asset.lifecycle.viewHistory"
  );
}

function isQcViewPermission(permission: string) {
  return permission.startsWith("qc.") && permission.endsWith(".view");
}

function isMaintenanceViewPermission(permission: string) {
  return (
    permission === "maintenance.ticket.view" ||
    permission === "maintenance.workOrder.view" ||
    permission === "maintenance.pm.view" ||
    permission === "maintenance.view"
  );
}

export function hasRouteAccess(
  permissions: string[],
  pathname: string,
  method: string,
): boolean {
  if (permissions.includes("*")) return true;

  if (pathname === "/approval-inbox" || pathname.startsWith("/approval-inbox/")) {
    return canAccessApprovalInboxRoute(permissions);
  }

  const parts = pathname.split("/").filter(Boolean);
  if (
    !pathname.startsWith("/api/") &&
    parts.length === 1 &&
    MODULES.has(parts[0] ?? "") &&
    hasModulePermission(permissions, parts[0] ?? "")
  ) {
    return true;
  }

  const requiredPermission = getRequiredPermission(pathname, method);
  if (!requiredPermission) return true;
  if (permissions.includes(requiredPermission)) return true;

  if (!pathname.startsWith("/api/") && hasGrantedPermission(permissions, requiredPermission)) {
    return true;
  }

  if (
    pathname.startsWith("/api/") &&
    permissions.some((granted) => granularCoversCoarse(granted, requiredPermission))
  ) {
    return true;
  }

  if (
    !pathname.startsWith("/api/") &&
    isAssetViewPermission(requiredPermission) &&
    permissions.includes("maintenance.view")
  ) {
    return true;
  }

  if (
    !pathname.startsWith("/api/") &&
    isMaintenanceViewPermission(requiredPermission) &&
    permissions.includes("maintenance.view")
  ) {
    return true;
  }

  if (
    !pathname.startsWith("/api/") &&
    isQcViewPermission(requiredPermission) &&
    permissions.includes("qc.view")
  ) {
    return true;
  }

  if (
    !pathname.startsWith("/api/") &&
    requiredPermission === "production.downtime.view" &&
    permissions.includes("production.view")
  ) {
    return true;
  }

  if (
    !pathname.startsWith("/api/") &&
    (pathname === "/production/shift-sessions" || pathname.startsWith("/production/shift-sessions/")) &&
    (permissions.includes("shifts.view") || permissions.includes("production.view")) &&
    !pathname.includes("/create") &&
    !pathname.includes("/edit")
  ) {
    return true;
  }

  return false;
}
