import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { upsertManualDailyAttendance } from "@/services/hr/attendance.service";

type ImportRow = { employeeNo?: string; attendanceDate?: string; status?: string; hoursWorked?: number; overtimeHours?: number; remarks?: string };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { rows?: ImportRow[] };
    const rows = (body.rows ?? []).slice(0, 2000);
    if (!rows.length) throw new Error("Attendance import contains no rows");
    const employeeNos = Array.from(new Set(rows.map((row) => String(row.employeeNo ?? "").trim()).filter(Boolean)));
    const locationIds = (user.accessibleLocationIds ?? []).filter(Boolean);
    const employees = await sql<Array<{ id: string; employeeNo: string; locationId: string | null }>>`
      SELECT id, "employeeNo", "locationId" FROM "Employee"
      WHERE "employeeNo" IN ${sql(employeeNos)} AND "isArchived" = false AND "isActive" = true
        AND (${user.accessibleLocationIds ? locationIds.length ? sql`("locationId" IS NULL OR "locationId" IN ${sql(locationIds)})` : sql`FALSE` : sql`TRUE`})
    `;
    const employeeMap = new Map(employees.map((employee) => [employee.employeeNo.toUpperCase(), employee]));
    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0;

    for (const [index, row] of rows.entries()) {
      const employeeNo = String(row.employeeNo ?? "").trim().toUpperCase();
      const employee = employeeMap.get(employeeNo);
      if (!employee) { errors.push({ row: index + 2, error: `Employee ${employeeNo || "number"} was not found or is outside your location scope` }); continue; }
      try {
        await upsertManualDailyAttendance({
          employeeId: employee.id,
          attendanceDate: String(row.attendanceDate ?? "").slice(0, 10),
          locationId: employee.locationId,
          status: String(row.status ?? "PRESENT"),
          hoursWorked: Number(row.hoursWorked ?? 0),
          overtimeHours: Number(row.overtimeHours ?? 0),
          remarks: String(row.remarks ?? "Imported attendance"),
        }, user.id, { accessibleLocationIds: user.accessibleLocationIds });
        imported += 1;
      } catch (error) {
        errors.push({ row: index + 2, error: error instanceof Error ? error.message : "Import failed" });
      }
    }

    await createAuditLog({ userId: user.id, userName: user.name, action: AuditAction.CREATE, module: "HR_ATTENDANCE_IMPORT", recordId: `attendance-import-${Date.now()}`, newValue: { imported, failed: errors.length } });
    return NextResponse.json({ imported, failed: errors.length, errors });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Attendance import failed" }, { status: 400 });
  }
}
