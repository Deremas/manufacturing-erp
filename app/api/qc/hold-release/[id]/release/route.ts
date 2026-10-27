import { NextRequest } from "next/server";
import { withQcAction } from "@/app/api/qc/helpers";
import { releaseQCHold } from "@/services/qc/hold-release.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return withQcAction((userId) => releaseQCHold(id, userId, body.quantity == null ? undefined : Number(body.quantity), body.destinationLocationId || null, String(body.reason ?? "QC release approved")), "qc.release.approve");
}
