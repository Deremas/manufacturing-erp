import { withApiAuthorization } from "@/lib/auth/api-authorization";
import { assertUserScope } from "@/lib/auth/scope";
import { checkPermission } from "@/lib/permissions/permissions";
import { createMaintenanceTicketFromDowntime, getDowntimeById } from "@/services/shift/downtime.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiAuthorization("production.downtime.createMaintenanceTicket", async (user) => {
    const { id } = await context.params; const current = await getDowntimeById(id);
    if (!current) throw new Error("Downtime record not found"); assertUserScope(user, { locationId: String(current.locationId) });
    const body = await request.json(); const override = Boolean(body.overrideDuplicate);
    if (override && !checkPermission(user, "maintenance.ticket.overrideDuplicate")) throw new Error("Forbidden: duplicate-ticket override permission is required");
    return { item: await createMaintenanceTicketFromDowntime({ id, requestedById: user.id, overrideDuplicate: override, remarks: body.remarks }) };
  });
}
