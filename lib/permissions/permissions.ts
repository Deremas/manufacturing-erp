// lib/permissions/permissions.ts
// Permission system for NEW ERP
// Canonical format is `${module}.${resource}.${action}`.

import type { User } from "@/lib/auth/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Permission string in the format `${module}.${action}`.
 * Examples: "inventory.create", "purchase_order.approve", "reports.export"
 */
export type Permission = `${string}.${string}.${string}` | `${string}.${string}`;

export type ParsedPermission = {
  module: string;
  resource: string;
  action: string;
};

function normalizeAction(action: string): string {
  return action === "edit" ? "update" : action;
}

export function parsePermission(permission: string): ParsedPermission {
  const parts = permission.split(".").filter(Boolean);
  const module = parts[0] ?? "";
  const action = parts.at(-1) ?? "";
  const resource = parts.length >= 3 ? parts.slice(1, -1).join(".") : "";
  return { module, resource, action };
}

/**
 * A granted permission satisfies a required one when:
 * - it is the wildcard, or an exact match
 * - it is the coarse `module.action` form covering `module.resource.action`
 * - `edit` and `update` are treated as the same action
 *
 * A more specific grant never covers a different resource.
 */
export function permissionMatches(granted: string, required: string): boolean {
  if (granted === "*" || granted === required) return true;

  const g = parsePermission(granted);
  const r = parsePermission(required);
  if (!g.module || g.module !== r.module) return false;
  if (normalizeAction(g.action) !== normalizeAction(r.action)) return false;
  if (!g.resource && r.resource) return true;
  return g.resource === r.resource;
}

export function hasGrantedPermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  return permissions.some((granted) => permissionMatches(granted, required));
}

export function hasAnyGrantedPermission(permissions: string[], required: string[]): boolean {
  if (permissions.includes("*")) return true;
  return required.some((key) => hasGrantedPermission(permissions, key));
}

export function can(permissions: string[], required: string): boolean {
  return hasGrantedPermission(permissions, required);
}

export function canAny(permissions: string[], required: string[]): boolean {
  return hasAnyGrantedPermission(permissions, required);
}

export function hasModulePermission(permissions: string[], moduleName: string): boolean {
  if (permissions.includes("*")) return true;
  return permissions.some(
    (permission) => permission === moduleName || permission.startsWith(`${moduleName}.`),
  );
}

// ─── Permission helpers ──────────────────────────────────────────────────────

/**
 * Check whether a user has a specific permission.
 * The wildcard `"*"` on the user grants access to everything.
 * Coarse module-level grants also cover matching resource-level keys.
 */
export function checkPermission(user: User, permission: string): boolean {
  return hasGrantedPermission(user.permissions ?? [], permission);
}

/**
 * Creates a middleware/guard function that checks a specific permission.
 * Throws an error with a 403 message when the check fails.
 * Useful inside API routes or getServerSideProps.
 */
export function requirePermission(permission: string) {
  return (user: User): void => {
    if (!checkPermission(user, permission)) {
      throw new Error(`Forbidden — missing permission "${permission}"`);
    }
  };
}

/**
 * Check whether the user has **at least one** of the listed permissions.
 */
export function hasAnyPermission(user: User, permissions: string[]): boolean {
  return hasAnyGrantedPermission(user.permissions ?? [], permissions);
}

/**
 * Check whether the user has **all** of the listed permissions.
 */
export function hasAllPermissions(user: User, permissions: string[]): boolean {
  if ((user.permissions ?? []).includes("*")) return true;
  return permissions.every((permission) => hasGrantedPermission(user.permissions ?? [], permission));
}

// ─── Convenience permission builders ─────────────────────────────────────────

/**
 * Build a permission string from module and action parts.
 */
export function buildPermission(module: string, action: string): Permission {
  return `${module}.${action}`;
}

export function buildResourcePermission(module: string, resource: string, action: string): Permission {
  return `${module}.${resource}.${action}`;
}

/**
 * Extract module name from a permission string.
 */
export function getModule(permission: string): string {
  return parsePermission(permission).module;
}

/**
 * Extract action name from a permission string.
 */
export function getAction(permission: string): string {
  return parsePermission(permission).action;
}

export function getResource(permission: string): string {
  return parsePermission(permission).resource;
}
