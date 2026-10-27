import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { checkPermission } from "@/lib/permissions/permissions";
import { getAssetById, updateAsset } from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.master.view", async (_userId, user) => {
    const { id } = await context.params;
    const item = await getAssetById(id);
    if (!item) throw new Error("Asset not found");
    assertUserScope(user, { locationId: item.locationId, departmentId: item.departmentId });
    return { item: checkPermission(user, "asset.master.viewCost") ? item : { ...item, purchaseCost: undefined, currentBookValue: undefined } };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.master.update", async (userId, user) => {
    const body = await request.json();
    const { id } = await context.params;
    const existing = await getAssetById(id);
    if (!existing) throw new Error("Asset not found");
    if (existing.isActive && body.isActive === false && !checkPermission(user, "asset.master.deactivate")) throw new Error("Forbidden: missing permission asset.master.deactivate");
    assertUserScope(user, { locationId: existing.locationId, departmentId: existing.departmentId });
    assertUserScope(user, { locationId: body.locationId, departmentId: body.departmentId });
    return { item: await updateAsset(id, { ...body, updatedById: userId }) };
  });
}
