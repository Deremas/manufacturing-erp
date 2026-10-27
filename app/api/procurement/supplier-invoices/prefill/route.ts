import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getInvoicePrefill } from "@/app/api/procurement/supplier-invoices/helpers";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const poKey = url.searchParams.get("poPublicId") ?? url.searchParams.get("poId") ?? undefined;
  const grnKey = url.searchParams.get("grnPublicId") ?? url.searchParams.get("grnId") ?? undefined;
  return withProcurementAction(async () => {
    const [po, grn] = await Promise.all([
      poKey ? getPurchaseOrderById(poKey) : Promise.resolve(null),
      grnKey ? getGoodsReceiptById(grnKey) : Promise.resolve(null),
    ]);
    const prefill = await getInvoicePrefill({
      poId: po?.id,
      grnId: grn?.id,
    });
    if (!prefill) {
      return NextResponse.json({ error: "Invoice prefill source not found" }, { status: 404 });
    }
    return prefill;
  });
}
