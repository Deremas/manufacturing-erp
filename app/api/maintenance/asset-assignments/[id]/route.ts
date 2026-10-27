import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getAssetAssignmentById, updateAssetAssignment } from "@/services/maintenance/asset-lifecycle.service";
import { getAssetById } from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.assignment.view", async () => {
    const { id } = await context.params;
    const item = await getAssetAssignmentById(id);
    if (!item) throw new Error("Asset assignment not found");
    return { item };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.assignment.update", async (userId, user) => {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    const existing = await getAssetAssignmentById(id);
    if (!existing) throw new Error("Asset assignment not found");
    const asset = await getAssetById(existing.assetId);
    if (!asset) throw new Error("Asset not found");
    assertUserScope(user, { locationId: asset.locationId, departmentId: asset.departmentId });
    return { item: await updateAssetAssignment({ ...body, id, updatedById: userId }) };
  });
}
