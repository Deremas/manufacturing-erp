import type { User } from "@/lib/auth/auth";

function hasExplicitPermission(user: User | null, permission: string) {
  if (!user) {
    return false;
  }
  return Boolean(user.isSystem || user.permissions.includes("*") || user.permissions.includes(permission));
}

function hasAnyPermission(user: User | null, permissions: string[]) {
  if (!user) {
    return false;
  }
  if (user.isSystem || user.permissions.includes("*")) {
    return true;
  }
  return permissions.some((permission) => user.permissions.includes(permission));
}

export function userCanManageQuotationAction(
  user: User | null,
  action: "view" | "create" | "edit" | "accept" | "reject" | "convert" | "print",
) {
  const permission = `sales.quotation.${action}`;
  if (hasExplicitPermission(user, permission)) {
    return true;
  }
  if (["accept", "reject", "convert"].includes(action) && hasExplicitPermission(user, "sales.quotation.edit")) {
    return true;
  }
  if (action === "print" && hasExplicitPermission(user, "sales.quotation.view")) {
    return true;
  }
  return !hasAnyPermission(user, [
    "sales.quotation.view",
    "sales.quotation.create",
    "sales.quotation.edit",
  ]);
}

export function assertUserCanManageQuotationAction(
  user: User | null,
  action: "view" | "create" | "edit" | "accept" | "reject" | "convert" | "print",
) {
  if (!userCanManageQuotationAction(user, action)) {
    throw new Error(`You do not have permission to ${action} quotations.`);
  }
}

export function userCanManageSalesOrderAction(
  user: User | null,
  action: "view" | "create" | "edit" | "approve" | "reserve" | "dispatch" | "invoice" | "cancel",
) {
  const permission = `sales.order.${action}`;
  if (hasExplicitPermission(user, permission)) {
    return true;
  }
  return !hasAnyPermission(user, [
    "sales.order.view",
    "sales.order.create",
    "sales.order.edit",
    "sales.order.approve",
    "sales.order.reserve",
    "sales.order.dispatch",
    "sales.order.invoice",
    "sales.order.cancel",
  ]);
}

export function assertUserCanManageSalesOrderAction(
  user: User | null,
  action: "view" | "create" | "edit" | "approve" | "reserve" | "dispatch" | "invoice" | "cancel",
) {
  if (!userCanManageSalesOrderAction(user, action)) {
    throw new Error(`You do not have permission to ${action} sales orders.`);
  }
}
