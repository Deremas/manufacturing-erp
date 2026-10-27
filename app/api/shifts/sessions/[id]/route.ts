import { NextRequest, NextResponse } from "next/server";

import { withShiftAction } from "@/app/api/shifts/helpers";
import { deleteDraftShiftSession, getShiftSessionById, updateShiftSession } from "@/services/shift/shift-session.service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getShiftSessionById(id);
  if (!session) {
    return NextResponse.json({ error: "Shift session not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withShiftAction(async (userId) => {
    const body = await request.json().catch(() => ({}));
    return deleteDraftShiftSession(id, userId, String(body.reason ?? ""));
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withShiftAction(async (userId) => {
    const body = await request.json();
    return updateShiftSession(id, {
      productionDate: String(body.productionDate ?? ""),
      shiftCode: String(body.shiftCode ?? ""),
      locationId: String(body.locationId ?? ""),
      remarks: body.remarks ? String(body.remarks) : "",
      startedById: userId,
      attendance: Array.isArray(body.attendance)
        ? body.attendance.map((row: Record<string, unknown>) => ({
            userId: String(row.userId ?? ""),
            displayName: row.displayName ? String(row.displayName) : "",
            role: row.role ? String(row.role) : "",
            present: row.present !== false,
            remarks: row.remarks ? String(row.remarks) : "",
          }))
        : [],
    });
  });
}
