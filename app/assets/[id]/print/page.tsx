import { AssetPrintPage } from "@/features/maintenance/MaintenancePages";
import { getAssetPageAccess } from "@/app/maintenance/_lib/asset-access";
import { getAssetById } from "@/services/maintenance/maintenance.service";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [access, asset] = await Promise.all([getAssetPageAccess(), getAssetById(id)]);
  return <AssetPrintPage asset={asset} canViewCost={access.canViewCost} />;
}
