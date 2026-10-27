import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { getShiftDefinitions, type ShiftDefinition } from "@/services/production/production-shared.service";

function validateShifts(value: unknown): ShiftDefinition[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Add at least one shift definition");
  const shifts = value.map((entry) => {
    const row = entry as Partial<ShiftDefinition>;
    return {
      code: String(row.code ?? "").trim().toUpperCase(),
      name: String(row.name ?? "").trim(),
      startTime: String(row.startTime ?? "").trim() || undefined,
      endTime: String(row.endTime ?? "").trim() || undefined,
    };
  });
  if (shifts.some((shift) => !shift.code || !shift.name)) throw new Error("Every shift requires a code and name");
  if (new Set(shifts.map((shift) => shift.code)).size !== shifts.length) throw new Error("Shift codes must be unique");
  return shifts;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await getShiftDefinitions() });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { shifts?: unknown };
    const previous = await getShiftDefinitions();
    const shifts = validateShifts(body.shifts);
    await sql`
      INSERT INTO "ModuleSetting" (id, module, key, value, "isArchived", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, 'production', 'shift.definitions', ${JSON.stringify(shifts)}, false, NOW(), NOW())
      ON CONFLICT (module, key) DO UPDATE SET value = EXCLUDED.value, "isArchived" = false, "updatedAt" = NOW()
    `;
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_SHIFT_SETTINGS",
      recordId: "production.shift.definitions",
      oldValue: { shifts: previous },
      newValue: { shifts },
    });
    return NextResponse.json({ items: shifts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save shifts" }, { status: 400 });
  }
}
