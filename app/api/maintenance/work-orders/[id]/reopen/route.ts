import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { reopenMaintenanceWorkOrder } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.workOrder.start", async (userId) => {
    const body = await request.json();
    const { id } = await context.params;
    const item = await reopenMaintenanceWorkOrder({ id, reopenedById: userId, reason: body.reason });
    return { item };
  });
}
