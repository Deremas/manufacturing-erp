import { withProcurementAction } from "@/app/api/procurement/helpers";
import { cancelReturn } from "@/app/api/procurement/supplier-returns/helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async (userId) => cancelReturn(id, userId));
}
