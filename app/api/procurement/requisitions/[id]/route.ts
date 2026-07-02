import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getRequisition, updateRequisition } from "@/app/api/procurement/requisitions/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async () => {
    const requisition = await getRequisition(id);
    if (!requisition) {
      return NextResponse.json({ error: "Purchase requisition not found" }, { status: 404 });
    }
    return requisition;
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    return updateRequisition(id, body as Record<string, unknown>, userId);
  });
}
