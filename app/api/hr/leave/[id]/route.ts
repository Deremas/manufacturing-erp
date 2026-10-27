import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import {
  getLeaveRequestById,
  updateLeaveRequest,
  type LeaveRequestPayload,
} from "@/services/hr/leave.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getLeaveRequestById(id);
  if (!item) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getLeaveRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    const body = (await request.json()) as LeaveRequestPayload;
    if (!body.employeeId || !body.leaveTypeId || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Employee, leave type, start date, and end date are required." },
        { status: 400 },
      );
    }

    await updateLeaveRequest(id, body);

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_LEAVE",
      recordId: id,
      oldValue: {
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        status: existing.status,
      },
      newValue: {
        employeeId: body.employeeId,
        leaveTypeId: body.leaveTypeId,
        startDate: body.startDate,
        endDate: body.endDate,
      },
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update leave request." },
      { status: 500 },
    );
  }
}
