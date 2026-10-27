import { NextResponse } from "next/server";

import { createReceipt, listReceipts, withGoodsReceiptAction } from "@/app/api/procurement/grn/helpers";

export async function GET() {
  return withGoodsReceiptAction(async () => listReceipts(), "procurement.grn.view");
}

export async function POST(request: Request) {
  return withGoodsReceiptAction(async (userId) => {
    const body = await request.json();
    const created = await createReceipt(body as Record<string, unknown>, userId);
    return NextResponse.json(created, { status: 201 });
  }, "procurement.grn.create");
}
