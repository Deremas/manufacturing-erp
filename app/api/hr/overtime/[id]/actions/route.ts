import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { changeOvertimeStatus } from "@/services/hr/overtime.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: "submit" | "approve" | "reject" | "cancel" };
    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    await changeOvertimeStatus({ id, action: body.action, userId: user.id });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action:
        body.action === "approve"
          ? AuditAction.APPROVE
          : body.action === "reject"
            ? AuditAction.REJECT
            : AuditAction.UPDATE,
      module: "HR_OVERTIME",
      recordId: id,
      newValue: { action: body.action },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update overtime status." },
      { status: 500 },
    );
  }
}
