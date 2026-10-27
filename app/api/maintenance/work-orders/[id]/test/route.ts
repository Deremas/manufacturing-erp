import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { testWorkOrder } from "@/services/maintenance/work-execution.service";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";
import { assertUserScope } from "@/lib/auth/api-authorization";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return withMaintenanceAction("maintenance.workOrder.test",async(uid,user)=>{const{id}=await context.params;const wo=await getWorkOrderById(id);if(!wo)throw new Error("Work order not found");assertUserScope(user,{locationId:wo.locationId});const body=await request.json();return {item:await testWorkOrder({workOrderId:id,testedById:uid,...body})};});}
