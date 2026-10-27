import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getMaintenanceTicketById, updateMaintenanceTicket } from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.ticket.view", async (_userId, user) => {
    const { id } = await context.params;
    const item = await getMaintenanceTicketById(id);
    if (!item) throw new Error("Maintenance ticket not found");
    assertUserScope(user, { locationId: item.locationId, departmentId: item.departmentId });
    return { item };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.ticket.update", async (_userId, user) => {
    const body = await request.json();
    const { id } = await context.params;
    const current = await getMaintenanceTicketById(id);
    if (!current) throw new Error("Maintenance ticket not found");
    if (current.status !== "DRAFT") throw new Error("Only draft tickets can be edited");
    assertUserScope(user, { locationId: current.locationId, departmentId: current.departmentId });
    assertUserScope(user, { locationId: body.locationId, departmentId: body.departmentId });
    return { item: await updateMaintenanceTicket(id, { ...body, requestedById: current.requestedById, status: current.status, approvalStatus: current.approvalStatus }) };
  });
}
