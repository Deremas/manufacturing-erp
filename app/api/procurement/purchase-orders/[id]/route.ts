import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getOrder, updateOrder } from "@/app/api/procurement/purchase-orders/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async () => {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    return order;
  }, "procurement.po.view");
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    return updateOrder(id, body as Record<string, unknown>, userId);
  }, "procurement.po.update");
}
