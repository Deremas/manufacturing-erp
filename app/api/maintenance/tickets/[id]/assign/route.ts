import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assignMaintenanceTicket } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.ticket.assign", async () => {
    const body = await request.json();
    const { id } = await context.params;
    const item = await assignMaintenanceTicket({
      id,
      assignedToId: body.assignedToId,
      priority: body.priority,
      targetCompletionDate: body.targetCompletionDate,
      remarks: body.remarks,
    });
    return { item };
  });
}
