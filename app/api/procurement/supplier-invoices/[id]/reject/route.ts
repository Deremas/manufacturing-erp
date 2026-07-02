import { withProcurementAction } from "@/app/api/procurement/helpers";
import { rejectInvoice } from "@/app/api/procurement/supplier-invoices/helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async (userId) => rejectInvoice(id, userId));
}
