import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import {
  getPreventiveMaintenanceChecklist,
  getWorkOrderById,
  recordPreventiveMaintenanceChecklist,
} from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.pm.view", async (_userId, user) => {
    const { id } = await context.params;
    const workOrder = await getWorkOrderById(id);
    if (!workOrder) throw new Error("Work order not found");
    assertUserScope(user, { locationId: workOrder.locationId });
    return { items: await getPreventiveMaintenanceChecklist(id) };
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.pm.recordChecklist", async (userId, user) => {
    const { id } = await context.params;
    const workOrder = await getWorkOrderById(id);
    if (!workOrder) throw new Error("Work order not found");
    assertUserScope(user, { locationId: workOrder.locationId });
    const body = await request.json();
    return { items: await recordPreventiveMaintenanceChecklist({ workOrderId: id, performedById: userId, ...body }) };
  });
}
