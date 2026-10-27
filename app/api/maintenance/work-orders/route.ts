import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { createWorkOrder, getWorkOrders } from "@/services/maintenance/maintenance.service";

export async function GET() {
  return withMaintenanceAction("maintenance.workOrder.view", async () => ({ items: await getWorkOrders() }));
}

export async function POST(request: Request) {
  return withMaintenanceAction("maintenance.workOrder.create", async (userId, user) => {
    const body = await request.json();
    assertUserScope(user, { locationId: body.locationId });
    const item = await createWorkOrder({ ...body, createdById: userId, status: "DRAFT", approvedById: null });
    return { item };
  });
}
