import { notFound } from "next/navigation";

import { AssetFormPage } from "@/features/maintenance/MaintenancePages";
import { getAssetPageAccess } from "@/app/maintenance/_lib/asset-access";
import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { getAssetById } from "@/services/maintenance/maintenance.service";

export default async function EditMaintenanceAssetPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [referenceData, asset, access] = await Promise.all([
    getMaintenanceReferenceData(),
    getAssetById(publicId),
    getAssetPageAccess(),
  ]);
  if (!asset) notFound();

  return (
    <AssetFormPage
      mode="edit"
      asset={access.canViewCost ? asset : { ...asset, purchaseCost: undefined, currentBookValue: undefined }}
      assetTypes={referenceData.assetTypes}
      assetCategories={referenceData.assetCategories}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
      canViewCost={access.canViewCost}
    />
  );
}
