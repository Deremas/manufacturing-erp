import { withQcAction } from "@/app/api/qc/helpers";
import { checkQcTest } from "@/services/qc/qc.service";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return withQcAction((userId) => checkQcTest(id, userId), "qc.test.check"); }
