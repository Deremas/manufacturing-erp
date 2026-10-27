import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { listRetentionSamples, saveRetentionSample } from "@/services/qc/qc-quality-system.service";

export async function GET() {
  return withQcUser(async () => listRetentionSamples(), "qc.retention.view");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveRetentionSample(body, user.id) }), "qc.retention.create");
}
