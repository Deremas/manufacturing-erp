import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";
import { getWorkOrderExecution, recordDiagnosis } from "@/services/maintenance/work-execution.service";

export async function GET(_:Request,context:{params:Promise<{id:string}>}){return withMaintenanceAction("maintenance.workOrder.view",async(_uid,user)=>{const{id}=await context.params;const wo=await getWorkOrderById(id);if(!wo)throw new Error("Work order not found");assertUserScope(user,{locationId:wo.locationId});return getWorkOrderExecution(id);});}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return withMaintenanceAction("maintenance.workOrder.update",async(uid,user)=>{const{id}=await context.params;const wo=await getWorkOrderById(id);if(!wo)throw new Error("Work order not found");assertUserScope(user,{locationId:wo.locationId});const body=await request.json();return {item:await recordDiagnosis({workOrderId:id,technicianId:uid,...body})};});}
