import { requireAuth } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";

export async function getAssetPageAccess() {
  const user = await requireAuth();
  return {
    user,
    canViewCost: checkPermission(user, "asset.master.viewCost"),
    canRetire: checkPermission(user, "asset.lifecycle.retire"),
    canDispose: checkPermission(user, "asset.lifecycle.dispose"),
  };
}
