import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { disposeQcHold } from "@/services/qc/hold-release.service";

const permissionByType: Record<string, string> = {
  RELEASE: "qc.release.approve",
  REWORK: "qc.rework.approve",
  SCRAP: "qc.scrap.approve",
  REJECT: "qc.reject.approve",
  RETURN: "qc.reject.approve",
  DOWNGRADE: "qc.release.approve",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const dispositionType = String(body.dispositionType ?? "").toUpperCase();
  if (!permissionByType[dispositionType]) return Response.json({ error: "Unsupported QC disposition" }, { status: 400 });
  return withQcAction((userId) => disposeQcHold({
    holdId: id,
    dispositionType: dispositionType as "RELEASE" | "REWORK" | "SCRAP" | "REJECT" | "RETURN" | "DOWNGRADE",
    quantity: Number(body.quantity), destinationLocationId: body.destinationLocationId || null,
    reason: String(body.reason ?? ""), userId,
  }), permissionByType[dispositionType]);
}
