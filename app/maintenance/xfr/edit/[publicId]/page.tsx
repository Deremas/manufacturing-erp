import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { AssetTransferFormPage } from "@/features/maintenance/AssetLifecyclePages";
import { getAssetTransferById } from "@/services/maintenance/asset-lifecycle.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const [{ publicId }, data] = await Promise.all([params, getMaintenanceReferenceData()]);
  const transfer = await getAssetTransferById(publicId);
  return <AssetTransferFormPage assets={data.assets} locations={data.locations} transfer={transfer} />;
}
