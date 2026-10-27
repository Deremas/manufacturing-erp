import { withQcAction } from "@/app/api/qc/helpers";
import { startQcTask } from "@/services/qc/qc-task.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcAction((userId) => startQcTask(id, userId), "qc.task.start");
}
