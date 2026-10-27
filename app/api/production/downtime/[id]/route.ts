import { withApiAuthorization } from "@/lib/auth/api-authorization";
import { assertUserScope } from "@/lib/auth/scope";
import { getDowntimeById, updateDowntime } from "@/services/shift/downtime.service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  return withApiAuthorization("production.downtime.view", async (user) => {
    const { id } = await context.params; const item = await getDowntimeById(id);
    if (!item) throw new Error("Downtime record not found");
    assertUserScope(user, { locationId: String(item.locationId) }); return { item };
  });
}

export async function PUT(request:Request,context:{params:Promise<{id:string}>}){
  return withApiAuthorization("production.downtime.update",async user=>{const{id}=await context.params;const current=await getDowntimeById(id);if(!current)throw new Error("Downtime record not found");assertUserScope(user,{locationId:String(current.locationId)});const body=await request.json();await updateDowntime({id,updatedById:user.id,failureCause:body.failureCause,description:body.description,operatorId:body.operatorId,plannedProductionRate:body.plannedProductionRate,actualLostQty:body.actualLostQty,remarks:body.remarks});return{item:await getDowntimeById(id)};});
}
