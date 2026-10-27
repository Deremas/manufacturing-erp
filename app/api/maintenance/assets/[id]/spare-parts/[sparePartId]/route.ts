import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { deleteAssetSparePart } from "@/services/maintenance/asset-lifecycle.service";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; sparePartId: string }> }) {
  return withMaintenanceAction("asset.master.update", async () => {
    const { sparePartId } = await context.params;
    await deleteAssetSparePart(sparePartId);
    return { ok: true };
  });
}
