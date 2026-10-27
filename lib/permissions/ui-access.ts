import type { NavItem } from "@/lib/constants/navigation";
import { getRequiredPermission, hasRouteAccess } from "@/lib/auth/route-access";
import {
  hasAnyGrantedPermission,
  hasGrantedPermission,
  parsePermission,
} from "@/lib/permissions/permissions";

const ACTION_SEGMENTS = new Set([
  "create",
  "edit",
  "print",
  "delete",
  "approve",
  "reject",
  "cancel",
  "post",
  "submit",
  "export",
]);

const DESTINATION_BY_LABEL: Array<{ test: RegExp; href: string }> = [
  { test: /convert to po/i, href: "/procurement/purchase-orders/create" },
  { test: /create grn/i, href: "/procurement/grn/create" },
  { test: /create invoice/i, href: "/procurement/supplier-invoices/create" },
  { test: /create payment/i, href: "/procurement/payments/create" },
  { test: /generate issue/i, href: "/inventory/issues/create" },
];

export type AccessibleAction = {
  label: string;
  permission?: string | string[];
  href?: string;
};

function lastIsLikelyId(segment: string | undefined): boolean {
  if (!segment || ACTION_SEGMENTS.has(segment)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f-]{4,}$/i.test(segment)) return true;
  if (/^\d+$/.test(segment)) return true;
  return segment.length >= 20;
}

export function withActionPath(pathname: string, action: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const withoutActions = parts.filter((part) => !ACTION_SEGMENTS.has(part));
  if (action === "create") {
    const listParts = lastIsLikelyId(withoutActions.at(-1))
      ? withoutActions.slice(0, -1)
      : withoutActions;
    return `/${[...listParts, "create"].join("/")}`;
  }
  const withId = lastIsLikelyId(withoutActions.at(-1))
    ? withoutActions
    : [...withoutActions, "item"];
  return `/${[...withId, action].join("/")}`;
}

function aliasesForVerb(verb: string): string[] {
  if (verb === "update" || verb === "submit" || verb === "edit") {
    return ["edit", "update", "submit"];
  }
  if (verb === "save") {
    return ["create", "edit", "update"];
  }
  return [verb];
}

function inferVerb(label: string): string | null {
  const text = label.trim().toLowerCase();
  if (!text) return null;
  if (text.includes("approve") && text.includes("reject")) return "approve-or-reject";
  if (/^approve\b/.test(text)) return "approve";
  if (/^reject\b/.test(text)) return "reject";
  if (/convert to po|create grn|create invoice|create payment/.test(text)) return "create";
  if (/^(create|add)\b/.test(text) || text === "new") return "create";
  if (/^(edit|update)\b/.test(text)) return "update";
  if (/^(delete|remove)\b/.test(text)) return "delete";
  if (/\bsubmit\b/.test(text)) return "submit";
  if (/cancel doc|^void\b/.test(text)) return "cancel";
  if (/^post\b/.test(text)) return "post";
  if (/^print\b/.test(text)) return "print";
  if (/^export\b/.test(text)) return "export";
  if (/\bsave\b/.test(text)) return "save";
  return null;
}

function keysForVerb(pathname: string, verb: string): string[] {
  const keys = new Set<string>();
  const current = getRequiredPermission(pathname, "GET");
  const parsed = current ? parsePermission(current) : null;

  for (const action of aliasesForVerb(verb)) {
    const pathAction = action === "update" ? "edit" : action;
    const required = getRequiredPermission(withActionPath(pathname, pathAction), "GET");
    if (required) keys.add(required);
    if (parsed?.module) {
      keys.add(`${parsed.module}.${action}`);
      if (parsed.resource) keys.add(`${parsed.module}.${parsed.resource}.${action}`);
    }
  }

  return [...keys];
}

export function canAccessPath(
  permissions: string[],
  pathname: string,
  method = "GET",
): boolean {
  return hasRouteAccess(permissions, pathname, method);
}

export function canPerformLabeledAction(
  permissions: string[],
  label: string,
  pathname: string,
  options?: { permission?: string | string[]; href?: string },
): boolean {
  if (permissions.includes("*")) return true;

  if (options?.permission) {
    const keys = Array.isArray(options.permission) ? options.permission : [options.permission];
    return hasAnyGrantedPermission(permissions, keys);
  }

  if (options?.href) {
    return hasRouteAccess(permissions, options.href, "GET");
  }

  const destination = DESTINATION_BY_LABEL.find((entry) => entry.test.test(label));
  if (destination) {
    return hasRouteAccess(permissions, destination.href, "GET");
  }

  const verb = inferVerb(label);
  if (!verb) return true;

  if (verb === "approve-or-reject") {
    return (
      hasAnyGrantedPermission(permissions, keysForVerb(pathname, "approve")) ||
      hasAnyGrantedPermission(permissions, keysForVerb(pathname, "reject"))
    );
  }

  const resolvedVerb =
    verb === "save"
      ? pathname.split("/").includes("create")
        ? "create"
        : "update"
      : verb;

  return hasAnyGrantedPermission(permissions, keysForVerb(pathname, resolvedVerb));
}

export function isGatedActionLabel(label: string): boolean {
  return inferVerb(label) !== null || DESTINATION_BY_LABEL.some((entry) => entry.test.test(label));
}

export function filterAccessibleActions<T extends AccessibleAction>(
  actions: T[],
  permissions: string[],
  pathname: string,
  ready = true,
): T[] {
  return actions.filter((action) => {
    if (!ready && isGatedActionLabel(action.label) && !action.permission && !action.href) {
      return false;
    }
    if (!ready && (action.permission || action.href)) {
      return false;
    }
    return canPerformLabeledAction(permissions, action.label, pathname, {
      permission: action.permission,
      href: action.href,
    });
  });
}

export function filterNavigation(items: NavItem[], permissions: string[]): NavItem[] {
  return items.flatMap((item) => {
    if (item.href === "/approval-inbox") {
      if (!canAccessApprovalInbox(permissions)) return [];
      return [item];
    }
    if (item.children?.length) {
      const children = item.children.filter((child) =>
        hasRouteAccess(permissions, child.href, "GET"),
      );
      if (children.length === 0) return [];
      return [{ ...item, children }];
    }
    if (!item.href) return [];
    if (item.href === "/" || item.href === "/dashboard") return [item];
    if (!hasRouteAccess(permissions, item.href, "GET")) return [];
    return [item];
  });
}

export function canApproveReference(permissions: string[], referenceType: string): boolean {
  if (!referenceType) return false;
  if (permissions.includes("*")) return true;
  return hasGrantedPermission(permissions, `${referenceType}.approve`);
}

export function canAccessApprovalInbox(permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  return permissions.some((permission) => permission.endsWith(".approve"));
}

export function canViewModuleActivity(permissions: string[], moduleName: string): boolean {
  if (!moduleName) return false;
  return (
    hasGrantedPermission(permissions, `${moduleName}.view`) ||
    permissions.some((permission) => permission.startsWith(`${moduleName}.`))
  );
}
