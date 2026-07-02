import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { createInvoice, listInvoices } from "@/app/api/procurement/supplier-invoices/helpers";

export async function GET() {
  return withProcurementAction(async () => listInvoices());
}

export async function POST(request: Request) {
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    const created = await createInvoice(body as Record<string, unknown>, userId);
    return NextResponse.json(created, { status: 201 });
  });
}
