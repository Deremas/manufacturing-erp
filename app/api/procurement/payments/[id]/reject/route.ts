import { withProcurementAction } from "@/app/api/procurement/helpers";
import { rejectPayment } from "@/app/api/procurement/payments/helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async (userId) => rejectPayment(id, userId));
}
