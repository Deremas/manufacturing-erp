import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import { startBatchStage } from "@/services/production/production-stage.service";

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    return NextResponse.json(
      await startBatchStage({
        batchId: body.batchId,
        stageId: body.stageId,
        machineId: body.machineId,
        operatorId: user.id,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
