import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { approvePayment } from "@/app/api/procurement/payments/helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => approvePayment(id, userId, comment), "procurement.payment.approve");
}
