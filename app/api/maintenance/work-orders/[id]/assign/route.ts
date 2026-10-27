import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assignMaintenanceWorkOrder } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.workOrder.assign", async (userId) => {
    const body = await request.json();
    const { id } = await context.params;
    const item = await assignMaintenanceWorkOrder({
      id,
      assignedTechnicianId: body.assignedTechnicianId,
      supervisorId: body.supervisorId,
      startNow: Boolean(body.startNow),
      performedById: userId,
      remarks: body.remarks,
    });
    return { item };
  });
}
