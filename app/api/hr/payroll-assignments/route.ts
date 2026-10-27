import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { createEmployeePayrollAssignment, listEmployeePayrollAssignments, type EmployeePayrollAssignmentPayload } from "@/services/hr/payroll-assignment.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId")?.trim() || undefined;

  const items = await listEmployeePayrollAssignments({
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
    const body = (await request.json()) as EmployeePayrollAssignmentPayload;
    const id = await createEmployeePayrollAssignment(body, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_PAYROLL_ASSIGNMENT",
      recordId: id ?? "payroll-assignment",
      newValue: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payroll assignment." },
      { status: 400 },
    );
  }
}
