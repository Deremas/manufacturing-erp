import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  getQcSettingOptions,
  nextProductionDocumentNumber,
  normalizeQcResult,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";

export interface QcParameterInput {
  parameterName: string;
  expectedValue?: string;
  actualValue?: string;
  unit?: string;
  result?: string;
  remarks?: string;
}

export interface QcTestPayload {
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
        id, "qcTestId", "parameterName", "expectedValue", "actualValue", unit, result, remarks
      )
      VALUES (
        ${randomUUID()},
        ${qcTestId},
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
      ${testType ? sql`WHERE qt."testType" = ${testType}` : sql``}
      ORDER BY qt."sampleDate" DESC, qt."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getQcTestById(id: string) {
  const rows = await sql<Array<{
    id: string;
    testNo: string;
    testType: string;
    productionBatchId: string | null;
    itemId: string | null;
    locationId: string | null;
    sampleDate: string;
    result: string;
    status: string;
    testedById: string | null;
    approvedById: string | null;
    remarks: string | null;
  }>>`
    SELECT
      id,
      "testNo",
      "testType",
      "productionBatchId",
      "itemId",
      "locationId",
      "sampleDate"::text AS "sampleDate",
      result::text AS result,
      status,
      "testedById",
      "approvedById",
      remarks
    FROM "QCTest"
    WHERE id = ${id}
    LIMIT 1
  `;
  const header = rows[0];
  if (!header) return null;
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

export async function createQcTest(payload: QcTestPayload) {
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const testNo = await nextProductionDocumentNumber(tx, "QCT", "QC Test");
    await tx`
      INSERT INTO "QCTest" (
        id, "testNo", "testType", "productionBatchId", "itemId", "locationId",
        "sampleDate", result, status, "testedById", "approvedById", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${testNo},
        ${payload.testType},
        ${payload.productionBatchId ?? null},
        ${payload.itemId ?? null},
        ${payload.locationId ?? null},
        ${new Date(payload.sampleDate)},
        ${normalizeQcResult(payload.result)}::"QCResult",
        ${String(payload.status ?? "PENDING").toUpperCase()},
        ${payload.testedById},
        ${payload.approvedById ?? null},
        ${payload.remarks ?? null},
        NOW(),
        NOW()
      )
    `;
    await writeParameters(tx, id, payload.parameters);
    await writeProductionAudit(tx, payload.testedById, "qc.test", "CREATE", id, payload);
    await writeProductionHistory(tx, "qc.test", id, "CREATE", payload.testedById, testNo);
    return { id, testNo };
  });
}

export async function approveQcTest(id: string, userId: string) {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "QCTest"
      SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.test", "APPROVE", id, { id });
    await writeProductionHistory(tx, "qc.test", id, "APPROVE", userId, "QC approved");
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
