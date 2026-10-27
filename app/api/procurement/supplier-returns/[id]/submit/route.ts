import { withProcurementAction, readProcurementActionBody } from "@/app/api/procurement/helpers";
import { submitReturn } from "@/app/api/procurement/supplier-returns/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await readProcurementActionBody(request);
  return withProcurementAction(async (userId) => submitReturn(id, userId, body));
}
