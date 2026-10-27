import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { getMonthlyAttendanceSheet, saveMonthlyAttendanceSheet } from "@/services/hr/attendance.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId")?.trim() || "";
    const month = searchParams.get("month")?.trim() || "";
    const sheet = await getMonthlyAttendanceSheet(employeeId, month, {
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ sheet });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load monthly attendance sheet." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      employeeId: string;
      month: string;
      days: Array<{
        attendanceDate: string;
        status: string;
        hoursWorked?: number;
        overtimeHours?: number;
        remarks?: string | null;
      }>;
    };

    const ids = await saveMonthlyAttendanceSheet(
      body.employeeId,
      body.month,
      body.days,
      user.id,
      { accessibleLocationIds: user.accessibleLocationIds },
    );

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_ATTENDANCE_MONTHLY",
      recordId: `${body.employeeId}-${body.month}`,
      newValue: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ids, count: ids.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save monthly attendance sheet." },
      { status: 400 },
    );
  }
}
