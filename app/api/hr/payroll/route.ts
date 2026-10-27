import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { createPayrollRun, listPayrollRuns, type PayrollRunPayload } from "@/services/hr/payroll.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listPayrollRuns({
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
    const body = (await request.json()) as PayrollRunPayload;
    const created = await createPayrollRun(body, user.id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_PAYROLL",
      recordId: created.id,
      newValue: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ id: created.id, publicId: created.publicId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate payroll run." },
      { status: 500 },
    );
  }
}
