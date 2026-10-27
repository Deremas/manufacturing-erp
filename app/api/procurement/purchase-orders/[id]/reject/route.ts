import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { rejectOrder } from "@/app/api/procurement/purchase-orders/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => rejectOrder(id, userId, comment), "procurement.po.reject");
}
