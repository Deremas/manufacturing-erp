import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { createRequisition, listRequisitions } from "@/app/api/procurement/requisitions/helpers";

export async function GET() {
  return withProcurementAction(async () => listRequisitions(), "procurement.pr.view");
}

export async function POST(request: Request) {
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    const created = await createRequisition(body as Record<string, unknown>, userId);
    return NextResponse.json(created, { status: 201 });
  }, "procurement.pr.create");
}
