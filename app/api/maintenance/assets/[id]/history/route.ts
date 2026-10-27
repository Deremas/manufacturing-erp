import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { listAssetHistory, listAssetQualityHistory } from "@/services/maintenance/asset-lifecycle.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.lifecycle.viewHistory", async () => {
    const { id } = await context.params;
    const [lifecycle, quality] = await Promise.all([listAssetHistory(id), listAssetQualityHistory(id)]);
    return { lifecycle, quality };
  });
}
