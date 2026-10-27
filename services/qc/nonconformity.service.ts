import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { nextProductionDocumentNumber, writeProductionAudit, writeProductionHistory } from "@/services/production/production-shared.service";

export async function listNonconformities() {
  try {
    return await sql<Array<{
      id: string;
      ncNo: string;
      batchNo: string | null;
      itemCode: string | null;
      itemName: string | null;
      locationName: string | null;
      issueDescription: string;
      severity: string;
      reinspectionResult: string | null;
      status: string;
    }>>`
      SELECT
        nc.id,
        nc."ncNo",
        pb."batchNo" AS "batchNo",
        i."itemCode" AS "itemCode",
        i."itemName" AS "itemName",
        l."locationName" AS "locationName",
        nc."issueDescription",
        nc.severity,
        nc."reinspectionResult",
        nc.status
      FROM "QCNonconformity" nc
      LEFT JOIN "ProductionBatch" pb ON pb.id = nc."productionBatchId"
      LEFT JOIN "Item" i ON i.id = nc."itemId"
      LEFT JOIN "Location" l ON l.id = nc."locationId"
      ORDER BY nc."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function createNonconformity(payload: {
  productionBatchId?: string | null;
  qcTestId?: string | null;
  assetId?: string | null;
  itemId?: string | null;
  locationId?: string | null;
  issueDescription: string;
  severity: string;
  rootCause?: string;
  correctiveAction?: string;
  responsiblePersonId?: string | null;
  dueDate?: string | null;
  reinspectionResult?: string;
  createdById: string;
}) {
  return sql.begin(async (tx) => {
    const issueDescription = payload.issueDescription.trim();
    const severity = payload.severity.trim().toUpperCase();
    if (!issueDescription) throw new Error("Issue description is required");
    if (!['MINOR', 'MAJOR', 'CRITICAL'].includes(severity)) throw new Error("Invalid nonconformity severity");

    let productionBatchId = payload.productionBatchId ?? null;
    let itemId = payload.itemId ?? null;
    let locationId = payload.locationId ?? null;
    let assetId = payload.assetId ?? null;
    if (payload.qcTestId) {
      const tests = await tx<Array<{ productionBatchId: string | null; itemId: string | null; locationId: string | null; assetId: string | null }>>`
        SELECT "productionBatchId", "itemId", "locationId", "assetId"
        FROM "QCTest" WHERE id = ${payload.qcTestId} LIMIT 1
      `;
      if (!tests[0]) throw new Error("Selected QC test was not found");
      productionBatchId = tests[0].productionBatchId ?? productionBatchId;
      itemId = tests[0].itemId ?? itemId;
      locationId = tests[0].locationId ?? locationId;
      assetId = tests[0].assetId ?? assetId;
    }
    if (productionBatchId) {
      const batches = await tx<Array<{ finishedGoodId: string; locationId: string }>>`
        SELECT "finishedGoodId", "locationId" FROM "ProductionBatch" WHERE id = ${productionBatchId} LIMIT 1
      `;
      if (!batches[0]) throw new Error("Selected production batch was not found");
      itemId = itemId ?? batches[0].finishedGoodId;
      locationId = locationId ?? batches[0].locationId;
    }
    if (payload.responsiblePersonId) {
      const users = await tx<Array<{ id: string }>>`
        SELECT id FROM "User" WHERE id = ${payload.responsiblePersonId} AND "isActive" = true AND "isArchived" = false LIMIT 1
      `;
      if (!users[0]) throw new Error("Responsible user was not found or is inactive");
    }

    const id = randomUUID();
    const ncNo = await nextProductionDocumentNumber(tx, "NC", "QC Nonconformity");
    await tx`
      INSERT INTO "QCNonconformity" (
        id, "ncNo", "productionBatchId", "qcTestId", "assetId", "itemId", "locationId", "issueDescription", severity,
        "rootCause", "correctiveAction", "responsiblePersonId", "dueDate", "reinspectionResult", status, "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${ncNo},
        ${productionBatchId},
        ${payload.qcTestId ?? null},
        ${assetId},
        ${itemId},
        ${locationId},
        ${issueDescription},
        ${severity},
        ${payload.rootCause?.trim() || null},
        ${payload.correctiveAction ?? null},
        ${payload.responsiblePersonId ?? null},
        ${payload.dueDate ? new Date(payload.dueDate) : null},
        ${payload.reinspectionResult ?? "PENDING"},
        'OPEN',
        ${payload.createdById},
        NOW(),
        NOW()
      )
    `;
    await writeProductionAudit(tx, payload.createdById, "qc.nonconformity", "CREATE", id, payload);
    await writeProductionHistory(tx, "qc.nonconformity", id, "CREATE", payload.createdById, ncNo);
    return { id, ncNo };
  });
}

export async function getNonconformityReferenceData() {
  const [tests, batches, items, locations, assets, users] = await Promise.all([
    sql<Array<{ id: string; testNo: string; result: string; productionBatchId: string | null; itemId: string | null; locationId: string | null; assetId: string | null }>>`
      SELECT id, "testNo", result::text AS result, "productionBatchId", "itemId", "locationId", "assetId"
      FROM "QCTest" WHERE status IN ('CHECKED', 'APPROVED', 'REJECTED') ORDER BY "sampleDate" DESC LIMIT 250`,
    sql<Array<{ id: string; batchNo: string; finishedGoodId: string; locationId: string }>>`
      SELECT id, "batchNo", "finishedGoodId", "locationId" FROM "ProductionBatch" ORDER BY "createdAt" DESC LIMIT 250`,
    sql<Array<{ id: string; itemCode: string; itemName: string }>>`
      SELECT id, "itemCode", "itemName" FROM "Item" WHERE "isActive" = true AND "isArchived" = false ORDER BY "itemCode"`,
    sql<Array<{ id: string; locationCode: string; locationName: string }>>`
      SELECT id, "locationCode", "locationName" FROM "Location" WHERE "isActive" = true AND "isArchived" = false ORDER BY "locationName"`,
    sql<Array<{ id: string; assetCode: string; assetName: string }>>`
      SELECT id, "assetCode", "assetName" FROM "Asset" WHERE "isActive" = true AND "isArchived" = false ORDER BY "assetCode"`,
    sql<Array<{ id: string; name: string }>>`
      SELECT id, name FROM "User" WHERE "isActive" = true AND "isArchived" = false ORDER BY name`,
  ]);
  return { tests, batches, items, locations, assets, users };
}

export async function getNonconformityById(key: string) {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT nc.*, batch."batchNo", item."itemCode", item."itemName", location."locationName", test."testNo",
      asset."assetCode", asset."assetName", responsible.name AS "responsibleName",
      reinspection_task."taskNo" AS "reinspectionTaskNo", reinspection_test."testNo" AS "reinspectionTestNo",
      reinspection_test.status AS "reinspectionTestStatus"
    FROM "QCNonconformity" nc LEFT JOIN "ProductionBatch" batch ON batch.id = nc."productionBatchId"
    LEFT JOIN "Item" item ON item.id = nc."itemId" LEFT JOIN "Location" location ON location.id = nc."locationId"
    LEFT JOIN "QCTest" test ON test.id = nc."qcTestId" LEFT JOIN "Asset" asset ON asset.id = nc."assetId"
    LEFT JOIN "User" responsible ON responsible.id = nc."responsiblePersonId"
    LEFT JOIN "QCTask" reinspection_task ON reinspection_task.id = nc."reinspectionTaskId"
    LEFT JOIN "QCTest" reinspection_test ON reinspection_test.id = nc."reinspectionTestId"
    WHERE ${isPublicIdParam(key) ? sql`nc."publicId" = ${Number(key)}` : sql`nc.id = ${key}`} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createNonconformityReinspectionTask(input: {
  id: string;
  userId: string;
  assignedToId?: string | null;
  dueDate?: string | null;
}) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{
      status: string;
      reinspectionTaskId: string | null;
      qcTestId: string | null;
      testTypeId: string | null;
      templateId: string | null;
      productionBatchId: string | null;
      shiftSessionId: string | null;
      itemId: string | null;
      locationId: string | null;
      assetId: string | null;
      productionStageId: string | null;
    }>>`
      SELECT nc.status, nc."reinspectionTaskId", nc."qcTestId", test."testTypeId", test."templateId",
        test."productionBatchId", test."shiftSessionId", test."itemId", test."locationId", test."assetId",
        source_task."productionStageId"
      FROM "QCNonconformity" nc
      LEFT JOIN "QCTest" test ON test.id = nc."qcTestId"
      LEFT JOIN "QCTask" source_task ON source_task.id = test."taskId"
      WHERE nc.id = ${input.id}
      LIMIT 1 FOR UPDATE OF nc
    `;
    const nc = rows[0];
    if (!nc) throw new Error("Nonconformity not found");
    if (nc.status === "CLOSED") throw new Error("Closed nonconformities cannot be reinspected");
    if (nc.reinspectionTaskId) return { id: nc.reinspectionTaskId, existing: true };
    if (!nc.qcTestId || !nc.testTypeId || !nc.templateId) {
      throw new Error("A source QC test with an active template is required before creating a reinspection task");
    }
    if (input.assignedToId) {
      const users = await tx<Array<{ id: string }>>`SELECT id FROM "User" WHERE id = ${input.assignedToId} AND "isActive" = true AND "isArchived" = false LIMIT 1`;
      if (!users[0]) throw new Error("Selected reinspection user is not active");
    }
    const id = randomUUID();
    const taskNo = await nextProductionDocumentNumber(tx, "QTK", "QC Reinspection Task");
    await tx`
      INSERT INTO "QCTask" (
        id, "taskNo", "testTypeId", "templateId", "productionStageId", "productionBatchId", "shiftSessionId",
        "itemId", "locationId", "assetId", status, required, sequence, "assignedToId", "assignedById", priority,
        "dueDate", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${taskNo}, ${nc.testTypeId}, ${nc.templateId}, ${nc.productionStageId}, ${nc.productionBatchId}, ${nc.shiftSessionId},
        ${nc.itemId}, ${nc.locationId}, ${nc.assetId}, ${input.assignedToId ? "ASSIGNED" : "PENDING"}, true, 999,
        ${input.assignedToId ?? null}, ${input.assignedToId ? input.userId : null}, 'HIGH',
        ${input.dueDate ? new Date(input.dueDate) : null}, NOW(), NOW()
      )
    `;
    await tx`
      UPDATE "QCNonconformity"
      SET "reinspectionTaskId" = ${id}, "reinspectionTestId" = NULL, "reinspectionResult" = 'PENDING',
        "reinspectionDate" = NULL, status = 'REINSPECTION_PENDING', "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    await writeProductionAudit(tx, input.userId, "qc.nonconformity", "CREATE_REINSPECTION_TASK", input.id, {
      reinspectionTaskId: id, taskNo, assignedToId: input.assignedToId ?? null, dueDate: input.dueDate ?? null,
    });
    await writeProductionHistory(tx, "qc.nonconformity", input.id, "CREATE_REINSPECTION_TASK", input.userId, taskNo);
    return { id, taskNo, existing: false };
  });
}

