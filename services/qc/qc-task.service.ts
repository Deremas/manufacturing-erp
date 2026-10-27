import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  nextProductionDocumentNumber,
  type Tx,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";
import { getStageQcConfiguration, getTemplateParameters } from "@/services/qc/qc-setup.service";

export async function createQcTasksForBatch(
  tx: Tx,
  input: {
    batchId: string;
    stageId: string;
    shiftSessionId: string;
    itemId: string;
    locationId: string;
    assetId?: string | null;
    allowEmptyConfiguration?: boolean;
    createdById?: string;
  },
) {
  const mappings = await getStageQcConfiguration(input.stageId, input.itemId);
  if (mappings.length === 0) {
    if (input.allowEmptyConfiguration) return [];
    throw new Error("The selected production stage has no active QC test configuration");
  }

  const tasks = [];
  for (const mapping of mappings) {
    if (!mapping.templateId) {
      throw new Error(`No active QC template is configured for ${mapping.testTypeName}`);
    }
    const existing = await tx<Array<{ id: string; taskNo: string }>>`
      SELECT id, "taskNo" FROM "QCTask"
      WHERE "productionBatchId" = ${input.batchId}
        AND "productionStageId" = ${input.stageId}
        AND "testTypeId" = ${mapping.testTypeId}
      LIMIT 1
    `;
    if (existing[0]) {
      tasks.push(existing[0]);
      continue;
    }

    const id = randomUUID();
    const taskNo = await nextProductionDocumentNumber(tx, "QTK", "QC Task");
    await tx`
      INSERT INTO "QCTask" (
        id, "taskNo", "testTypeId", "templateId", "productionStageId", "productionBatchId",
        "shiftSessionId", "itemId", "locationId", "assetId", status, required, sequence,
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${taskNo}, ${mapping.testTypeId}, ${mapping.templateId}, ${input.stageId},
        ${input.batchId}, ${input.shiftSessionId}, ${input.itemId}, ${input.locationId},
        ${input.assetId ?? null}, 'PENDING', ${mapping.required}, ${mapping.sequence}, NOW(), NOW()
      )
    `;
    tasks.push({ id, taskNo });
  }
  if (tasks.length > 0 && input.createdById) {
    await writeProductionAudit(tx, input.createdById, "qc.task", "GENERATE_FROM_STAGE", input.batchId, {
      productionStageId: input.stageId,
      taskCount: tasks.length,
    });
    await writeProductionHistory(tx, "production.batch", input.batchId, "GENERATE_QC_TASKS", input.createdById, `${tasks.length} QC task(s) generated`);
  }
  return tasks;
}

export async function getQcTaskById(key: string) {
  const rows = await sql<Array<{
    id: string;
    publicId: number;
    taskNo: string;
    testTypeId: string;
    testTypeCode: string;
    testTypeName: string;
    templateId: string;
    templateName: string;
    productionBatchId: string | null;
    batchNo: string | null;
    shiftSessionId: string | null;
    itemId: string | null;
    itemCode: string | null;
    itemName: string | null;
    locationId: string | null;
    locationName: string | null;
    assetId: string | null;
    assetName: string | null;
    status: string;
    required: boolean;
    priority: string;
    dueDate: string | null;
    assignedToId: string | null;
    assignedToName: string | null;
    createdAt: string;
  }>>`
    SELECT task.id, task."publicId", task."taskNo", task."testTypeId", test_type.code AS "testTypeCode",
           test_type.name AS "testTypeName", task."templateId", template.name AS "templateName",
           task."productionBatchId", batch."batchNo", task."shiftSessionId", task."itemId",
           item."itemCode", item."itemName", task."locationId", location."locationName",
           task."assetId", CASE WHEN asset.id IS NULL THEN NULL ELSE asset."assetCode" || ' - ' || asset."assetName" END AS "assetName",
           task.status, task.required, task.priority, task."dueDate"::text AS "dueDate",
           task."assignedToId", assignee.name AS "assignedToName", task."createdAt"::text AS "createdAt"
    FROM "QCTask" task
    INNER JOIN "QCTestType" test_type ON test_type.id = task."testTypeId"
    INNER JOIN "QCTestTemplate" template ON template.id = task."templateId"
    LEFT JOIN "ProductionBatch" batch ON batch.id = task."productionBatchId"
    LEFT JOIN "Item" item ON item.id = task."itemId"
    LEFT JOIN "Location" location ON location.id = task."locationId"
    LEFT JOIN "Asset" asset ON asset.id = task."assetId"
    LEFT JOIN "User" assignee ON assignee.id = task."assignedToId"
    WHERE ${isPublicIdParam(key) ? sql`task."publicId" = ${Number(key)}` : sql`task.id = ${key}`}
    LIMIT 1
  `;
  const task = rows[0];
  if (!task) return null;
  return { ...task, parameters: await getTemplateParameters(task.templateId) };
}

