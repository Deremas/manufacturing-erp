import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import {
  getOvertimeRequestById,
  updateOvertimeRequest,
  type OvertimePayload,
} from "@/services/hr/overtime.service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getOvertimeRequestById(id);
  if (!item) {
    return NextResponse.json({ error: "Overtime request not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getOvertimeRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: "Overtime request not found." }, { status: 404 });
    }

    const body = (await request.json()) as OvertimePayload;
    await updateOvertimeRequest(id, body);

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_OVERTIME",
      recordId: id,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update overtime request." },
      { status: 500 },
    );
  }
}
