import { withProcurementAction } from "@/app/api/procurement/helpers";
import { cancelRequisition } from "@/app/api/procurement/requisitions/helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async (userId) => cancelRequisition(id, userId), "procurement.pr.cancel");
}
