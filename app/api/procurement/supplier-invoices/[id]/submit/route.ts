import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { submitInvoice } from "@/app/api/procurement/supplier-invoices/helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => submitInvoice(id, userId, body));
}
