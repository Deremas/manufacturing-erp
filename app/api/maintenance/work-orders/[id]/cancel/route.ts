import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { cancelMaintenanceWorkOrder } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("maintenance.workOrder.cancel", async (userId) => {
    const body = await request.json();
    const { id } = await context.params;
    return { item: await cancelMaintenanceWorkOrder({ id, cancelledById: userId, reason: body.reason }) };
  });
}
