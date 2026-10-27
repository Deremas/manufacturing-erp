import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import { changeBatchStageStatus, completeBatchStage } from "@/services/production/production-stage.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkPermission(user, "production.stage.manage")) {
    return NextResponse.json(
      { error: "Forbidden: missing permission production.stage.manage" },
      { status: 403 },
    );
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const action = String(body.action || "");
    if (!["COMPLETE", "HOLD", "REWORK", "RESUME", "CANCEL"].includes(action)) {
      return NextResponse.json({ error: "Unsupported production stage action" }, { status: 400 });
    }
    const result =
      action === "COMPLETE"
        ? await completeBatchStage({
            executionId: id,
            userId: user.id,
            outputQty: Number(body.outputQty || 0),
            wastageQty: Number(body.wastageQty || 0),
          })
        : await changeBatchStageStatus({
            executionId: id,
            action: action as "HOLD" | "REWORK" | "RESUME" | "CANCEL",
            reason: String(body.reason || ""),
            userId: user.id,
          });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
