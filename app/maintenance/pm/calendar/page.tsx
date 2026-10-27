import { PreventiveMaintenanceCalendarPage } from "@/features/maintenance/WorkflowPages";
import { getPreventiveMaintenanceCalendarPlans } from "@/services/maintenance/maintenance.service";
import { requireAuth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function PreventiveMaintenanceCalendarRoute() {
  const user = await requireAuth();
  const plans = await getPreventiveMaintenanceCalendarPlans();
  return <PreventiveMaintenanceCalendarPage plans={user.accessibleLocationIds?.length ? plans.filter((plan) => user.accessibleLocationIds?.includes(plan.locationId)) : plans} />;
}
