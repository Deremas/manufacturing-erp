import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { createAssetSparePart, listAssetSpareParts } from "@/services/maintenance/asset-lifecycle.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.master.view", async () => {
    const { id } = await context.params;
    return { items: await listAssetSpareParts(id) };
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.master.update", async () => {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    return {
      item: await createAssetSparePart({
        assetId: id,
        itemId: body.itemId,
        isPreferred: body.isPreferred,
        minimumRecommendedQty: body.minimumRecommendedQty != null ? Number(body.minimumRecommendedQty) : null,
        remarks: body.remarks,
      }),
    };
  });
}
