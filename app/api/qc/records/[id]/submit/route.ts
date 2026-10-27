import { runQcRecordWorkflow } from "../../_workflow";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return runQcRecordWorkflow(id, "submit");
}
