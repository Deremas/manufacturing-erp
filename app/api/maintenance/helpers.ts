import { withApiAuthorization } from "@/lib/auth/api-authorization";
import type { User } from "@/lib/auth/auth";

export function withMaintenanceAction<T>(permission: string, action: (userId: string, user: User) => Promise<T | Response>, scope: { locationId?: string | null; departmentId?: string | null } = {}) {
  return withApiAuthorization(permission, (user) => action(user.id, user), scope);
}
