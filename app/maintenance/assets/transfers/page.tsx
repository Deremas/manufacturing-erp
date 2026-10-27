import { AssetTransfersPage } from "@/features/maintenance/AssetLifecyclePages";
import { listAssetTransfers } from "@/services/maintenance/asset-lifecycle.service";
export const dynamic = "force-dynamic";
export default async function Page() { return <AssetTransfersPage transfers={await listAssetTransfers()} />; }
