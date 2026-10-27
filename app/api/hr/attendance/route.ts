import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { listDailyAttendance, upsertManualDailyAttendance } from "@/services/hr/attendance.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId")?.trim() || undefined;

  const items = await listDailyAttendance({
    accessibleLocationIds: user.accessibleLocationIds,
    employeeId,
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = await upsertManualDailyAttendance(body, user.id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_ATTENDANCE",
      recordId: id ?? "daily-attendance",
      newValue: body as Record<string, unknown>,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save attendance." },
      { status: 400 },
    );
  }
}
