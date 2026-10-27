import { NextRequest } from "next/server";

import { withShiftAction } from "@/app/api/shifts/helpers";
import { endShiftSession } from "@/services/shift/shift-session.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withShiftAction(async (userId) => {
    const body = await request.json().catch(() => ({}));
    return endShiftSession(id, userId, typeof body.remarks === "string" ? body.remarks : undefined);
  });
}
