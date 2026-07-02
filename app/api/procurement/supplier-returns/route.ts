import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { createReturn, listReturns } from "@/app/api/procurement/supplier-returns/helpers";

export async function GET() {
  return withProcurementAction(async () => listReturns());
}

export async function POST(request: Request) {
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    const created = await createReturn(body as Record<string, unknown>, userId);
    return NextResponse.json(created, { status: 201 });
  });
}
