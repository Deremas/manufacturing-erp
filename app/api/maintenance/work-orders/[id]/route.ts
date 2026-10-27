import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getWorkOrderById, updateWorkOrder } from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.workOrder.view", async (_userId, user) => {
    const { id } = await context.params;
    const item = await getWorkOrderById(id);
    if (!item) throw new Error("Work order not found");
    assertUserScope(user, { locationId: item.locationId });
    return { item };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.workOrder.update", async (_userId, user) => {
    const body = await request.json();
    const { id } = await context.params;
    const current = await getWorkOrderById(id);
    if (!current) {
      throw new Error("Work order not found");
    }
    if (current.status !== "DRAFT") throw new Error("Only draft work orders can be edited");
    assertUserScope(user, { locationId: current.locationId });
    assertUserScope(user, { locationId: body.locationId });
    return { item: await updateWorkOrder(id, { ...body, status: "DRAFT", approvedById: null }) };
  });
}
