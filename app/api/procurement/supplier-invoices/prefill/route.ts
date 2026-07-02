import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getInvoicePrefill } from "@/app/api/procurement/supplier-invoices/helpers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const poId = url.searchParams.get("poId") ?? undefined;
  const grnId = url.searchParams.get("grnId") ?? undefined;
  return withProcurementAction(async () => {
    const prefill = await getInvoicePrefill({ poId, grnId });
    if (!prefill) {
      return NextResponse.json({ error: "Invoice prefill source not found" }, { status: 404 });
    }
    return prefill;
  });
}
