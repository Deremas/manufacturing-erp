import { withQcUser } from "@/app/api/qc/helpers";
import { getFormSpecifications } from "@/services/qc/qc-master.service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async () => ({ specs: await getFormSpecifications(id) }), "qc.setup.view");
}
