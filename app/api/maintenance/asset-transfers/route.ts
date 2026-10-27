import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { createAssetTransfer, listAssetTransfers } from "@/services/maintenance/asset-lifecycle.service";
import { getAssetById } from "@/services/maintenance/maintenance.service";

export async function GET(request: Request) {
  return withMaintenanceAction("asset.transfer.view", async () => {
    const assetId = new URL(request.url).searchParams.get("assetId") ?? undefined;
    return { items: await listAssetTransfers(assetId) };
  });
}

export async function POST(request: Request) {
  return withMaintenanceAction("asset.transfer.create", async (userId, user) => {
    const body = await request.json();
    const asset = await getAssetById(String(body.assetId ?? ""));
    if (!asset) throw new Error("Asset not found");
    assertUserScope(user, { locationId: asset.locationId, departmentId: asset.departmentId });
    assertUserScope(user, { locationId: String(body.toLocationId ?? "") });
    return { item: await createAssetTransfer({ ...body, createdById: userId }) };
  });
}
