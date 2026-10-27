import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { returnWorkOrderParts } from "@/services/maintenance/maintenance.service";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";
import { assertUserScope } from "@/lib/auth/api-authorization";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.workOrder.returnParts", async (userId,user) => {
    const body = await request.json();
    const { id } = await context.params;
    const wo=await getWorkOrderById(id);if(!wo)throw new Error("Work order not found");assertUserScope(user,{locationId:wo.locationId});
    const item = await returnWorkOrderParts({
      workOrderId: id,
      locationId: body.locationId,
      createdById: userId,
      remarks: body.remarks,
      lines: Array.isArray(body.lines) ? body.lines : [],
    });
    return { item };
  });
}
