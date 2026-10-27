import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { transitionTechnicianSession } from "@/services/maintenance/work-execution.service";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return withMaintenanceAction("maintenance.workOrder.recordLabor",async(uid)=>{const{id}=await context.params;const body=await request.json();return {item:await transitionTechnicianSession({workOrderId:id,technicianId:uid,action:"check-out",notes:body.notes})};});}
