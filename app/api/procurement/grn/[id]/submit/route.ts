import { readProcurementActionBody } from "@/app/api/procurement/helpers";
import { submitReceipt, withGoodsReceiptAction } from "@/app/api/procurement/grn/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await readProcurementActionBody(request);
  return withGoodsReceiptAction(async (userId) => submitReceipt(id, userId, body), "procurement.grn.update");
}
