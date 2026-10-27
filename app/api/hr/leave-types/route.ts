import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { createLeaveType, listLeaveTypes, type LeaveTypePayload } from "@/services/hr/leave.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listLeaveTypes();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as LeaveTypePayload;
    const id = await createLeaveType(body);
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_LEAVE_TYPE",
      recordId: id ?? "leave-type",
      newValue: body as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create leave type." }, { status: 400 });
  }
}
