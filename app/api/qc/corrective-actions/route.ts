import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { listCorrectiveActions, saveCorrectiveAction } from "@/services/qc/qc-quality-system.service";

export async function GET() {
  return withQcUser(async () => listCorrectiveActions(), "qc.capa.view");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveCorrectiveAction(body, user.id) }), "qc.capa.create");
}
