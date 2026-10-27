import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { createMaintenanceSpareRequest, listMaintenanceSpareRequests } from "@/services/maintenance/maintenance.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.spareRequest.view", async () => {
    const { id } = await context.params;
    return { items: await listMaintenanceSpareRequests(id) };
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.spareRequest.create", async (userId) => {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    return { item: await createMaintenanceSpareRequest({ workOrderId: id, requestedById: userId, remarks: body.remarks, lines: Array.isArray(body.lines) ? body.lines : [] }) };
  });
}