export async function updateNonconformityAction(input: {
  id: string; userId: string; responsiblePersonId?: string | null; rootCause?: string; correctiveAction?: string;
  dueDate?: string | null; reinspectionResult?: string; reinspectionDate?: string | null; disposition?: string;
}) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ status: string }>>`SELECT status FROM "QCNonconformity" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    if (!rows[0]) throw new Error("Nonconformity not found");
    if (rows[0].status === "CLOSED") throw new Error("Closed nonconformities cannot be changed");
    await tx`UPDATE "QCNonconformity" SET "responsiblePersonId" = COALESCE(${input.responsiblePersonId || null}, "responsiblePersonId"),
      "rootCause" = COALESCE(${input.rootCause?.trim() || null}, "rootCause"), "correctiveAction" = COALESCE(${input.correctiveAction?.trim() || null}, "correctiveAction"),
      "dueDate" = COALESCE(${input.dueDate ? new Date(input.dueDate) : null}, "dueDate"), "reinspectionResult" = COALESCE(${input.reinspectionResult || null}, "reinspectionResult"),
      "reinspectionDate" = COALESCE(${input.reinspectionDate ? new Date(input.reinspectionDate) : null}, "reinspectionDate"),
      disposition = COALESCE(${input.disposition || null}, disposition), "dispositionStatus" = CASE WHEN ${input.disposition || null} IS NULL THEN "dispositionStatus" ELSE 'PLANNED' END,
      status = CASE WHEN ${input.reinspectionResult || null} = 'PASSED' AND COALESCE(${input.correctiveAction?.trim() || null}, "correctiveAction") IS NOT NULL THEN 'READY_TO_CLOSE' ELSE status END, "updatedAt" = NOW() WHERE id = ${input.id}`;
    await writeProductionAudit(tx, input.userId, "qc.nonconformity", "UPDATE_ACTION", input.id, input);
    await writeProductionHistory(tx, "qc.nonconformity", input.id, "UPDATE_ACTION", input.userId, input.disposition || input.reinspectionResult || "Corrective action updated");
    return { id: input.id };
  });
}

export async function closeNonconformity(id: string, userId: string, correctiveAction: string, reinspectionResult: string) {
  if (!correctiveAction.trim()) throw new Error("Closed nonconformity requires corrective action");
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ status: string; reinspectionTestId: string | null; reinspectionResult: string | null; testedById: string | null; testStatus: string | null; testResult: string | null }>>`
      SELECT nc.status, nc."reinspectionTestId", nc."reinspectionResult", test."testedById", test.status AS "testStatus", test.result::text AS "testResult"
      FROM "QCNonconformity" nc
      LEFT JOIN "QCTest" test ON test.id = nc."reinspectionTestId"
      WHERE nc.id = ${id} LIMIT 1 FOR UPDATE OF nc
    `;
    if (!rows[0]) throw new Error("Nonconformity not found");
    if (rows[0].status === "CLOSED") throw new Error("Nonconformity is already closed");
    if (!rows[0].reinspectionTestId || rows[0].testStatus !== "APPROVED" || rows[0].testResult !== "PASSED" || rows[0].reinspectionResult !== "PASSED") {
      throw new Error("Nonconformity can close only after a linked, approved passed reinspection test");
    }
    if (rows[0].testedById === userId) throw new Error("Separation of duties: the reinspection tester cannot close the nonconformity");
    await tx`
      UPDATE "QCNonconformity"
      SET
        "correctiveAction" = ${correctiveAction},
        "reinspectionResult" = ${reinspectionResult},
        status = 'CLOSED',
        "closedById" = ${userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.nonconformity", "CLOSE", id, { id, correctiveAction, reinspectionResult });
    await writeProductionHistory(tx, "qc.nonconformity", id, "CLOSE", userId, "Nonconformity closed");
  });
  return { id };
}
