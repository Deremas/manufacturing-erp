import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getInvoice, updateInvoice } from "@/app/api/procurement/supplier-invoices/helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async () => {
    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json({ error: "Supplier invoice not found" }, { status: 404 });
    }
    return invoice;
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    return updateInvoice(id, body as Record<string, unknown>, userId);
  });
}
