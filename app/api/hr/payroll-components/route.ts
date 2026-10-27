import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { createPayrollComponent, listPayrollComponents, type PayrollComponentPayload } from "@/services/hr/payroll-component.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listPayrollComponents();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as PayrollComponentPayload;
    const id = await createPayrollComponent(body);
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_PAYROLL_COMPONENT",
      recordId: id ?? "payroll-component",
      newValue: body as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create payroll component." }, { status: 400 });
  }
}
