import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { archiveLeaveType, updateLeaveType, type LeaveTypePayload } from "@/services/hr/leave.service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as LeaveTypePayload;
    await updateLeaveType(id, body);
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_LEAVE_TYPE",
      recordId: id,
      newValue: body as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update leave type." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await archiveLeaveType(id);
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.DELETE,
      module: "HR_LEAVE_TYPE",
      recordId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to archive leave type." }, { status: 400 });
  }
}
