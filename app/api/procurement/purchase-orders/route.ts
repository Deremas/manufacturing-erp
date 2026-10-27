import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { createOrder, listOrders } from "@/app/api/procurement/purchase-orders/helpers";

export async function GET() {
  return withProcurementAction(async () => listOrders(), "procurement.po.view");
}

export async function POST(request: Request) {
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    const created = await createOrder(body as Record<string, unknown>, userId);
    return NextResponse.json(created, { status: 201 });
  }, "procurement.po.create");
}
