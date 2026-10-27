import { PreventiveMaintenanceDetailPage } from "@/features/maintenance/WorkflowPages";
import { getPreventiveMaintenancePlanById } from "@/services/maintenance/maintenance.service";
import { requireAuth } from "@/lib/auth/auth";
import { assertUserScope } from "@/lib/auth/scope";

export default async function PreventiveMaintenancePlanViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const plan = await getPreventiveMaintenancePlanById(publicId);
  const user = await requireAuth();
  if (plan) assertUserScope(user, { locationId: plan.locationId });
  return <PreventiveMaintenanceDetailPage plan={plan} />;
}
