import { AssetLifecycleConfirmPage } from "@/features/maintenance/AssetLifecyclePages";
import { getAssetById } from "@/services/maintenance/maintenance.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAssetById(id);
  return <AssetLifecycleConfirmPage asset={asset} action="retire" />;
}
