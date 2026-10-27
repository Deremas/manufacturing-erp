import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { changeLeaveRequestStatus, getLeaveRequestById } from "@/services/hr/leave.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const existing = await getLeaveRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: "submit" | "approve" | "reject" | "cancel";
      rejectionReason?: string | null;
    };

    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    await changeLeaveRequestStatus({
      id,
      action: body.action,
      userId: user.id,
      rejectionReason: body.rejectionReason,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action:
        body.action === "approve"
          ? AuditAction.APPROVE
          : body.action === "reject"
            ? AuditAction.REJECT
            : AuditAction.UPDATE,
      module: "HR_LEAVE",
      recordId: id,
      oldValue: { status: existing.status },
      newValue: { statusAction: body.action, rejectionReason: body.rejectionReason ?? null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change leave status." },
      { status: 500 },
    );
  }
}
