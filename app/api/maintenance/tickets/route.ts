import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { createMaintenanceTicket, getMaintenanceTickets } from "@/services/maintenance/maintenance.service";

export async function GET() {
  return withMaintenanceAction("maintenance.ticket.view", async () => ({ items: await getMaintenanceTickets() }));
}

export async function POST(request: Request) {
  return withMaintenanceAction("maintenance.ticket.create", async (userId, user) => {
    const body = await request.json();
    assertUserScope(user, { locationId: body.locationId, departmentId: body.departmentId });
    const item = await createMaintenanceTicket({ ...body, requestedById: userId, status: "DRAFT", approvalStatus: "PENDING" });
    return { item };
  });
}
