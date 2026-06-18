// lib/permissions/permissions.ts
// Permission system for NEW ERP
// Uses the `${module}.${action}` pattern (e.g. "inventory.create", "purchase_order.approve")

import type { User } from "@/lib/auth/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Permission string in the format `${module}.${action}`.
 * Examples: "inventory.create", "purchase_order.approve", "reports.export"
 */
export type Permission = `${string}.${string}`;

// ─── Permission helpers ──────────────────────────────────────────────────────

/**
 * Check whether a user has a specific permission.
 * The wildcard `"*"` on the user grants access to everything.
 */
export function checkPermission(user: User, permission: string): boolean {
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(permission);
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
  if (user.permissions.includes("*")) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

/**
 * Check whether the user has **all** of the listed permissions.
 */
export function hasAllPermissions(user: User, permissions: string[]): boolean {
  if (user.permissions.includes("*")) return true;
  return permissions.every((p) => user.permissions.includes(p));
}

// ─── Convenience permission builders ─────────────────────────────────────────

/**
 * Build a permission string from module and action parts.
 */
export function buildPermission(module: string, action: string): Permission {
  return `${module}.${action}`;
}

/**
 * Extract module name from a permission string.
 */
export function getModule(permission: string): string {
  return permission.split(".")[0] ?? "";
}

/**
 * Extract action name from a permission string.
 */
export function getAction(permission: string): string {
  return permission.split(".").slice(1).join(".") ?? "";
}
