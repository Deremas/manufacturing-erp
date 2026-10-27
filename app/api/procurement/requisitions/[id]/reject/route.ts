import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { rejectRequisition } from "@/app/api/procurement/requisitions/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => rejectRequisition(id, userId, comment), "procurement.pr.reject");
}
