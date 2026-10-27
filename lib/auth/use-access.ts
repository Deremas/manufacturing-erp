"use client";

import { useContext, useRef } from "react";
import { usePathname } from "next/navigation";
import { SessionContext } from "next-auth/react";
import { hasRouteAccess } from "@/lib/auth/route-access";
import { hasAnyGrantedPermission, hasGrantedPermission } from "@/lib/permissions/permissions";
import {
  canPerformLabeledAction,
  filterAccessibleActions,
  filterNavigation,
  type AccessibleAction,
} from "@/lib/permissions/ui-access";
import type { NavItem } from "@/lib/constants/navigation";

export function useAccess() {
  const pathname = usePathname() ?? "/";
  const session = useContext(SessionContext);
  const permissions = session?.data?.user?.permissions ?? [];
  const ready = session != null && session.status !== "loading";
  const navigationCache = useRef<NavItem[] | null>(null);

  function can(required: string | string[]): boolean {
    if (!ready) return false;
    return Array.isArray(required)
      ? hasAnyGrantedPermission(permissions, required)
      : hasGrantedPermission(permissions, required);
  }

  function canPath(href: string, method = "GET"): boolean {
    if (!ready) return false;
    return hasRouteAccess(permissions, href, method);
  }

  function canAction(label: string, options?: { permission?: string | string[]; href?: string }): boolean {
    if (!ready) {
      return !options?.permission && !options?.href && canPerformLabeledAction([], label, pathname, options);
    }
    return canPerformLabeledAction(permissions, label, pathname, options);
  }

  function visibleActions<T extends AccessibleAction>(actions: T[]): T[] {
    return filterAccessibleActions(actions, permissions, pathname, ready);
  }

  function visibleNavigation(items: NavItem[]): NavItem[] {
    if (!ready || permissions.length === 0) {
      return navigationCache.current ?? items;
    }
    const next = filterNavigation(items, permissions);
    navigationCache.current = next;
    return next;
  }

  return {
    ready,
    permissions,
    pathname,
    can,
    canPath,
    canAction,
    visibleActions,
    visibleNavigation,
  };
}
