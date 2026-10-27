import { NextRequest } from "next/server";

import { withShiftAction } from "@/app/api/shifts/helpers";
import { createDowntime } from "@/services/shift/downtime.service";
import { shiftBrowserPath } from "@/services/shift/shift-session.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withShiftAction(async (userId) => {
    const body = await request.json();
    const record = await createDowntime({
      shiftSessionId: id,
      startTime: String(body.startTime ?? ""),
      endTime: String(body.endTime ?? ""),
      reason: String(body.reason ?? "OTHER") as "MACHINE_BREAKDOWN" | "POWER_INTERRUPTION" | "MATERIAL_SHORTAGE" | "QUALITY_ISSUE" | "OPERATOR_DELAY" | "MAINTENANCE" | "OTHER",
      assetId: body.assetId ? String(body.assetId) : "",
      productionBatchId: body.productionBatchId ? String(body.productionBatchId) : "",
      maintenanceRequired: body.maintenanceRequired === true,
      remarks: body.remarks ? String(body.remarks) : "",
      createdById: userId,
    });

    return {
      id: record.id,
      redirectTo: await shiftBrowserPath(id),
    };
  });
}
