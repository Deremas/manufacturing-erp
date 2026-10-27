import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { cancelQcTask } from "@/services/qc/qc-task.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  return withQcAction(
    (userId) => cancelQcTask(id, userId, String(body.reason ?? "")),
    "qc.task.assign",
  );
}
