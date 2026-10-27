import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import {
  createLeaveRequest,
  listLeaveRequests,
  type LeaveRequestPayload,
} from "@/services/hr/leave.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listLeaveRequests({
    accessibleLocationIds: user.accessibleLocationIds,
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as LeaveRequestPayload;
    if (!body.employeeId || !body.leaveTypeId || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Employee, leave type, start date, and end date are required." },
        { status: 400 },
      );
    }

    const id = await createLeaveRequest(body, user.id);
    if (!id) {
      return NextResponse.json({ error: "Failed to create leave request." }, { status: 500 });
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_LEAVE",
      recordId: id,
      newValue: {
        employeeId: body.employeeId,
        leaveTypeId: body.leaveTypeId,
        startDate: body.startDate,
        endDate: body.endDate,
      },
    });

    const [created] = await sql<Array<{ publicId: number }>>`
      SELECT "publicId" FROM "LeaveRequest" WHERE id = ${id} LIMIT 1
    `;

    return NextResponse.json({ id, publicId: created?.publicId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create leave request." },
      { status: 500 },
    );
  }
}
