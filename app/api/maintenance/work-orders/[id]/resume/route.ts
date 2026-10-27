import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { transitionTechnicianSession } from "@/services/maintenance/work-execution.service";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return withMaintenanceAction("maintenance.workOrder.resume",async(uid)=>{const{id}=await context.params;const body=await request.json();return {item:await transitionTechnicianSession({workOrderId:id,technicianId:uid,action:"resume",notes:body.notes})};});}
