import { withProcurementAction } from "@/app/api/procurement/helpers";
import { approveInvoice } from "@/app/api/procurement/supplier-invoices/helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProcurementAction(async (userId) => approveInvoice(id, userId));
}
