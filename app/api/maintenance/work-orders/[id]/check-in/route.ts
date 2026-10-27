import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { checkInTechnician } from "@/services/maintenance/work-execution.service";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return withMaintenanceAction("maintenance.workOrder.start",async(uid)=>{const{id}=await context.params;const body=await request.json();return {item:await checkInTechnician({workOrderId:id,technicianId:uid,notes:body.notes})};});}
