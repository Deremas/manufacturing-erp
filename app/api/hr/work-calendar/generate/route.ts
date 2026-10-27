import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { generateHolidayCalendarForYear } from "@/services/hr/attendance.service";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { year?: number };
    const year = Number(body.year);
    const settings = await generateHolidayCalendarForYear(year);

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_WORK_CALENDAR",
      recordId: `holiday-generate-${year}`,
      newValue: { year },
    });

    return NextResponse.json({ settings, year });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate holiday calendar." },
      { status: 400 },
    );
  }
}
