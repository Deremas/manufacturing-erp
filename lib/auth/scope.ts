import type { User } from "@/lib/auth/auth";

export type ApiScope = { locationId?: string | null; departmentId?: string | null };

export function assertUserScope(user: User, scope: ApiScope) {
  if (scope.locationId && user.accessibleLocationIds?.length && !user.accessibleLocationIds.includes(scope.locationId)) {
    throw new Error("Forbidden: location is outside your assigned scope");
  }
  if (scope.departmentId && user.accessibleDepartmentIds?.length && !user.accessibleDepartmentIds.includes(scope.departmentId)) {
    throw new Error("Forbidden: department is outside your assigned scope");
  }
}
