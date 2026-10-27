import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { getPayrollSettings, updatePayrollSettings, type PayrollSettingsRecord } from "@/services/hr/payroll.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getPayrollSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as PayrollSettingsRecord;
    await updatePayrollSettings(body);

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_PAYROLL_SETTINGS",
      recordId: "hr-payroll-settings",
      newValue: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update payroll settings." },
      { status: 500 },
    );
  }
}
