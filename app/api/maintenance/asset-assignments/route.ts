import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { createAssetAssignment, listAssetAssignments } from "@/services/maintenance/asset-lifecycle.service";
import { getAssetById } from "@/services/maintenance/maintenance.service";

export async function GET(request: Request) {
  return withMaintenanceAction("asset.assignment.view", async () => {
    const assetId = new URL(request.url).searchParams.get("assetId") ?? undefined;
    return { items: await listAssetAssignments(assetId) };
  });
}

export async function POST(request: Request) {
  return withMaintenanceAction("asset.assignment.create", async (userId, user) => {
    const body = await request.json();
    const asset = await getAssetById(String(body.assetId ?? ""));
    if (!asset) throw new Error("Asset not found");
    assertUserScope(user, { locationId: asset.locationId, departmentId: asset.departmentId });
    return { item: await createAssetAssignment({ ...body, assignedById: userId }) };
  });
}
