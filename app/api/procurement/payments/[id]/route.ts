import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getPayment, updatePayment } from "@/app/api/procurement/payments/helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async () => {
    const payment = await getPayment(id);
    if (!payment) {
      return NextResponse.json({ error: "Supplier payment not found" }, { status: 404 });
    }
    return payment;
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    return updatePayment(id, body as Record<string, unknown>, userId);
  });
}
