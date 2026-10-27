import { withQcUser } from "@/app/api/qc/helpers";
import { approveCorrectiveAction } from "@/services/qc/qc-quality-system.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async (user) => approveCorrectiveAction(id, user.id), "qc.capa.update");
}
