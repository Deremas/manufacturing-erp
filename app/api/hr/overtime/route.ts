import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import {
  createOvertimeRequest,
  listOvertimeRequests,
  type OvertimePayload,
} from "@/services/hr/overtime.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listOvertimeRequests({
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
    const body = (await request.json()) as OvertimePayload;
    const id = await createOvertimeRequest(body, user.id);
    if (!id) {
      return NextResponse.json({ error: "Failed to create overtime request." }, { status: 500 });
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_OVERTIME",
      recordId: id,
      newValue: body as unknown as Record<string, unknown>,
    });

    const [created] = await sql<Array<{ publicId: number }>>`
      SELECT "publicId" FROM "OvertimeRequest" WHERE id = ${id} LIMIT 1
    `;

    return NextResponse.json({ id, publicId: created?.publicId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create overtime request." },
      { status: 500 },
    );
  }
}
