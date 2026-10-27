import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { getAssetTypes } from "@/services/maintenance/maintenance.service";
import { createAssetType } from "@/services/maintenance/asset-lifecycle.service";

export async function GET() {
  return withMaintenanceAction("asset.master.view", async () => ({ items: await getAssetTypes() }));
}

export async function POST(request: Request) {
  return withMaintenanceAction("asset.master.create", async (userId) => ({ item: await createAssetType({ ...(await request.json()), createdById: userId }) }));
}
