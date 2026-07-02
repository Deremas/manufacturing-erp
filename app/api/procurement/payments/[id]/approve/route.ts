import { withProcurementAction } from "@/app/api/procurement/helpers";
import { approvePayment } from "@/app/api/procurement/payments/helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async (userId) => approvePayment(id, userId));
}
