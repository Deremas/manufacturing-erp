import { NextResponse } from "next/server";

import { withGoodsReceiptAction } from "@/app/api/procurement/grn/helpers";
import { getReceiptPrefill } from "@/app/api/procurement/grn/helpers";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const poKey = url.searchParams.get("poPublicId") ?? url.searchParams.get("poId");
  return withGoodsReceiptAction(async () => {
    if (!poKey) {
      return NextResponse.json({ error: "poPublicId is required" }, { status: 400 });
    }
    const order = await getPurchaseOrderById(poKey);
    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    const prefill = await getReceiptPrefill(order.id);
    if (!prefill) {
      return NextResponse.json({ error: "Purchase order prefill not found" }, { status: 404 });
    }
    return prefill;
  }, "procurement.grn.create");
}
