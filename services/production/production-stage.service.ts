import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { assertProductionMachine, markMachineInUse, restoreMachineIfIdle } from "@/services/production/machine-assignment.service";
import { writeProductionAudit, writeProductionHistory } from "@/services/production/production-shared.service";
import { createQcTasksForBatch } from "@/services/qc/qc-task.service";

export async function startBatchStage(input: { batchId: string; stageId: string; machineId?: string | null; operatorId: string }) {
  return sql.begin(async (tx) => {
    const batches = await tx<Array<{ locationId: string; status: string; shiftSessionId: string; finishedGoodId: string; machineId: string | null }>>`SELECT "locationId", status::text AS status, "shiftSessionId", "finishedGoodId", "machineId" FROM "ProductionBatch" WHERE id = ${input.batchId} LIMIT 1 FOR UPDATE`;
    const batch = batches[0];
    if (!batch) throw new Error("Production batch not found");
    if (["CANCELLED", "POSTED", "REJECTED"].includes(batch.status)) throw new Error("This production batch cannot start another stage");
    const targetStages = await tx<Array<{ sequence: number; name: string }>>`
      SELECT sequence, name FROM "ProductionStage"
      WHERE id = ${input.stageId} AND "isActive" = true AND "isArchived" = false
      LIMIT 1
    `;
    const targetStage = targetStages[0];
    if (!targetStage) throw new Error("Selected production stage is not active");
    const unresolved = await tx<Array<{ id: string; status: string }>>`
      SELECT id, status FROM "ProductionBatchStage"
      WHERE "productionBatchId" = ${input.batchId}
        AND status IN ('ACTIVE', 'ON_HOLD', 'REWORK')
      LIMIT 1
    `;
    if (unresolved[0]) {
      throw new Error(`Resolve the current ${unresolved[0].status.toLowerCase().replace(/_/g, " ")} stage before starting another stage`);
    }
    const completedTarget = await tx<Array<{ id: string }>>`
      SELECT id FROM "ProductionBatchStage"
      WHERE "productionBatchId" = ${input.batchId}
        AND "productionStageId" = ${input.stageId}
        AND status = 'COMPLETED'
      LIMIT 1
    `;
    if (completedTarget[0]) throw new Error(`${targetStage.name} is already completed for this batch`);
    const incompletePrior = await tx<Array<{ name: string }>>`
      SELECT stage.name
      FROM "ProductionStage" stage
      WHERE stage."isActive" = true
        AND stage."isArchived" = false
        AND stage.sequence < ${targetStage.sequence}
        AND NOT EXISTS (
          SELECT 1 FROM "ProductionBatchStage" execution
          WHERE execution."productionBatchId" = ${input.batchId}
            AND execution."productionStageId" = stage.id
            AND execution.status = 'COMPLETED'
        )
      ORDER BY stage.sequence
      LIMIT 1
    `;
    if (incompletePrior[0]) throw new Error(`Complete ${incompletePrior[0].name} before starting ${targetStage.name}`);
    if (input.machineId) await assertProductionMachine(tx, input.machineId, batch.locationId);
    const id = randomUUID();
    await tx`INSERT INTO "ProductionBatchStage" (id, "productionBatchId", "productionStageId", "machineId", "operatorId", status, "startedAt", "createdAt", "updatedAt")
      VALUES (${id}, ${input.batchId}, ${input.stageId}, ${input.machineId || null}, ${input.operatorId}, 'ACTIVE', NOW(), NOW(), NOW())`;
    await tx`UPDATE "ProductionBatch" SET "productionStageId" = ${input.stageId}, "machineId" = COALESCE(${input.machineId || null}, "machineId"), status = 'ACTIVE', "updatedAt" = NOW() WHERE id = ${input.batchId}`;
    const tasks = await createQcTasksForBatch(tx, {
      batchId: input.batchId,
      stageId: input.stageId,
      shiftSessionId: batch.shiftSessionId,
      itemId: batch.finishedGoodId,
      locationId: batch.locationId,
      assetId: input.machineId || batch.machineId,
      allowEmptyConfiguration: true,
      createdById: input.operatorId,
    });
    await writeProductionAudit(tx, input.operatorId, "production.batch-stage", "START", id, { ...input, generatedQcTasks: tasks.length });
    await writeProductionHistory(tx, "production.batch", input.batchId, "STAGE_START", input.operatorId, input.stageId);
    await markMachineInUse(tx, input.machineId || batch.machineId);
    return { id, tasks };
  });
}

