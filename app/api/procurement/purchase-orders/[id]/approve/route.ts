import { withProcurementAction } from "@/app/api/procurement/helpers";
import { approveOrder } from "@/app/api/procurement/purchase-orders/helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async (userId) => approveOrder(id, userId));
}
