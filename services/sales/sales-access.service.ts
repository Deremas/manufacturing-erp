import type { User } from "@/lib/auth/auth";
import type { Location } from "@/features/administration/types";
import { normalizeSalesChannel, type SalesChannel } from "@/services/sales/sales-shared.service";

export function userCanAccessLocation(user: User | null, locationId: string) {
  if (!user) {
    return false;
  }

  if (user.isSystem || user.permissions.includes("*")) {
    return true;
  }

  const accessible = user.accessibleLocationIds ?? [];
  return accessible.includes(locationId);
}

export function filterLocationsForUser(
  user: User | null,
  locations: Location[],
  options?: {
    locationTypes?: string[];
  },
) {
  const allowedTypes = options?.locationTypes?.map((value) => value.toUpperCase()) ?? null;

  return locations.filter((location) => {
    if (!location.isActive) {
      return false;
    }
    if (location.isQcHoldLocation) {
      return false;
    }

    if (!userCanAccessLocation(user, location.id)) {
      return false;
    }

    if (!allowedTypes?.length) {
      return true;
    }

    const locationType = String(location.locationType ?? "").toUpperCase();
    return allowedTypes.some((type) => locationType.includes(type));
  });
}

export function assertUserCanAccessLocation(user: User | null, locationId: string) {
  if (!userCanAccessLocation(user, locationId)) {
    throw new Error("You do not have access to the selected sales location.");
  }
}

const channelPermissionMap: Record<SalesChannel, string> = {
  FACTORY: "sales.factory.use",
  BRANCH: "sales.branch.use",
  TRUCK: "sales.truck.use",
  AGENT: "sales.agent.use",
};

const loadingPermissionGroup = [
  "sales.loading.create",
  "sales.loading.confirm",
  "sales.loading.cancel",
];

function userHasExplicitPermission(user: User | null, permission: string) {
  if (!user) {
    return false;
  }

  return Boolean(user.isSystem || user.permissions.includes("*") || user.permissions.includes(permission));
}

function userHasAnyPermission(user: User | null, permissions: string[]) {
  if (!user) {
    return false;
  }

  if (user.isSystem || user.permissions.includes("*")) {
    return true;
  }

  return permissions.some((permission) => user.permissions.includes(permission));
}

export function userCanUseSalesChannel(user: User | null, channel: string) {
  const normalized = normalizeSalesChannel(channel);
  const requiredPermission = channelPermissionMap[normalized];

  if (userHasExplicitPermission(user, requiredPermission)) {
    return true;
  }

  const hasAnyScopedChannelPermission = userHasAnyPermission(user, Object.values(channelPermissionMap));
  return !hasAnyScopedChannelPermission;
}

export function assertUserCanUseSalesChannel(user: User | null, channel: string) {
  if (!userCanUseSalesChannel(user, channel)) {
    throw new Error("You do not have permission to use the selected sales channel.");
  }
}

export function userCanManageLoadingAction(
  user: User | null,
  action: "create" | "confirm" | "cancel",
) {
  const permission = `sales.loading.${action}`;
  if (userHasExplicitPermission(user, permission)) {
    return true;
  }

  const hasScopedLoadingPermissions = userHasAnyPermission(user, loadingPermissionGroup);
  return !hasScopedLoadingPermissions;
}

export function assertUserCanManageLoadingAction(
  user: User | null,
  action: "create" | "confirm" | "cancel",
) {
  if (!userCanManageLoadingAction(user, action)) {
    throw new Error(`You do not have permission to ${action} loading orders.`);
  }
}
