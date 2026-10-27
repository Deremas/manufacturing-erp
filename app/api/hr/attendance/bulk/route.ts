import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { bulkUpsertManualDailyAttendance, type BulkAttendancePayload } from "@/services/hr/attendance.service";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as BulkAttendancePayload;
    const ids = await bulkUpsertManualDailyAttendance(body, user.id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_ATTENDANCE_BULK",
      recordId: `bulk-${body.attendanceDate}`,
      newValue: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ids, count: ids.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save bulk attendance." },
      { status: 400 },
    );
  }
}
