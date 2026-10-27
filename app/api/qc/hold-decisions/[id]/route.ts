import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { approveHoldDecision, saveHoldDecision } from "@/services/qc/qc-quality-system.service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveHoldDecision(body, user.id, id) }), "qc.hold.update");
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async (user) => approveHoldDecision(id, user.id), "qc.hold.approve");
}
