import { withQcAction } from "@/app/api/qc/helpers";
import { approveQcTest } from "@/services/qc/qc.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcAction((userId) => approveQcTest(id, userId), "qc.test.approve");
}