export async function completeBatchStage(input: { executionId: string; userId: string; outputQty: number; wastageQty: number }) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ batchId: string; stageId: string; status: string; sequence: number; machineId: string | null; batchMachineId: string | null }>>`
      SELECT execution."productionBatchId" AS "batchId", execution."productionStageId" AS "stageId", execution.status, stage.sequence,
        execution."machineId", batch."machineId" AS "batchMachineId"
      FROM "ProductionBatchStage" execution
      INNER JOIN "ProductionStage" stage ON stage.id = execution."productionStageId"
      INNER JOIN "ProductionBatch" batch ON batch.id = execution."productionBatchId"
      WHERE execution.id = ${input.executionId} LIMIT 1 FOR UPDATE`;
    const execution = rows[0];
    if (!execution) throw new Error("Production stage execution not found");
    if (execution.status !== "ACTIVE") throw new Error("Only an active production stage can be completed");
    const blocking = await tx<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "ProductionStageQCTest" mapping
      LEFT JOIN "QCTask" task
        ON task."productionBatchId" = ${execution.batchId}
       AND task."productionStageId" = mapping."productionStageId"
       AND task."testTypeId" = mapping."testTypeId"
      WHERE mapping."productionStageId" = ${execution.stageId}
        AND mapping."isActive" = true
        AND mapping.required = true
        AND mapping."blocksNextStageOnFail" = true
        AND (
          task.id IS NULL
          OR task.status <> 'COMPLETED'
          OR NOT EXISTS (
            SELECT 1 FROM "QCTest" test
            WHERE test."taskId" = task.id
              AND test.result = 'PASSED'
              AND test.status = 'APPROVED'
          )
        )`;
    if (Number(blocking[0]?.count ?? 0) > 0) throw new Error("Blocking QC tasks must pass and be approved before this stage can complete");
    const downtime = await tx<Array<{ minutes: number }>>`SELECT COALESCE(SUM("durationMinutes"), 0)::int AS minutes FROM "ProductionDowntime" WHERE "productionBatchId" = ${execution.batchId}`;
    await tx`UPDATE "ProductionBatchStage" SET status = 'COMPLETED', "completedAt" = NOW(), "outputQty" = ${Number(input.outputQty)},
      "wastageQty" = ${Number(input.wastageQty)}, "downtimeMinutes" = ${Number(downtime[0]?.minutes ?? 0)}, "updatedAt" = NOW() WHERE id = ${input.executionId}`;
    const laterStages = await tx<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "ProductionStage"
      WHERE "isActive" = true AND "isArchived" = false AND sequence > ${execution.sequence}
    `;
    const batchCompleted = Number(laterStages[0]?.count ?? 0) === 0;
    if (batchCompleted) {
      await tx`UPDATE "ProductionBatch" SET status = 'COMPLETED', "updatedAt" = NOW() WHERE id = ${execution.batchId}`;
    }
    await writeProductionAudit(tx, input.userId, "production.batch-stage", "COMPLETE", input.executionId, input);
    await writeProductionHistory(tx, "production.batch", execution.batchId, "STAGE_COMPLETE", input.userId, batchCompleted ? "Final production stage completed" : "Production stage completed");
    await restoreMachineIfIdle(tx, execution.machineId);
    await restoreMachineIfIdle(tx, execution.batchMachineId);
    return { id: input.executionId, batchCompleted };
  });
}

export async function changeBatchStageStatus(input: { executionId: string; action: "HOLD" | "REWORK" | "RESUME" | "CANCEL"; reason: string; userId: string }) {
  if (input.action !== "RESUME" && !input.reason.trim()) throw new Error(`${input.action.toLowerCase()} reason is required`);
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ batchId: string; status: string; machineId: string | null; batchMachineId: string | null }>>`
      SELECT execution."productionBatchId" AS "batchId", execution.status, execution."machineId", batch."machineId" AS "batchMachineId"
      FROM "ProductionBatchStage" execution
      INNER JOIN "ProductionBatch" batch ON batch.id = execution."productionBatchId"
      WHERE execution.id = ${input.executionId} LIMIT 1 FOR UPDATE`;
    if (!rows[0]) throw new Error("Production stage execution not found");
    const allowedStatuses = input.action === "REWORK"
      ? ["ACTIVE", "ON_HOLD"]
      : input.action === "RESUME"
        ? ["ON_HOLD", "REWORK"]
        : ["ACTIVE"];
    if (!allowedStatuses.includes(rows[0].status)) {
      throw new Error(`${input.action.toLowerCase()} is not allowed while the stage is ${rows[0].status.toLowerCase().replace(/_/g, " ")}`);
    }
    if (input.action === "RESUME") {
      await tx`UPDATE "ProductionBatchStage" SET status = 'ACTIVE', "updatedAt" = NOW() WHERE id = ${input.executionId}`;
      await tx`UPDATE "ProductionBatch" SET status = 'ACTIVE', "updatedAt" = NOW() WHERE id = ${rows[0].batchId}`;
      await markMachineInUse(tx, rows[0].machineId || rows[0].batchMachineId);
    } else {
      const column = input.action === "HOLD" ? "holdReason" : input.action === "REWORK" ? "reworkReason" : "cancelledReason";
      await tx.unsafe(`UPDATE "ProductionBatchStage" SET status = $1, "${column}" = $2, "updatedAt" = NOW() WHERE id = $3`, [input.action === "HOLD" ? "ON_HOLD" : input.action, input.reason.trim(), input.executionId]);
      await tx`UPDATE "ProductionBatch" SET status = ${input.action === "HOLD" ? "PENDING_QC" : input.action === "REWORK" ? "REWORK" : "CANCELLED"}::"ProductionStatus", "updatedAt" = NOW() WHERE id = ${rows[0].batchId}`;
      if (input.action === "CANCEL") {
        await restoreMachineIfIdle(tx, rows[0].machineId);
        await restoreMachineIfIdle(tx, rows[0].batchMachineId);
      }
    }
    await writeProductionAudit(tx, input.userId, "production.batch-stage", input.action, input.executionId, input);
    await writeProductionHistory(tx, "production.batch", rows[0].batchId, `STAGE_${input.action}`, input.userId, input.reason.trim() || "Production stage resumed");
    return { id: input.executionId };
  });
}
