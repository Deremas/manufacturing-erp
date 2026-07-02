import { withProcurementAction } from "@/app/api/procurement/helpers";
import { approveRequisition } from "@/app/api/procurement/requisitions/helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async (userId) => approveRequisition(id, userId));
}
