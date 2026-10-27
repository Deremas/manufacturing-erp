import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createProductionBatch } from "@/services/production/production-batch.service";
import { startBatchStage } from "@/services/production/production-stage.service";
import {
  closeNonconformity,
  createNonconformity,
  createNonconformityReinspectionTask,
} from "@/services/qc/nonconformity.service";
import { startShiftSession } from "@/services/shift/shift-session.service";

import { closeTestDatabase } from "../inventory/_helpers";
import { createProductionTestContext } from "./_helpers";

after(closeTestDatabase);

async function createQcStageFixture(userId: string) {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const stageId = randomUUID();
  const testTypeId = randomUUID();
  const templateId = randomUUID();
  await sql.begin(async (tx) => {
    await tx`INSERT INTO "ProductionStage" (id, code, name, sequence, "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${stageId}, ${`REG-${suffix}`}, 'Regression stage', -1000000, true, false, NOW(), NOW())`;
    await tx`INSERT INTO "QCTestType" (id, code, name, "productionStageId", "requiresBatch", "requiresApproval", "blocksReleaseOnFail", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${testTypeId}, ${`REG-${suffix}`}, 'Regression test', ${stageId}, true, true, true, true, false, NOW(), NOW())`;
    await tx`INSERT INTO "QCTestTemplate" (id, code, name, "testTypeId", "productionStageId", version, status, "approvedById", "approvedAt", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${templateId}, ${`REG-TPL-${suffix}`}, 'Regression template', ${testTypeId}, ${stageId}, 1, 'APPROVED', ${userId}, NOW(), true, false, NOW(), NOW())`;
    await tx`INSERT INTO "ProductionStageQCTest" (id, "productionStageId", "testTypeId", "templateId", required, sequence, "blocksNextStageOnFail", "isActive", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${stageId}, ${testTypeId}, ${templateId}, true, 1, true, true, NOW(), NOW())`;
  });
  return { stageId, testTypeId, templateId };
}

test("starting a configured production stage generates its QC task once", async () => {
  const context = await createProductionTestContext();
  const fixture = await createQcStageFixture(context.adminUserId);
  const session = await startShiftSession({
    productionDate: new Date(Date.now() + Math.floor(Math.random() * 1000000000)).toISOString(),
    shiftCode: `REG-${randomUUID().slice(0, 6)}`,
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId, role: "Operator" }],
  });
  const batch = await createProductionBatch({
    shiftSessionId: session.id,
    finishedGoodId: context.fgItemId,
    locationId: context.outputLocationId,
    producedQty: 5,
    acceptedQty: 5,
    rejectedQty: 0,
    wastageQty: 0,
    createdById: context.adminUserId,
  });

  const execution = await startBatchStage({
    batchId: batch.id,
    stageId: fixture.stageId,
    operatorId: context.adminUserId,
  });
  assert.equal(execution.tasks.length, 1);
  const tasks = await sql<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "QCTask"
    WHERE "productionBatchId" = ${batch.id} AND "productionStageId" = ${fixture.stageId}`;
  assert.equal(tasks[0]?.count, 1);
});

test("nonconformity closure requires a linked approved passing reinspection by another user", async () => {
  const context = await createProductionTestContext();
  const fixture = await createQcStageFixture(context.adminUserId);
  const sourceTestId = randomUUID();
  await sql`INSERT INTO "QCTest" (id, "testNo", "testType", "testTypeId", "templateId", "itemId", "locationId", "sampleDate", result, status, "testedById", "createdAt", "updatedAt")
    VALUES (${sourceTestId}, ${`SRC-${randomUUID().slice(0, 8)}`}, 'regression', ${fixture.testTypeId}, ${fixture.templateId}, ${context.fgItemId}, ${context.outputLocationId}, NOW(), 'FAILED', 'APPROVED', ${context.adminUserId}, NOW(), NOW())`;
  const nc = await createNonconformity({
    qcTestId: sourceTestId,
    issueDescription: "Regression failure requiring independent reinspection",
    severity: "MAJOR",
    createdById: context.adminUserId,
  });
  const task = await createNonconformityReinspectionTask({ id: nc.id, userId: context.adminUserId, assignedToId: context.secondUserId });

  await assert.rejects(
    () => closeNonconformity(nc.id, context.adminUserId, "Corrected process", "PASSED"),
    /linked, approved passed reinspection/i,
  );

  const reinspectionTestId = randomUUID();
  await sql.begin(async (tx) => {
    await tx`INSERT INTO "QCTest" (id, "testNo", "testType", "taskId", "testTypeId", "templateId", "itemId", "locationId", "sampleDate", result, status, "testedById", "approvedById", "approvedAt", "createdAt", "updatedAt")
      VALUES (${reinspectionTestId}, ${`RE-${randomUUID().slice(0, 8)}`}, 'reinspection', ${task.id}, ${fixture.testTypeId}, ${fixture.templateId}, ${context.fgItemId}, ${context.outputLocationId}, NOW(), 'PASSED', 'APPROVED', ${context.secondUserId}, ${context.adminUserId}, NOW(), NOW(), NOW())`;
    await tx`UPDATE "QCNonconformity" SET "reinspectionTestId" = ${reinspectionTestId}, "reinspectionResult" = 'PASSED', "reinspectionDate" = NOW(), status = 'READY_TO_CLOSE', "updatedAt" = NOW() WHERE id = ${nc.id}`;
  });
  await closeNonconformity(nc.id, context.adminUserId, "Corrected process", "PASSED");
  const rows = await sql<Array<{ status: string }>>`SELECT status FROM "QCNonconformity" WHERE id = ${nc.id}`;
  assert.equal(rows[0]?.status, "CLOSED");
});
