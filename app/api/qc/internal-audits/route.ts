import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { listInternalAudits, saveInternalAudit } from "@/services/qc/qc-quality-system.service";

export async function GET() {
  return withQcUser(async () => listInternalAudits(), "qc.audit.view");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveInternalAudit(body, user.id) }), "qc.audit.create");
}
