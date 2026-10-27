import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { submitPayment } from "@/app/api/procurement/payments/helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => submitPayment(id, userId, body));
}
