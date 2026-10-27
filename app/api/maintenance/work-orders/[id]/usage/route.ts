import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { recordWorkOrderPartUsage } from "@/services/maintenance/maintenance.service";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";
import { assertUserScope } from "@/lib/auth/api-authorization";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const hasDamage=Array.isArray(body.lines)&&body.lines.some((line:Record<string,unknown>)=>Number(line.damagedQty??0)>0);
  return withMaintenanceAction(hasDamage?"maintenance.workOrder.recordDamage":"maintenance.workOrder.recordUsage", async (userId,user) => {
    const { id } = await context.params;
    const wo=await getWorkOrderById(id);if(!wo)throw new Error("Work order not found");assertUserScope(user,{locationId:wo.locationId});
    return { item: await recordWorkOrderPartUsage({
      workOrderId: id,
      recordedById: userId,
      remarks: body.remarks,
      lines: Array.isArray(body.lines) ? body.lines : [],
    }) };
  });
}
