import { withQcAction } from "@/app/api/qc/helpers";
import { duplicateQcTemplateVersion } from "@/services/qc/qc-setup.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcAction((userId) => duplicateQcTemplateVersion(id, userId), "qc.setup.manage");
}
