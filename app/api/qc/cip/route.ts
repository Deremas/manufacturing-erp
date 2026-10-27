import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { listCipRecords, saveCipRecord } from "@/services/qc/qc-quality-system.service";

export async function GET() {
  return withQcUser(async () => listCipRecords(), "qc.cip.view");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveCipRecord(body, user.id) }), "qc.cip.create");
}
