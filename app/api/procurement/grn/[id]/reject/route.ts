import { readProcurementActionBody } from "@/app/api/procurement/helpers";
import { rejectReceipt, withGoodsReceiptAction } from "@/app/api/procurement/grn/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withGoodsReceiptAction(async (userId) => rejectReceipt(id, userId, comment), "procurement.grn.reject");
}
