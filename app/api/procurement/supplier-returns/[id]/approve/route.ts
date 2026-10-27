import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { approveReturn } from "@/app/api/procurement/supplier-returns/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => approveReturn(id, userId, comment), "procurement.supplierReturn.approve");
}
