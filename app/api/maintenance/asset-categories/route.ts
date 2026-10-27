import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { createAssetCategory, listAssetCategories } from "@/services/maintenance/asset-lifecycle.service";

export async function GET() {
  return withMaintenanceAction("asset.master.view", async () => ({ items: await listAssetCategories() }));
}

export async function POST(request: Request) {
  return withMaintenanceAction("asset.master.create", async (userId) => ({ item: await createAssetCategory({ ...(await request.json()), createdById: userId }) }));
}
