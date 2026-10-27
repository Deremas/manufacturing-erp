import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  getQcSettingOptions,
  nextProductionDocumentNumber,
  normalizeQcResult,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";
import { createQCHoldRelease } from "@/services/qc/hold-release.service";
import { nextMaintenanceDocumentNumber } from "@/services/maintenance/maintenance.service";
import { evaluateOverallQcResult, evaluateQcValue } from "@/services/qc/qc-evaluation.service";

export interface QcParameterInput {
  templateParameterId?: string | null;
  parameterName: string;
  expectedValue?: string;
  actualValue?: string;
  unit?: string;
  result?: string;
  remarks?: string;
}

export interface QcTestPayload {
  taskId?: string | null;
  testType: string;
  productionBatchId?: string | null;
  itemId?: string | null;
  locationId?: string | null;
  sampleDate: string;
  result?: string;
  status?: string;
  testedById: string;
  approvedById?: string | null;
  remarks?: string;
  parameters: QcParameterInput[];
}

async function writeParameters(tx: typeof sql, qcTestId: string, parameters: QcParameterInput[]) {
  for (const parameter of parameters) {
    await tx`
      INSERT INTO "QCTestParameter" (
        id, "qcTestId", "templateParameterId", "parameterName", "expectedValue", "actualValue", unit, result, remarks
      )
      VALUES (
        ${randomUUID()},
        ${qcTestId},
        ${parameter.templateParameterId ?? null},
        ${parameter.parameterName},
        ${parameter.expectedValue ?? null},
        ${parameter.actualValue ?? null},
        ${parameter.unit ?? null},
        ${normalizeQcResult(parameter.result)}::"QCResult",
        ${parameter.remarks ?? null}
      )
    `;
  }
}

