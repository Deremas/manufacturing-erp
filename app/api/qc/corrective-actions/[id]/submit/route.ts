import { withQcUser } from "@/app/api/qc/helpers";
import { submitCorrectiveAction } from "@/services/qc/qc-quality-system.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async () => submitCorrectiveAction(id), "qc.capa.update");
}
