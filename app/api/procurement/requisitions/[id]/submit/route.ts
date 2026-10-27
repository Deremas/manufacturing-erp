import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { submitRequisition } from "@/app/api/procurement/requisitions/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => submitRequisition(id, userId, body), "procurement.pr.update");
}
