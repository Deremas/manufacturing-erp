import { sql } from "@/lib/db";
import { postProductionOutputDocument } from "@/services/inventory/module-integration.service";
import { recalculateProductionCost } from "@/services/production/production-costing.service";
import { writeProductionAudit, writeProductionHistory } from "@/services/production/production-shared.service";
import { createQCHoldRelease } from "@/services/qc/hold-release.service";
import { createQcTasksForBatch } from "@/services/qc/qc-task.service";

export async function submitProductionBatchToQc(input: {
  batchId: string;
  productionStageId: string;
  qcHoldLocationId: string;
  releaseLocationId: string;
  userId: string;
}) {
  if (!input.productionStageId) throw new Error("Production stage is required for QC submission");
  if (!input.qcHoldLocationId) throw new Error("QC hold location is required");
  if (!input.releaseLocationId) throw new Error("Finished goods release location is required");
  if (input.qcHoldLocationId === input.releaseLocationId) {
    throw new Error("QC hold and finished goods release locations must be different");
  }

  const result = await sql.begin(async (tx) => {
    const rows = await tx<Array<{
      id: string;
      batchNo: string;
      shiftSessionId: string;
      finishedGoodId: string;
      machineId: string | null;
      producedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      wastageQty: number;
      status: string;
      remarks: string | null;
    }>>`
      SELECT id, "batchNo", "shiftSessionId", "finishedGoodId", "machineId", "producedQty", "acceptedQty", "rejectedQty", "wastageQty",
             status::text AS status, remarks
      FROM "ProductionBatch"
      WHERE id = ${input.batchId}
      LIMIT 1
      FOR UPDATE
    `;
    const batch = rows[0];
    if (!batch) throw new Error("Production batch not found");
    if (["POSTED", "RELEASED"].includes(batch.status)) throw new Error("Posted or released output cannot be resubmitted to QC");
    if (batch.status === "CANCELLED") throw new Error("Cancelled production output cannot be submitted to QC");
    const classifiedQty = Number(batch.acceptedQty) + Number(batch.rejectedQty) + Number(batch.wastageQty);
    if (classifiedQty <= 0) throw new Error("At least one output quantity must be recorded");
    if (Math.abs(classifiedQty - Number(batch.producedQty)) > 0.000001) {
      throw new Error("Accepted, rejected, and wastage quantities must equal produced quantity before QC submission");
    }

    const locations = await tx<Array<{ id: string; isQcHoldLocation: boolean }>>`
      SELECT id, "isQcHoldLocation" FROM "Location"
      WHERE id IN (${input.qcHoldLocationId}, ${input.releaseLocationId})
        AND "isStockLocation" = true AND "isActive" = true AND "isArchived" = false
    `;
    if (locations.length !== 2) throw new Error("QC hold and release locations must be active stock locations");
    if (!locations.find((location) => location.id === input.qcHoldLocationId)?.isQcHoldLocation) {
      throw new Error("Selected hold location is not configured as the QC quarantine location");
    }

    const cost = await recalculateProductionCost(batch.id, { tx });
    const outputUnitCost = Number(batch.producedQty) > 0 ? Number(cost.totalCost) / Number(batch.producedQty) : 0;

    await postProductionOutputDocument({
      productionOrderId: batch.id,
      locationId: input.qcHoldLocationId,
      createdById: input.userId,
      remarks: `QC-controlled output ${batch.batchNo}`,
      lines: [{ itemId: batch.finishedGoodId, quantity: classifiedQty, unitCost: outputUnitCost, remarks: batch.remarks ?? undefined }],
    }, { tx });

    const holds: Array<{ id: string; holdNo: string }> = [];
    if (Number(batch.acceptedQty) > 0) holds.push(await createQCHoldRelease({ productionBatchId: batch.id,
      itemId: batch.finishedGoodId, locationId: input.qcHoldLocationId, destinationLocationId: input.releaseLocationId,
      quantity: Number(batch.acceptedQty), holdCategory: "ACCEPTED_QC", holdReason: `Pending configured QC for batch ${batch.batchNo}`,
      remarks: batch.remarks ?? undefined, createdById: input.userId }, { tx }));
    if (Number(batch.rejectedQty) > 0) holds.push(await createQCHoldRelease({ productionBatchId: batch.id,
      itemId: batch.finishedGoodId, locationId: input.qcHoldLocationId, destinationLocationId: input.releaseLocationId,
      quantity: Number(batch.rejectedQty), holdCategory: "REJECTED",
      holdReason: `Rejected output from batch ${batch.batchNo}; rework, reuse, downgrade, return, or scrap required`,
      remarks: batch.remarks ?? undefined, createdById: input.userId }, { tx }));
    if (Number(batch.wastageQty) > 0) holds.push(await createQCHoldRelease({ productionBatchId: batch.id,
      itemId: batch.finishedGoodId, locationId: input.qcHoldLocationId, destinationLocationId: input.releaseLocationId,
      quantity: Number(batch.wastageQty), holdCategory: "WASTAGE",
      holdReason: `Production wastage from batch ${batch.batchNo}; recovery or scrap disposition required`,
      remarks: batch.remarks ?? undefined, createdById: input.userId }, { tx }));

    const tasks = await createQcTasksForBatch(tx, {
      batchId: batch.id,
      stageId: input.productionStageId,
      shiftSessionId: batch.shiftSessionId,
      itemId: batch.finishedGoodId,
      locationId: input.qcHoldLocationId,
      assetId: batch.machineId,
      createdById: input.userId,
    });

    await tx`
      UPDATE "ProductionBatch"
      SET status = 'PENDING_QC', "productionStageId" = ${input.productionStageId},
          "qcHoldLocationId" = ${input.qcHoldLocationId}, "releaseLocationId" = ${input.releaseLocationId},
          "updatedAt" = NOW()
      WHERE id = ${batch.id}
    `;
    await writeProductionAudit(tx, input.userId, "production.output", "SUBMIT_QC", batch.id, {
      productionStageId: input.productionStageId,
      qcHoldLocationId: input.qcHoldLocationId,
      releaseLocationId: input.releaseLocationId,
      taskCount: tasks.length,
    });
    await writeProductionHistory(tx, "production.output", batch.id, "SUBMIT_QC", input.userId, batch.batchNo);
    return { id: batch.id, holdId: holds[0]?.id ?? null, holdIds: holds.map((hold) => hold.id), tasks };
  });

  return result;
}