export async function listQcTasks(batchId?: string) {
  return sql<Array<{
    id: string;
    taskNo: string;
    testTypeName: string;
    batchNo: string | null;
    itemCode: string | null;
    itemName: string | null;
    status: string;
    required: boolean;
    priority: string;
    dueDate: string | null;
    assignedToName: string | null;
    isOverdue: boolean;
    testTypeCode: string;
  }>>`
    SELECT task.id, task."taskNo", test_type.name AS "testTypeName", test_type.code AS "testTypeCode", batch."batchNo",
           item."itemCode", item."itemName", task.status, task.required, task.priority,
           task."dueDate"::text AS "dueDate", assignee.name AS "assignedToName",
           (task."dueDate" < NOW() AND task.status NOT IN ('COMPLETED', 'CANCELLED')) AS "isOverdue"
    FROM "QCTask" task
    INNER JOIN "QCTestType" test_type ON test_type.id = task."testTypeId"
    LEFT JOIN "ProductionBatch" batch ON batch.id = task."productionBatchId"
    LEFT JOIN "Item" item ON item.id = task."itemId"
    LEFT JOIN "User" assignee ON assignee.id = task."assignedToId"
    ${batchId ? sql`WHERE task."productionBatchId" = ${batchId}` : sql``}
    ORDER BY task."createdAt" DESC
  `;
}

export async function listQcAssignableUsers() {
  return sql<Array<{ id: string; name: string; email: string }>>`
    SELECT id, name, email FROM "User"
    WHERE "isActive" = true AND "isArchived" = false
    ORDER BY name
  `;
}

export async function assignQcTask(input: {
  taskId: string;
  assignedToId: string;
  assignedById: string;
  priority: string;
  dueDate?: string | null;
}) {
  if (!input.assignedToId) throw new Error("QC assignee is required");
  return sql.begin(async (tx) => {
    const users = await tx<Array<{ id: string }>>`SELECT id FROM "User" WHERE id = ${input.assignedToId} AND "isActive" = true AND "isArchived" = false LIMIT 1`;
    if (!users[0]) throw new Error("Selected QC user is not active");
    const tasks = await tx<Array<{ status: string; assignedToId: string | null; priority: string; dueDate: string | null }>>`SELECT status, "assignedToId", priority, "dueDate"::text AS "dueDate" FROM "QCTask" WHERE id = ${input.taskId} LIMIT 1 FOR UPDATE`;
    if (!tasks[0]) throw new Error("QC task not found");
    if (["COMPLETED", "CANCELLED"].includes(tasks[0].status)) throw new Error("Completed or cancelled QC tasks cannot be reassigned");
    await tx`UPDATE "QCTask" SET "assignedToId" = ${input.assignedToId}, "assignedById" = ${input.assignedById},
      priority = ${input.priority.toUpperCase()}, "dueDate" = ${input.dueDate ? new Date(input.dueDate) : null},
      status = CASE WHEN status = 'PENDING' THEN 'ASSIGNED' ELSE status END, "updatedAt" = NOW() WHERE id = ${input.taskId}`;
    await writeProductionAudit(tx, input.assignedById, "qc.task", "ASSIGN", input.taskId, {
      old: tasks[0],
      new: { assignedToId: input.assignedToId, priority: input.priority.toUpperCase(), dueDate: input.dueDate ?? null },
    });
    await writeProductionHistory(tx, "qc.task", input.taskId, "ASSIGN", input.assignedById, `Assigned QC task with ${input.priority.toUpperCase()} priority`);
    return { id: input.taskId };
  });
}

export async function startQcTask(taskId: string, userId: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ assignedToId: string | null; status: string }>>`SELECT "assignedToId", status FROM "QCTask" WHERE id = ${taskId} LIMIT 1 FOR UPDATE`;
    if (!rows[0]) throw new Error("QC task not found");
    if (rows[0].assignedToId && rows[0].assignedToId !== userId) throw new Error("Only the assigned QC user can start this task");
    if (["COMPLETED", "CANCELLED"].includes(rows[0].status)) throw new Error("This QC task can no longer be started");
    await tx`UPDATE "QCTask" SET "assignedToId" = COALESCE("assignedToId", ${userId}), status = 'IN_PROGRESS', "startedAt" = COALESCE("startedAt", NOW()), "updatedAt" = NOW() WHERE id = ${taskId}`;
    await writeProductionAudit(tx, userId, "qc.task", "START", taskId, { previousStatus: rows[0].status });
    await writeProductionHistory(tx, "qc.task", taskId, "START", userId, "QC task started");
    return { id: taskId };
  });
}

export async function cancelQcTask(taskId: string, userId: string, reason: string) {
  if (!reason.trim()) throw new Error("Cancellation reason is required");
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ status: string }>>`SELECT status FROM "QCTask" WHERE id = ${taskId} LIMIT 1 FOR UPDATE`;
    if (!rows[0]) throw new Error("QC task not found");
    if (["COMPLETED", "CANCELLED"].includes(rows[0].status)) throw new Error("Completed or cancelled tasks cannot be cancelled");
    await tx`UPDATE "QCTask" SET status = 'CANCELLED', "cancelledAt" = NOW(), "cancelReason" = ${reason.trim()}, "updatedAt" = NOW() WHERE id = ${taskId}`;
    await writeProductionAudit(tx, userId, "qc.task", "CANCEL", taskId, { previousStatus: rows[0].status, reason: reason.trim() });
    await writeProductionHistory(tx, "qc.task", taskId, "CANCEL", userId, reason.trim());
    return { id: taskId, cancelledById: userId };
  });
}
