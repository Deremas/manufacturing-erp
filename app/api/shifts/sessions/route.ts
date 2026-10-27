import { NextRequest } from "next/server";

import { withShiftAction } from "@/app/api/shifts/helpers";
import { startShiftSession } from "@/services/shift/shift-session.service";

export async function POST(request: NextRequest) {
  return withShiftAction(async (userId) => {
    const body = await request.json();
    return startShiftSession({
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
