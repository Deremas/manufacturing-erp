import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { assignQcTask } from "@/services/qc/qc-task.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcAction(async (userId) => {
    const body = await request.json();
    return assignQcTask({ taskId: id, assignedToId: String(body.assignedToId ?? ""), assignedById: userId, priority: String(body.priority ?? "NORMAL"), dueDate: body.dueDate || null });
  }, "qc.task.assign");
}
