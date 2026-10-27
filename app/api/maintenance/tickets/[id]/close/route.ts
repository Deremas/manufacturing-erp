import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { closeMaintenanceTicket } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.ticket.close", async () => {
    const body = await request.json();
    const { id } = await context.params;
    const item = await closeMaintenanceTicket({
      id,
      actualCompletionDate: body.actualCompletionDate,
      remarks: body.remarks,
    });
    return { item };
  });
}
