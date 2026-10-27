import { PreventiveMaintenanceDuePage } from "@/features/maintenance/WorkflowPages";
import { getPreventiveMaintenanceDuePlans } from "@/services/maintenance/maintenance.service";
import { requireAuth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function PreventiveMaintenanceDuePageRoute() {
  const user = await requireAuth();
  const plans = await getPreventiveMaintenanceDuePlans();
  return <PreventiveMaintenanceDuePage plans={user.accessibleLocationIds?.length ? plans.filter((plan) => user.accessibleLocationIds?.includes(plan.locationId)) : plans} />;
}
