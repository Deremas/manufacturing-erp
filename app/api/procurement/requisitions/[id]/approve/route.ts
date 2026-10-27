import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { approveRequisition } from "@/app/api/procurement/requisitions/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { comment } = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => approveRequisition(id, userId, comment), "procurement.pr.approve");
}
