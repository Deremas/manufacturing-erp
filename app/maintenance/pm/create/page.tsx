import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { PreventiveMaintenanceFormPage } from "@/features/maintenance/WorkflowPages";
import { requireAuth } from "@/lib/auth/auth";

export default async function CreatePreventiveMaintenancePlanPage() {
  const referenceData = await getMaintenanceReferenceData();
  const user = await requireAuth();
  const assets = user.accessibleLocationIds?.length ? referenceData.assets.filter((asset) => user.accessibleLocationIds?.includes(asset.locationId)) : referenceData.assets;
  return <PreventiveMaintenanceFormPage mode="create" assets={assets} roles={referenceData.roles} users={referenceData.users} items={referenceData.items} />;
}
