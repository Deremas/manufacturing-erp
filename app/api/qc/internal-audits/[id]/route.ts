import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { getInternalAudit, saveInternalAudit } from "@/services/qc/qc-quality-system.service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async () => getInternalAudit(id), "qc.audit.view");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveInternalAudit(body, user.id, id) }), "qc.audit.update");
}
