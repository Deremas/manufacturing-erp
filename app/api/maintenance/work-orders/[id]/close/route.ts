import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { closeMaintenanceWorkOrder } from "@/services/maintenance/maintenance.service";
import { checkPermission } from "@/lib/permissions/permissions";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.workOrder.close", async (userId, user) => {
    const body = await request.json();
    const { id } = await context.params;
    const current=await getWorkOrderById(id); if(!current) throw new Error("Work order not found"); assertUserScope(user,{locationId:current.locationId});
    if (body.unresolvedOverrideReason && !checkPermission(user, "maintenance.workOrder.overrideUnresolvedParts")) throw new Error("Forbidden: unresolved-parts override permission is required");
    const item = await closeMaintenanceWorkOrder({
      id,
      closedById: userId,
      closureRemarks: body.closureRemarks,
      unresolvedOverrideReason: body.unresolvedOverrideReason,
      unresolvedOverrideApprovedById: body.unresolvedOverrideReason ? userId : undefined,
      leaveOutOfService: Boolean(body.leaveOutOfService),
    });
    return { item };
  });
}
