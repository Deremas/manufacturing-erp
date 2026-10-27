import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { rejectReturn } from "@/app/api/procurement/supplier-returns/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => rejectReturn(id, userId, comment), "procurement.supplierReturn.reject");
}
