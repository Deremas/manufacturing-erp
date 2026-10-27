import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { submitOrder } from "@/app/api/procurement/purchase-orders/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => submitOrder(id, userId, body), "procurement.po.update");
}
