import { NextResponse } from "next/server";

import { withGoodsReceiptAction } from "@/app/api/procurement/grn/helpers";
import { getReceiptPrefill } from "@/app/api/procurement/grn/helpers";

export async function GET(request: Request) {
  const poId = new URL(request.url).searchParams.get("poId");
  return withGoodsReceiptAction(async () => {
    if (!poId) {
      return NextResponse.json({ error: "poId is required" }, { status: 400 });
    }
    const prefill = await getReceiptPrefill(poId);
    if (!prefill) {
      return NextResponse.json({ error: "Purchase order prefill not found" }, { status: 404 });
    }
    return prefill;
  });
}
