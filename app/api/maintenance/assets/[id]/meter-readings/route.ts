import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { listAssetMeterReadings, recordAssetMeterReading } from "@/services/maintenance/asset-lifecycle.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.master.view", async () => {
    const { id } = await context.params;
    return { items: await listAssetMeterReadings(id) };
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.master.update", async (userId) => {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    return {
      item: await recordAssetMeterReading({
        ...body,
        assetId: id,
        recordedById: userId,
        readingValue: Number(body.readingValue),
        shiftSessionId: body.shiftSessionId || null,
      }),
    };
  });
}
