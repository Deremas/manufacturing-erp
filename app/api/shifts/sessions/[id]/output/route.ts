import { NextRequest } from "next/server";

import { withShiftAction } from "@/app/api/shifts/helpers";
import {
  createProductionBatch,
  postProductionBatch,
} from "@/services/production/production-batch.service";
import { submitProductionBatchToQc } from "@/services/production/production-qc-integration.service";
import { shiftBrowserPath } from "@/services/shift/shift-session.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withShiftAction(async (userId) => {
    const body = await request.json();
    const action = String(body.action ?? "draft");
    const batch = await createProductionBatch({
      shiftSessionId: id,
      bomId: body.bomId ? String(body.bomId) : null,
      finishedGoodId: String(body.finishedGoodId ?? ""),
      locationId: String(body.locationId ?? ""),
      machineId: body.machineId ? String(body.machineId) : null,
      producedQty: Number(body.producedQty ?? 0),
      acceptedQty: Number(body.acceptedQty ?? 0),
      rejectedQty: Number(body.rejectedQty ?? 0),
      wastageQty: Number(body.wastageQty ?? 0),
      remarks: body.remarks ? String(body.remarks) : "",
      createdById: userId,
      status: action === "draft" ? "DRAFT" : "COMPLETED",
    });

    if (action === "post") {
      await postProductionBatch(batch.id, userId);
      return { id: batch.id, redirectTo: await shiftBrowserPath(id) };
    }

    if (action === "submit-qc") {
      const submission = await submitProductionBatchToQc({
        batchId: batch.id,
        productionStageId: String(body.productionStageId ?? ""),
        qcHoldLocationId: String(body.qcHoldLocationId ?? ""),
        releaseLocationId: String(body.locationId ?? ""),
        userId,
      });
      const firstTask = submission.tasks[0];
      return {
        id: batch.id,
        redirectTo: firstTask
          ? `/qc/water-test/create?taskId=${encodeURIComponent(firstTask.id)}`
          : await shiftBrowserPath(id),
      };
    }

    return { id: batch.id, redirectTo: await shiftBrowserPath(id) };
  });
}
