import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { createNonconformityReinspectionTask } from "@/services/qc/nonconformity.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return withQcAction(
    (userId) => createNonconformityReinspectionTask({
      id,
      userId,
      assignedToId: body.assignedToId || null,
      dueDate: body.dueDate || null,
    }),
    "qc.nc.manage",
  );
}
