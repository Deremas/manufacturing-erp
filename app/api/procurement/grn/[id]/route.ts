import { NextResponse } from "next/server";

import { getReceipt, updateReceipt, withGoodsReceiptAction } from "@/app/api/procurement/grn/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withGoodsReceiptAction(async () => {
    const receipt = await getReceipt(id);
    if (!receipt) {
      return NextResponse.json({ error: "Goods receipt not found" }, { status: 404 });
    }
    return receipt;
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withGoodsReceiptAction(async (userId) => {
    const body = await request.json();
    return updateReceipt(id, body as Record<string, unknown>, userId);
  });
}
