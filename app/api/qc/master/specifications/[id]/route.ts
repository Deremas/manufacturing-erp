import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { updateParameterSpecification } from "@/services/qc/qc-master.service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return withQcUser(async () => {
    await updateParameterSpecification(id, body);
    return { ok: true };
  }, "qc.setup.update");
}
