import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { rejectPayment } from "@/app/api/procurement/payments/helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => rejectPayment(id, userId, comment), "procurement.payment.reject");
}
