import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { getRetentionSample, saveRetentionSample } from "@/services/qc/qc-quality-system.service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async () => getRetentionSample(id), "qc.retention.view");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveRetentionSample(body, user.id, id) }), "qc.retention.update");
}
