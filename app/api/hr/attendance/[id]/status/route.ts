import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { changeDailyAttendanceApprovalStatus } from "@/services/hr/attendance.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: "approve" | "reject" | "reset" };
    const action = body.action ?? "approve";

    await changeDailyAttendanceApprovalStatus(id, action, user.id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_ATTENDANCE_APPROVAL",
      recordId: id,
      newValue: { action },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change attendance approval status." },
      { status: 400 },
    );
  }
}
