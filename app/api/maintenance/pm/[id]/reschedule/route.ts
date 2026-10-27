import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getPreventiveMaintenancePlanById, requestPreventiveMaintenanceReschedule } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.pm.reschedule", async (userId, user) => {
    const { id } = await context.params;
    const plan = await getPreventiveMaintenancePlanById(id);
    if (!plan) throw new Error("Preventive maintenance plan not found");
    assertUserScope(user, { locationId: plan.locationId });
    const body = await request.json();
    return { item: await requestPreventiveMaintenanceReschedule({ planId: id, requestedById: userId, ...body }) };
  });
}
