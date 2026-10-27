import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getAssetTransferById, updateAssetTransfer } from "@/services/maintenance/asset-lifecycle.service";
import { getAssetById } from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.transfer.view", async () => {
    const { id } = await context.params;
    const item = await getAssetTransferById(id);
    if (!item) throw new Error("Asset transfer not found");
    return { item };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.transfer.update", async (userId, user) => {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    const existing = await getAssetTransferById(id);
    if (!existing) throw new Error("Asset transfer not found");
    const asset = await getAssetById(existing.assetId);
    if (!asset) throw new Error("Asset not found");
    assertUserScope(user, { locationId: asset.locationId, departmentId: asset.departmentId });
    assertUserScope(user, { locationId: String(body.toLocationId ?? existing.toLocationId) });
    return { item: await updateAssetTransfer({ ...body, id, updatedById: userId }) };
  });
}
