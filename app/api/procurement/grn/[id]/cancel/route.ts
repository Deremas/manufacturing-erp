import { cancelReceipt, withGoodsReceiptAction } from "@/app/api/procurement/grn/helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withGoodsReceiptAction(async (userId) => cancelReceipt(id, userId));
}
