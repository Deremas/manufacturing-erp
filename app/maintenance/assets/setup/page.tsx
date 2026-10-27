import { AssetMasterSetupPage } from "@/features/maintenance/AssetMasterSetupPage";
import { getAssetTypes } from "@/services/maintenance/maintenance.service";
import { listAssetCategories } from "@/services/maintenance/asset-lifecycle.service";
export const dynamic = "force-dynamic";
export default async function Page() { const [assetTypes, categories] = await Promise.all([getAssetTypes(), listAssetCategories()]); return <AssetMasterSetupPage assetTypes={assetTypes} categories={categories} />; }
