import { AssetFormPage } from "@/features/maintenance/MaintenancePages";
import { getAssetPageAccess } from "@/app/maintenance/_lib/asset-access";
import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";

export default async function CreateMaintenanceAssetPage() {
  const [referenceData, access] = await Promise.all([getMaintenanceReferenceData(), getAssetPageAccess()]);
  return (
    <AssetFormPage
      mode="create"
      assetTypes={referenceData.assetTypes}
      assetCategories={referenceData.assetCategories}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
      canViewCost={access.canViewCost}
    />
  );
}
