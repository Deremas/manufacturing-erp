import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { changePayrollRunStatus, payPayrollRun } from "@/services/hr/payroll.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: "submit" | "approve" | "post" | "pay" | "cancel"; bankAccountId?: string };
    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const result = body.action === "pay"
      ? await payPayrollRun({ id, bankAccountId: String(body.bankAccountId ?? ""), userId: user.id, accessibleLocationIds: user.accessibleLocationIds })
      : await changePayrollRunStatus({ id, action: body.action, userId: user.id });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action:
        body.action === "approve"
          ? AuditAction.APPROVE
          : body.action === "post"
            ? AuditAction.UPDATE
            : AuditAction.UPDATE,
      module: "HR_PAYROLL",
      recordId: id,
      newValue: { action: body.action, bankAccountId: body.bankAccountId ?? null, result: result ?? null },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update payroll run." },
      { status: 500 },
    );
  }
}
