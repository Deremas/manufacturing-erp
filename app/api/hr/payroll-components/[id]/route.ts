import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { archivePayrollComponent, updatePayrollComponent, type PayrollComponentPayload } from "@/services/hr/payroll-component.service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as PayrollComponentPayload;
    await updatePayrollComponent(id, body);
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_PAYROLL_COMPONENT",
      recordId: id,
      newValue: body as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update payroll component." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await archivePayrollComponent(id);
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.DELETE,
      module: "HR_PAYROLL_COMPONENT",
      recordId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to archive payroll component." }, { status: 400 });
  }
}
