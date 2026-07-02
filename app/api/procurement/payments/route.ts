import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { createPayment, listPayments } from "@/app/api/procurement/payments/helpers";

export async function GET() {
  return withProcurementAction(async () => listPayments());
}

export async function POST(request: Request) {
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    const created = await createPayment(body as Record<string, unknown>, userId);
    return NextResponse.json(created, { status: 201 });
  });
}
