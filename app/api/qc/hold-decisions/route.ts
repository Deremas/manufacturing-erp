import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { listHoldDecisions, saveHoldDecision } from "@/services/qc/qc-quality-system.service";

export async function GET() {
  return withQcUser(async () => listHoldDecisions(), "qc.hold.view");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveHoldDecision(body, user.id) }), "qc.hold.create");
}
