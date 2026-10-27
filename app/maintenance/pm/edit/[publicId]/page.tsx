import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { PreventiveMaintenanceFormPage } from "@/features/maintenance/WorkflowPages";
import { getPreventiveMaintenancePlanById } from "@/services/maintenance/maintenance.service";
import { requireAuth } from "@/lib/auth/auth";
import { assertUserScope } from "@/lib/auth/scope";

export default async function EditPreventiveMaintenancePlanPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [referenceData, plan] = await Promise.all([
    getMaintenanceReferenceData(),
    getPreventiveMaintenancePlanById(publicId),
  ]);
  const user = await requireAuth();
  if (plan) assertUserScope(user, { locationId: plan.locationId });
  const assets = user.accessibleLocationIds?.length
    ? referenceData.assets.filter((asset) => user.accessibleLocationIds?.includes(asset.locationId))
    : referenceData.assets;
  return (
    <PreventiveMaintenanceFormPage
      mode="edit"
      plan={plan}
      assets={assets}
      roles={referenceData.roles}
      users={referenceData.users}
      items={referenceData.items}
    />
  );
}
