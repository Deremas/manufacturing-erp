import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { rejectInvoice } from "@/app/api/procurement/supplier-invoices/helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => rejectInvoice(id, userId, comment), "procurement.invoice.reject");
}
