import { withApiAuthorization } from "@/lib/auth/api-authorization";
import { assertUserScope } from "@/lib/auth/scope";
import { createDowntime, getDowntimeById, listDowntimeRows } from "@/services/shift/downtime.service";
import { sql } from "@/lib/db";

export async function GET() {
  return withApiAuthorization("production.downtime.view", async (user) => ({
    items: await listDowntimeRows(undefined, user.accessibleLocationIds),
  }));
}

export async function POST(request: Request) {
  return withApiAuthorization("production.downtime.create", async (user) => {
    const body = await request.json();
    const shift=await sql<Array<{locationId:string}>>`SELECT "locationId" FROM "ShiftSession" WHERE id=${String(body.shiftSessionId??"")} LIMIT 1`;
    if(!shift[0]) throw new Error("Shift session not found"); assertUserScope(user,{locationId:shift[0].locationId});
    const result = await createDowntime({
      shiftSessionId: String(body.shiftSessionId ?? ""), startTime: String(body.startTime ?? ""),
      reasonId: body.reasonId || null, assetId: body.assetId || null, productionBatchId: body.productionBatchId || null,
      productionBatchStageId: body.productionBatchStageId || null, operatorId: body.operatorId || user.id,
      failureCause: body.failureCause || null, description: body.description || null,
      maintenanceRequired: Boolean(body.maintenanceRequired), plannedProductionRate: body.plannedProductionRate,
      actualLostQty: body.actualLostQty, remarks: body.remarks || null, createdById: user.id,
    });
    const item = await getDowntimeById(result.id);
    assertUserScope(user, { locationId: String(item?.locationId ?? "") });
    return { item };
  });
}
