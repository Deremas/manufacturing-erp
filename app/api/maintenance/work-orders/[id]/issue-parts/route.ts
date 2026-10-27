import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { issueWorkOrderParts } from "@/services/maintenance/maintenance.service";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";
import { assertUserScope } from "@/lib/auth/api-authorization";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const permission = body.spareRequestId ? "maintenance.workOrder.issueParts" : "maintenance.workOrder.directIssue";
  return withMaintenanceAction(permission, async (userId,user) => {
    const { id } = await context.params;
    const wo=await getWorkOrderById(id);if(!wo)throw new Error("Work order not found");assertUserScope(user,{locationId:wo.locationId});
    const item = await issueWorkOrderParts({
      workOrderId: id,
      locationId: body.locationId,
      createdById: userId,
      remarks: body.remarks,
      spareRequestId: body.spareRequestId,
      directIssueReason: body.directIssueReason,
      lines: Array.isArray(body.lines) ? body.lines : [],
    });
    return { item };
  });
}
