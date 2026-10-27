import { withQcAction } from "@/app/api/qc/helpers";
import { scrapQCHold } from "@/services/qc/hold-release.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcAction((userId) => scrapQCHold(id, userId), "qc.scrap.approve");
}
