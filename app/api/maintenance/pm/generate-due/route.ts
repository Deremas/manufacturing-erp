import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { generateDuePreventiveMaintenanceWorkOrders, getPreventiveMaintenanceDuePlans } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request) {
  return withMaintenanceAction("maintenance.pm.generateWorkOrder", async (userId, user) => {
    const body = await request.json().catch(() => ({}));
    const requested = Array.isArray(body.planIds) ? body.planIds : [];
    const duePlans = await getPreventiveMaintenanceDuePlans();
    const selected = requested.length ? duePlans.filter((plan) => requested.includes(plan.id)) : duePlans;
    selected.forEach((plan) => assertUserScope(user, { locationId: plan.locationId }));
    const items = await generateDuePreventiveMaintenanceWorkOrders({
      createdById: userId,
      planIds: selected.map((plan) => plan.id),
    });
    return { items };
  });
}
