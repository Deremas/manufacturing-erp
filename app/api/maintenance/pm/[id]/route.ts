import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getAssets, getPreventiveMaintenancePlanById, updatePreventiveMaintenancePlan } from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.pm.view", async (_userId, user) => {
    const { id } = await context.params;
    const item = await getPreventiveMaintenancePlanById(id);
    if (!item) throw new Error("Preventive maintenance plan not found");
    assertUserScope(user, { locationId: item.locationId });
    return { item };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.pm.update", async (_userId, user) => {
    const body = await request.json();
    const { id } = await context.params;
    const existing = await getPreventiveMaintenancePlanById(id);
    if (!existing) throw new Error("Preventive maintenance plan not found");
    assertUserScope(user, { locationId: existing.locationId });
    const targetAsset = (await getAssets()).find((entry) => entry.id === body.assetId);
    if (!targetAsset) throw new Error("Asset not found");
    assertUserScope(user, { locationId: targetAsset.locationId });
    const item = await updatePreventiveMaintenancePlan(id, body);
    return { item };
  });
}