export async function listQcTests(testType?: string) {
  try {
    return await sql<Array<{
      id: string;
      testNo: string;
      testType: string;
      sampleDate: string;
      itemCode: string | null;
      itemName: string | null;
      batchNo: string | null;
      locationName: string | null;
      result: string;
      status: string;
      testedByName: string | null;
    }>>`
      SELECT
        qt.id,
        qt."testNo",
        qt."testType",
        qt."sampleDate"::text AS "sampleDate",
        i."itemCode" AS "itemCode",
        i."itemName" AS "itemName",
        pb."batchNo" AS "batchNo",
        l."locationName" AS "locationName",
        qt.result::text AS result,
        qt.status,
        u.name AS "testedByName"
      FROM "QCTest" qt
      LEFT JOIN "Item" i ON i.id = qt."itemId"
      LEFT JOIN "ProductionBatch" pb ON pb.id = qt."productionBatchId"
      LEFT JOIN "Location" l ON l.id = qt."locationId"
      LEFT JOIN "User" u ON u.id = qt."testedById"
      ${testType ? sql`WHERE LOWER(REPLACE(qt."testType", '_', '-')) = LOWER(${testType})` : sql``}
      ORDER BY qt."sampleDate" DESC, qt."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getQcTestById(key: string) {
  const rows = await sql<Array<{
    id: string;
    publicId: number;
    testNo: string;
    testType: string;
    productionBatchId: string | null;
    batchNo: string | null;
    itemId: string | null;
    itemCode: string | null;
    itemName: string | null;
    locationId: string | null;
    locationName: string | null;
    sampleDate: string;
    result: string;
    status: string;
    testedById: string | null;
    testedByName: string | null;
    approvedById: string | null;
    approvedByName: string | null;
    remarks: string | null;
  }>>`
    SELECT
      qt.id,
      qt."publicId",
      qt."testNo",
      qt."testType",
      qt."productionBatchId",
      pb."batchNo" AS "batchNo",
      qt."itemId",
      i."itemCode" AS "itemCode",
      i."itemName" AS "itemName",
      qt."locationId",
      l."locationName" AS "locationName",
      qt."sampleDate"::text AS "sampleDate",
      qt.result::text AS result,
      qt.status,
      qt."testedById",
      tu.name AS "testedByName",
      qt."approvedById",
      au.name AS "approvedByName",
      qt.remarks
    FROM "QCTest" qt
    LEFT JOIN "ProductionBatch" pb ON pb.id = qt."productionBatchId"
    LEFT JOIN "Item" i ON i.id = qt."itemId"
    LEFT JOIN "Location" l ON l.id = qt."locationId"
    LEFT JOIN "User" tu ON tu.id = qt."testedById"
    LEFT JOIN "User" au ON au.id = qt."approvedById"
    WHERE ${isPublicIdParam(key) ? sql`qt."publicId" = ${Number(key)}` : sql`qt.id = ${key}`}
    LIMIT 1
  `;
  const header = rows[0];
  if (!header) return null;
  const id = header.id;
  const parameters = await sql<Array<{
    id: string;
    parameterName: string;
    expectedValue: string | null;
    actualValue: string | null;
    unit: string | null;
    result: string;
    remarks: string | null;
  }>>`
    SELECT
      id,
      "parameterName",
      "expectedValue",
      "actualValue",
      unit,
      result::text AS result,
      remarks
    FROM "QCTestParameter"
    WHERE "qcTestId" = ${id}
    ORDER BY "parameterName" ASC
  `;
  return { ...header, parameters };
}

export async function createHoldForQcTest(id: string, userId: string) {
  const rows = await sql<Array<{
    id: string;
    testNo: string;
    result: string;
    productionBatchId: string | null;
    itemId: string | null;
    locationId: string | null;
    remarks: string | null;
    batchNo: string | null;
    acceptedQty: number | null;
  }>>`
    SELECT
      qt.id,
      qt."testNo",
      qt.result::text AS result,
      qt."productionBatchId",
      qt."itemId",
      qt."locationId",
      qt.remarks,
      pb."batchNo" AS "batchNo",
      pb."acceptedQty"
    FROM "QCTest" qt
    LEFT JOIN "ProductionBatch" pb ON pb.id = qt."productionBatchId"
    WHERE qt.id = ${id}
    LIMIT 1
  `;

  const test = rows[0];
  if (!test) {
    throw new Error("QC test not found");
  }

  if (!["FAILED", "REJECTED"].includes(test.result)) {
    throw new Error("Only failed or rejected QC tests can create a hold");
  }

  if (!test.itemId || !test.locationId) {
    throw new Error("QC test must be linked to an item and location before creating a hold");
  }

  const existing = test.productionBatchId
    ? await sql<Array<{ id: string }>>`
        SELECT id
        FROM "QCHoldRelease"
        WHERE "productionBatchId" = ${test.productionBatchId}
          AND status = 'ON_HOLD'
        ORDER BY "createdAt" DESC
        LIMIT 1
      `
    : await sql<Array<{ id: string }>>`
        SELECT id
        FROM "QCHoldRelease"
        WHERE "productionBatchId" IS NULL
          AND "itemId" = ${test.itemId}
          AND "locationId" = ${test.locationId}
          AND status = 'ON_HOLD'
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

  if (existing[0]?.id) {
    return { id: existing[0].id, reused: true };
  }

  const quantity = Number(test.acceptedQty ?? 0) > 0 ? Number(test.acceptedQty) : 0;
  if (quantity <= 0) {
    throw new Error("No accepted quantity is available to hold for this QC test");
  }

  return createQCHoldRelease({
    productionBatchId: test.productionBatchId,
    itemId: test.itemId,
    locationId: test.locationId,
    quantity,
    holdReason: `QC ${test.result.toLowerCase()} for ${test.batchNo ?? test.testNo}`,
    remarks: test.remarks ?? undefined,
    createdById: userId,
  });
}

export async function createQcTest(payload: QcTestPayload) {
  const result = await sql.begin(async (tx) => {
    const taskRows = payload.taskId ? await tx<Array<{
      id: string;
      testTypeId: string;
      testTypeCode: string;
      templateId: string;
      productionBatchId: string | null;
      shiftSessionId: string | null;
      itemId: string | null;
      locationId: string | null;
      assetId: string | null;
      requiresApproval: boolean;
      requiresMachine: boolean;
      blocksReleaseOnFail: boolean;
      templateVersion: number;
      status: string;
    }>>`
      SELECT task.id, task."testTypeId", test_type.code AS "testTypeCode", task."templateId",
             task."productionBatchId", task."shiftSessionId", task."itemId", task."locationId",
             task."assetId", test_type."requiresApproval", test_type."requiresMachine",
             test_type."blocksReleaseOnFail", template.version AS "templateVersion", task.status
      FROM "QCTask" task
      INNER JOIN "QCTestType" test_type ON test_type.id = task."testTypeId"
      INNER JOIN "QCTestTemplate" template ON template.id = task."templateId"
      WHERE task.id = ${payload.taskId}
      LIMIT 1
      FOR UPDATE OF task
    ` : [];
    const task = taskRows[0];
    if (payload.taskId && !task) throw new Error("QC task not found");
    if (task && task.status === "COMPLETED") throw new Error("QC task is already completed");

    const definitions = task ? await tx<Array<{
      id: string;
      parameterName: string;
      dataType: string;
      minimumValue: number | null;
      maximumValue: number | null;
      expectedText: string | null;
      unitName: string | null;
      required: boolean;
    }>>`
      SELECT parameter.id, parameter."parameterName", parameter."dataType", parameter."minimumValue",
             parameter."maximumValue", parameter."expectedText", unit.name AS "unitName", parameter.required
      FROM "QCTestTemplateParameter" parameter
      LEFT JOIN "Unit" unit ON unit.id = parameter."unitId"
      WHERE parameter."templateId" = ${task.templateId} AND parameter."isActive" = true
      ORDER BY parameter."displayOrder", parameter."parameterName"
    ` : [];

    const evaluated = definitions.map((definition) => {
      const submitted = payload.parameters.find((parameter) => parameter.templateParameterId === definition.id);
      const evaluatedValue = evaluateQcValue(definition, submitted?.actualValue);
      return {
        definition,
        submitted,
        ...evaluatedValue,
      };
    });
    const overallResult = task
      ? evaluateOverallQcResult(evaluated.map((entry) => entry.result))
      : normalizeQcResult(payload.result);
    const testStatus = task ? (task.requiresApproval ? "PENDING_CHECK" : "APPROVED") : String(payload.status ?? "PENDING").toUpperCase();
    const id = randomUUID();
    const testNo = await nextProductionDocumentNumber(tx, "QCT", "QC Test");
    await tx`
      INSERT INTO "QCTest" (
        id, "testNo", "testType", "taskId", "testTypeId", "templateId", "productionBatchId",
        "shiftSessionId", "itemId", "locationId", "assetId", "sampleDate", result, status,
        "testedById", "approvedById", "approvedAt", "templateVersion", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${testNo},
        ${task?.testTypeCode ?? payload.testType},
        ${task?.id ?? null},
        ${task?.testTypeId ?? null},
        ${task?.templateId ?? null},
        ${task?.productionBatchId ?? payload.productionBatchId ?? null},
        ${task?.shiftSessionId ?? null},
        ${task?.itemId ?? payload.itemId ?? null},
        ${task?.locationId ?? payload.locationId ?? null},
        ${task?.assetId ?? null},
        ${new Date(payload.sampleDate)},
        ${overallResult}::"QCResult",
        ${testStatus},
        ${payload.testedById},
        ${task && !task.requiresApproval ? payload.testedById : payload.approvedById ?? null},
        ${task && !task.requiresApproval ? new Date() : null},
        ${task?.templateVersion ?? null},
        ${payload.remarks ?? null},
        NOW(),
        NOW()
      )
    `;
    const legacyParameters = task ? evaluated.map((entry) => ({
      templateParameterId: entry.definition.id,
      parameterName: entry.definition.parameterName,
      expectedValue: entry.definition.expectedText
        ?? [entry.definition.minimumValue, entry.definition.maximumValue].filter((value) => value !== null).join(" - "),
      actualValue: entry.rawValue,
      unit: entry.definition.unitName ?? "",
      result: entry.result,
      remarks: entry.submitted?.remarks,
    })) : payload.parameters;
    await writeParameters(tx, id, legacyParameters);
    for (const entry of evaluated) {
      await tx`
        INSERT INTO "QCTestResult" (
          id, "qcTestId", "templateParameterId", "numericValue", "textValue", result, remarks,
          "createdAt", "updatedAt"
        ) VALUES (
          ${randomUUID()}, ${id}, ${entry.definition.id}, ${entry.numericValue},
          ${entry.numericValue === null ? entry.rawValue || null : null}, ${entry.result}::"QCResult",
          ${entry.submitted?.remarks ?? null}, NOW(), NOW()
        )
      `;
    }
    if (task) {
      await tx`
        UPDATE "QCTask"
        SET status = ${task.requiresApproval ? "AWAITING_CHECK" : "COMPLETED"},
            "completedAt" = ${task.requiresApproval ? null : new Date()}, "updatedAt" = NOW()
        WHERE id = ${task.id}
      `;
    }
    if (task && overallResult === "FAILED") {
      const existingNc = await tx<Array<{ id: string }>>`SELECT id FROM "QCNonconformity" WHERE "qcTestId" = ${id} LIMIT 1`;
      if (!existingNc[0]) {
        const ncId = randomUUID();
        const ncNo = await nextProductionDocumentNumber(tx, "NC", "QC Nonconformity");
        await tx`INSERT INTO "QCNonconformity" (
          id, "ncNo", "productionBatchId", "qcTestId", "assetId", "itemId", "locationId",
          "issueDescription", severity, "reinspectionResult", status, "createdById", "createdAt", "updatedAt"
        ) VALUES (${ncId}, ${ncNo}, ${task.productionBatchId}, ${id}, ${task.assetId}, ${task.itemId}, ${task.locationId},
          ${`Automatic nonconformity from failed ${task.testTypeCode} test ${testNo}`},
          ${task.blocksReleaseOnFail ? "CRITICAL" : "MAJOR"}, 'PENDING', 'OPEN', ${payload.testedById}, NOW(), NOW())`;
        await writeProductionAudit(tx, payload.testedById, "qc.nonconformity", "AUTO_CREATE", ncId, { qcTestId: id, ncNo });
      }
      if (task.requiresMachine && task.assetId) {
        const existingTicket = await tx<Array<{ id: string }>>`SELECT id FROM "MaintenanceTicket" WHERE "qcTestId" = ${id} LIMIT 1`;
        if (!existingTicket[0]) {
          const ticketId = randomUUID();
          const ticketNo = await nextMaintenanceDocumentNumber(tx, "MT", "Maintenance Ticket");
          await tx`INSERT INTO "MaintenanceTicket" (
            id, "ticketNo", "requestDate", "assetId", "locationId", "requestedById", type, priority,
            "problemDescription", "failureDate", "qcTestId", "productionBatchId", "shiftSessionId",
            status, "approvalStatus", remarks, "isArchived", "createdAt", "updatedAt"
          ) VALUES (${ticketId}, ${ticketNo}, NOW(), ${task.assetId}, ${task.locationId}, ${payload.testedById},
            'BREAKDOWN', 'HIGH', ${`Machine-related QC failure: ${task.testTypeCode}`}, NOW(), ${id},
            ${task.productionBatchId}, ${task.shiftSessionId}, 'SUBMITTED', 'PENDING', ${`Generated from QC test ${testNo}`}, false, NOW(), NOW())`;
          await tx`UPDATE "Asset" SET status = 'UNDER_MAINTENANCE', "updatedAt" = NOW() WHERE id = ${task.assetId}`;
          await writeProductionAudit(tx, payload.testedById, "maintenance.ticket", "CREATE_FROM_QC", ticketId, { qcTestId: id, ticketNo });
        }
      }
    }
    await writeProductionAudit(tx, payload.testedById, "qc.test", "CREATE", id, payload);
    await writeProductionHistory(tx, "qc.test", id, "CREATE", payload.testedById, testNo);
    return { id, testNo, result: overallResult, status: testStatus };
  });
  return result;
}

export async function approveQcTest(id: string, userId: string) {
  const rows = await sql<Array<{ productionBatchId: string | null; taskId: string | null; result: string; testedById: string | null; checkedById: string | null; status: string }>>`
    SELECT "productionBatchId", "taskId", result::text AS result, "testedById", "checkedById", status
    FROM "QCTest"
    WHERE id = ${id}
    LIMIT 1
  `;
  const qcTest = rows[0];
  if (!qcTest) {
    throw new Error("QC test not found");
  }
  if (qcTest.testedById === userId) throw new Error("Separation of duties: the tester cannot approve their own result");
  if (!qcTest.checkedById && !["PENDING_APPROVAL", "CHECKED"].includes(qcTest.status)) throw new Error("QC test must be checked before approval");

  await sql.begin(async (tx) => {
    await tx`
      UPDATE "QCTest"
      SET status = 'APPROVED', "approvedById" = ${userId}, "approvedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    if (qcTest.taskId) {
      await tx`
        UPDATE "QCTask" SET status = 'COMPLETED', "completedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = ${qcTest.taskId}
      `;
      await tx`
        UPDATE "QCNonconformity"
        SET "reinspectionTestId" = ${id}, "reinspectionDate" = NOW(), "reinspectionResult" = ${qcTest.result},
          status = CASE WHEN ${qcTest.result} = 'PASSED' THEN 'READY_TO_CLOSE' ELSE 'OPEN' END,
          "updatedAt" = NOW()
        WHERE "reinspectionTaskId" = ${qcTest.taskId}
      `;
    }
    await writeProductionAudit(tx, userId, "qc.test", "APPROVE", id, { id });
    await writeProductionHistory(tx, "qc.test", id, "APPROVE", userId, "QC approved");
  });

  return { id };
}

export async function checkQcTest(id: string, userId: string) {
  const rows = await sql<Array<{ testedById: string | null; status: string; taskId: string | null }>>`
    SELECT "testedById", status, "taskId" FROM "QCTest" WHERE id = ${id} LIMIT 1
  `;
  const test = rows[0];
  if (!test) throw new Error("QC test not found");
  if (test.testedById === userId) throw new Error("Separation of duties: the tester cannot check their own result");
  if (!["PENDING_CHECK", "PENDING_APPROVAL"].includes(test.status)) throw new Error("Only submitted QC tests can be checked");
  await sql.begin(async (tx) => {
    await tx`UPDATE "QCTest" SET status = 'CHECKED', "checkedById" = ${userId}, "checkedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${id}`;
    if (test.taskId) await tx`UPDATE "QCTask" SET status = 'AWAITING_APPROVAL', "updatedAt" = NOW() WHERE id = ${test.taskId}`;
    await writeProductionAudit(tx, userId, "qc.test", "CHECK", id, { id });
    await writeProductionHistory(tx, "qc.test", id, "CHECK", userId, "QC result checked");
  });
  return { id };
}

export async function rejectQcTest(id: string, userId: string) {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "QCTest"
      SET status = 'REJECTED', "approvedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.test", "REJECT", id, { id });
    await writeProductionHistory(tx, "qc.test", id, "REJECT", userId, "QC rejected");
  });

  return { id };
}

export async function getQcOptions() {
  const [waterSamplePoints, microbialSampleTypes, microbialCriteria, microbialMethods, microbialMediaTypes, productionLines] = await Promise.all([
    getQcSettingOptions("waterTest.samplePoints"),
    getQcSettingOptions("microbial.sampleTypes"),
    getQcSettingOptions("microbial.criteria"),
    getQcSettingOptions("microbial.methods"),
    getQcSettingOptions("microbial.mediaTypes"),
    getQcSettingOptions("production.lines"),
  ]);

  return {
    waterSamplePoints,
    microbialSampleTypes,
    microbialCriteria,
    microbialMethods,
    microbialMediaTypes,
    productionLines,
  };
}
