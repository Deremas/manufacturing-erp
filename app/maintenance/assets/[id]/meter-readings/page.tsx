import { AssetMeterReadingsPage } from "@/features/maintenance/AssetLifecyclePages";
import { getAssetById } from "@/services/maintenance/maintenance.service";
import { listAssetMeterReadings } from "@/services/maintenance/asset-lifecycle.service";

export const dynamic = "force-dynamic";

export default async function MaintenanceAssetMeterReadingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [asset, readings] = await Promise.all([getAssetById(id), listAssetMeterReadings(id)]);
  return <AssetMeterReadingsPage asset={asset} readings={readings} />;
}
