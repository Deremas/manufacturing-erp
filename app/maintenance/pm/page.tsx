import { PreventiveMaintenanceListPage } from "@/features/maintenance/WorkflowPages";
import { getPreventiveMaintenancePlans } from "@/services/maintenance/maintenance.service";
import { requireAuth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function PreventiveMaintenancePlansPage() {
  const user = await requireAuth();
  const plans = await getPreventiveMaintenancePlans();
  return <PreventiveMaintenanceListPage plans={user.accessibleLocationIds?.length ? plans.filter((plan) => user.accessibleLocationIds?.includes(plan.locationId)) : plans} />;
}
