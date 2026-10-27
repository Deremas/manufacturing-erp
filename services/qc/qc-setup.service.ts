import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { writeProductionAudit, writeProductionHistory } from "@/services/production/production-shared.service";

export async function listProductionStages() {
  return sql<Array<{ id: string; code: string; name: string; sequence: number }>>`
    SELECT id, code, name, sequence
    FROM "ProductionStage"
    WHERE "isActive" = true AND "isArchived" = false
    ORDER BY sequence, name
  `;
}

export async function listQcTestTypes() {
  return sql<Array<{
    id: string;
    code: string;
    name: string;
    productionStageId: string | null;
    requiresBatch: boolean;
    requiresMachine: boolean;
    requiresApproval: boolean;
    blocksReleaseOnFail: boolean;
  }>>`
    SELECT id, code, name, "productionStageId", "requiresBatch", "requiresMachine",
           "requiresApproval", "blocksReleaseOnFail"
    FROM "QCTestType"
    WHERE "isActive" = true AND "isArchived" = false
    ORDER BY name
  `;
}

export async function getStageQcConfiguration(stageId: string, itemId?: string | null) {
  return sql<Array<{
    mappingId: string;
    testTypeId: string;
    testTypeCode: string;
    testTypeName: string;
    templateId: string | null;
    templateCode: string | null;
    templateName: string | null;
    required: boolean;
    sequence: number;
    blocksNextStageOnFail: boolean;
  }>>`
    SELECT
      mapping.id AS "mappingId",
      test_type.id AS "testTypeId",
      test_type.code AS "testTypeCode",
      test_type.name AS "testTypeName",
      template.id AS "templateId",
      template.code AS "templateCode",
      template.name AS "templateName",
      mapping.required,
      mapping.sequence,
      mapping."blocksNextStageOnFail"
    FROM "ProductionStageQCTest" mapping
    INNER JOIN "QCTestType" test_type ON test_type.id = mapping."testTypeId"
    LEFT JOIN LATERAL (
      SELECT candidate.id, candidate.code, candidate.name
      FROM "QCTestTemplate" candidate
      WHERE candidate."testTypeId" = mapping."testTypeId"
        AND (mapping."templateId" IS NULL OR candidate.id = mapping."templateId")
        AND candidate."isActive" = true
        AND candidate."isArchived" = false
        AND (candidate."productionStageId" IS NULL OR candidate."productionStageId" = mapping."productionStageId")
        AND (candidate."itemId" IS NULL OR candidate."itemId" = ${itemId ?? null})
      ORDER BY (candidate."itemId" IS NOT NULL) DESC, candidate.version DESC
      LIMIT 1
    ) template ON true
    WHERE mapping."productionStageId" = ${stageId}
      AND mapping."isActive" = true
      AND test_type."isActive" = true
      AND test_type."isArchived" = false
    ORDER BY mapping.sequence, test_type.name
  `;
}

export async function getTemplateParameters(templateId: string) {
  return sql<Array<{
    id: string;
    parameterName: string;
    dataType: string;
    minimumValue: number | null;
    maximumValue: number | null;
    expectedText: string | null;
    unitId: string | null;
    unitCode: string | null;
    unitName: string | null;
    required: boolean;
    displayOrder: number;
  }>>`
    SELECT parameter.id, parameter."parameterName", parameter."dataType",
           parameter."minimumValue", parameter."maximumValue", parameter."expectedText",
           parameter."unitId", unit.code AS "unitCode", unit.name AS "unitName",
           parameter.required, parameter."displayOrder"
    FROM "QCTestTemplateParameter" parameter
    LEFT JOIN "Unit" unit ON unit.id = parameter."unitId"
    WHERE parameter."templateId" = ${templateId} AND parameter."isActive" = true
    ORDER BY parameter."displayOrder", parameter."parameterName"
  `;
}

export async function getQcSetupData() {
  const [stages, testTypes, templates, units, stageRecords, testTypeRecords, mappings, locations, templateRecords] = await Promise.all([
    listProductionStages(),
    listQcTestTypes(),
    sql<Array<{ id: string; code: string; name: string; testTypeId: string; productionStageId: string | null; parameterCount: number; version: number; status: string; isActive: boolean; isArchived: boolean }>>`
      SELECT template.id, template.code, template.name, template."testTypeId", template."productionStageId",
             template.version, template.status, template."isActive", template."isArchived",
             COUNT(parameter.id)::int AS "parameterCount"
      FROM "QCTestTemplate" template
      LEFT JOIN "QCTestTemplateParameter" parameter ON parameter."templateId" = template.id AND parameter."isActive" = true
      WHERE template."isActive" = true AND template."isArchived" = false
      GROUP BY template.id
      ORDER BY template.name
    `,
    sql<Array<{ id: string; code: string | null; name: string }>>`
      SELECT id, code, name FROM "Unit" WHERE "isActive" = true AND "isArchived" = false ORDER BY name
    `,
    sql<Array<{ id: string; code: string; name: string; sequence: number; isActive: boolean; isArchived: boolean }>>`
      SELECT id, code, name, sequence, "isActive", "isArchived" FROM "ProductionStage" ORDER BY sequence, name
    `,
    sql<Array<{ id: string; code: string; name: string; isActive: boolean; isArchived: boolean }>>`
      SELECT id, code, name, "isActive", "isArchived" FROM "QCTestType" ORDER BY name
    `,
    sql<Array<{ id: string; productionStageId: string; testTypeId: string; templateId: string | null; required: boolean; sequence: number; isActive: boolean }>>`
      SELECT id, "productionStageId", "testTypeId", "templateId", required, sequence, "isActive"
      FROM "ProductionStageQCTest" ORDER BY sequence
    `,
    sql<Array<{ id: string; code: string; name: string; isQcHoldLocation: boolean; isFinishedGoodsLocation: boolean }>>`
      SELECT id, "locationCode" AS code, "locationName" AS name, "isQcHoldLocation", "isFinishedGoodsLocation"
      FROM "Location" WHERE "isStockLocation" = true AND "isActive" = true AND "isArchived" = false ORDER BY "locationName"
    `,
    sql<Array<{ id: string; code: string; name: string; version: number; status: string; isActive: boolean; isArchived: boolean; usageCount: number }>>`
      SELECT template.id, template.code, template.name, template.version, template.status, template."isActive", template."isArchived",
        (COUNT(DISTINCT task.id) + COUNT(DISTINCT test.id))::int AS "usageCount"
      FROM "QCTestTemplate" template LEFT JOIN "QCTask" task ON task."templateId" = template.id LEFT JOIN "QCTest" test ON test."templateId" = template.id
      GROUP BY template.id ORDER BY template.name, template.version DESC
    `,
  ]);
  return { stages, testTypes, templates, units, stageRecords, testTypeRecords, mappings, locations, templateRecords };
}

export async function configureQcLocations(input: { holdLocationId: string; finishedGoodsLocationId: string; userId: string }) {
  if (!input.holdLocationId || !input.finishedGoodsLocationId) throw new Error("QC hold and finished-goods locations are required");
  if (input.holdLocationId === input.finishedGoodsLocationId) throw new Error("QC hold and finished-goods locations must be different");
  return sql.begin(async (tx) => {
    await tx`UPDATE "Location" SET "isQcHoldLocation" = false WHERE "isQcHoldLocation" = true`;
    await tx`UPDATE "Location" SET "isFinishedGoodsLocation" = false WHERE "isFinishedGoodsLocation" = true`;
    await tx`UPDATE "Location" SET "isQcHoldLocation" = true, "isSalesLocation" = false, "updatedAt" = NOW() WHERE id = ${input.holdLocationId}`;
    await tx`UPDATE "Location" SET "isFinishedGoodsLocation" = true, "updatedAt" = NOW() WHERE id = ${input.finishedGoodsLocationId}`;
    await writeProductionAudit(tx, input.userId, "qc.setup.locations", "CONFIGURE", input.holdLocationId, input);
    return { holdLocationId: input.holdLocationId, finishedGoodsLocationId: input.finishedGoodsLocationId };
  });
}

export async function createProductionStage(input: { code: string; name: string; sequence: number; description?: string; userId: string }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("Stage code and name are required");
  return sql.begin(async (tx) => {
    const id = randomUUID();
    await tx`INSERT INTO "ProductionStage" (id, code, name, sequence, description, "createdAt", "updatedAt")
      VALUES (${id}, ${input.code.trim().toUpperCase()}, ${input.name.trim()}, ${Number(input.sequence || 0)}, ${input.description?.trim() || null}, NOW(), NOW())`;
    await writeProductionAudit(tx, input.userId, "qc.setup.stage", "CREATE", id, input);
    await writeProductionHistory(tx, "qc.setup.stage", id, "CREATE", input.userId, input.code);
    return { id };
  });
}

export async function createQcTestType(input: {
  code: string; name: string; productionStageId?: string | null; requiresBatch: boolean;
  requiresMachine: boolean; requiresApproval: boolean; blocksReleaseOnFail: boolean; userId: string;
}) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("Test type code and name are required");
  return sql.begin(async (tx) => {
    const id = randomUUID();
    await tx`INSERT INTO "QCTestType" (
      id, code, name, "productionStageId", "requiresBatch", "requiresMachine", "requiresApproval",
      "blocksReleaseOnFail", "createdAt", "updatedAt"
    ) VALUES (${id}, ${input.code.trim().toUpperCase()}, ${input.name.trim()}, ${input.productionStageId || null},
      ${input.requiresBatch}, ${input.requiresMachine}, ${input.requiresApproval}, ${input.blocksReleaseOnFail}, NOW(), NOW())`;
    await writeProductionAudit(tx, input.userId, "qc.setup.test-type", "CREATE", id, input);
    return { id };
  });
}

export async function createQcTemplate(input: {
  code: string; name: string; testTypeId: string; productionStageId?: string | null; userId: string;
  parameters: Array<{ parameterName: string; dataType: string; minimumValue?: number | null; maximumValue?: number | null; expectedText?: string; unitId?: string | null; required: boolean }>;
}) {
  if (!input.code.trim() || !input.name.trim() || !input.testTypeId) throw new Error("Template code, name, and test type are required");
  if (!input.parameters.length) throw new Error("At least one test parameter is required");
  return sql.begin(async (tx) => {
    const id = randomUUID();
    await tx`INSERT INTO "QCTestTemplate" (id, code, name, "testTypeId", "productionStageId", version, status, "createdAt", "updatedAt")
      VALUES (${id}, ${input.code.trim().toUpperCase()}, ${input.name.trim()}, ${input.testTypeId}, ${input.productionStageId || null}, 1, 'ACTIVE', NOW(), NOW())`;
    for (const [index, parameter] of input.parameters.entries()) {
      if (!parameter.parameterName.trim()) throw new Error("Every template parameter needs a name");
      if (parameter.minimumValue != null && parameter.maximumValue != null && parameter.minimumValue > parameter.maximumValue) {
        throw new Error(`${parameter.parameterName}: minimum cannot exceed maximum`);
      }
      await tx`INSERT INTO "QCTestTemplateParameter" (
        id, "templateId", "parameterName", "dataType", "minimumValue", "maximumValue", "expectedText",
        "unitId", required, "displayOrder", "createdAt", "updatedAt"
      ) VALUES (${randomUUID()}, ${id}, ${parameter.parameterName.trim()}, ${parameter.dataType.toUpperCase()},
        ${parameter.minimumValue ?? null}, ${parameter.maximumValue ?? null}, ${parameter.expectedText?.trim() || null},
        ${parameter.unitId || null}, ${parameter.required}, ${index + 1}, NOW(), NOW())`;
    }
    await writeProductionAudit(tx, input.userId, "qc.setup.template", "CREATE", id, input);
    return { id };
  });
}

type SetupEntity = "stage" | "test-type" | "template" | "mapping";

export async function setQcSetupRecordState(input: {
  entity: SetupEntity;
  id: string;
  action: "activate" | "deactivate" | "archive";
  userId: string;
}) {
  const table = input.entity === "stage" ? "ProductionStage"
    : input.entity === "test-type" ? "QCTestType"
      : input.entity === "template" ? "QCTestTemplate"
        : "ProductionStageQCTest";
  const isActive = input.action === "activate";
  const isArchived = input.action === "archive";
  return sql.begin(async (tx) => {
    if (input.entity === "template" && isArchived) {
      const usage = await tx<Array<{ count: number }>>`
        SELECT (COUNT(DISTINCT task.id) + COUNT(DISTINCT test.id))::int AS count
        FROM "QCTestTemplate" template
        LEFT JOIN "QCTask" task ON task."templateId" = template.id
        LEFT JOIN "QCTest" test ON test."templateId" = template.id
        WHERE template.id = ${input.id}
      `;
      if (Number(usage[0]?.count ?? 0) > 0) {
        throw new Error("Used templates cannot be archived; deactivate them and create a new version");
      }
    }
    await tx.unsafe(`UPDATE "${table}" SET "isActive" = $1, "isArchived" = $2, "updatedAt" = NOW() WHERE id = $3`, [isActive, isArchived, input.id]);
    await writeProductionAudit(tx, input.userId, `qc.setup.${input.entity}`, input.action.toUpperCase(), input.id, input);
    return { id: input.id, action: input.action };
  });
}

export async function updateQcSetupRecord(input: {
  entity: Exclude<SetupEntity, "mapping">;
  id: string;
  code: string;
  name: string;
  sequence?: number;
  description?: string;
  userId: string;
}) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("Code and name are required");
  return sql.begin(async (tx) => {
    if (input.entity === "template") {
      const usage = await tx<Array<{ count: number }>>`
        SELECT (COUNT(DISTINCT task.id) + COUNT(DISTINCT test.id))::int AS count
        FROM "QCTestTemplate" template
        LEFT JOIN "QCTask" task ON task."templateId" = template.id
        LEFT JOIN "QCTest" test ON test."templateId" = template.id
        WHERE template.id = ${input.id}
      `;
      if (Number(usage[0]?.count ?? 0) > 0) throw new Error("This template is already in use. Create a new version instead.");
      await tx`UPDATE "QCTestTemplate" SET code = ${input.code.trim().toUpperCase()}, name = ${input.name.trim()}, "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else if (input.entity === "stage") {
      await tx`UPDATE "ProductionStage" SET code = ${input.code.trim().toUpperCase()}, name = ${input.name.trim()}, sequence = ${Number(input.sequence ?? 0)}, description = ${input.description?.trim() || null}, "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else {
      await tx`UPDATE "QCTestType" SET code = ${input.code.trim().toUpperCase()}, name = ${input.name.trim()}, "updatedAt" = NOW() WHERE id = ${input.id}`;
    }
    await writeProductionAudit(tx, input.userId, `qc.setup.${input.entity}`, "UPDATE", input.id, input);
    return { id: input.id };
  });
}

export async function duplicateQcTemplateVersion(templateId: string, userId: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; code: string; name: string; testTypeId: string; itemTypeId: string | null; itemId: string | null; productionStageId: string | null; version: number }>>`
      SELECT id, code, name, "testTypeId", "itemTypeId", "itemId", "productionStageId", version
      FROM "QCTestTemplate" WHERE id = ${templateId} LIMIT 1 FOR UPDATE
    `;
    const source = rows[0];
    if (!source) throw new Error("QC template not found");
    const version = Number(source.version) + 1;
    const id = randomUUID();
    const baseCode = source.code.replace(/-V\d+$/i, "");
    const code = `${baseCode}-V${version}`;
    await tx`INSERT INTO "QCTestTemplate" (
      id, code, name, "testTypeId", "itemTypeId", "itemId", "productionStageId", version,
      status, "parentTemplateId", "isActive", "isArchived", "createdAt", "updatedAt"
    ) VALUES (${id}, ${code}, ${source.name}, ${source.testTypeId}, ${source.itemTypeId}, ${source.itemId},
      ${source.productionStageId}, ${version}, 'DRAFT', ${source.id}, false, false, NOW(), NOW())`;
    await tx`INSERT INTO "QCTestTemplateParameter" (
      id, "templateId", "parameterName", "dataType", "minimumValue", "maximumValue", "expectedText",
      "unitId", required, "displayOrder", "isActive", "createdAt", "updatedAt"
    ) SELECT gen_random_uuid()::text, ${id}, "parameterName", "dataType", "minimumValue", "maximumValue",
      "expectedText", "unitId", required, "displayOrder", "isActive", NOW(), NOW()
      FROM "QCTestTemplateParameter" WHERE "templateId" = ${source.id}`;
    await writeProductionAudit(tx, userId, "qc.setup.template", "CREATE_VERSION", id, { sourceId: source.id, version });
    return { id, code, version };
  });
}

export async function approveQcTemplate(templateId: string, userId: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ testTypeId: string; productionStageId: string | null }>>`
      SELECT "testTypeId", "productionStageId" FROM "QCTestTemplate" WHERE id = ${templateId} LIMIT 1 FOR UPDATE
    `;
    if (!rows[0]) throw new Error("QC template not found");
    await tx`UPDATE "QCTestTemplate" SET "isActive" = false, status = 'SUPERSEDED', "updatedAt" = NOW()
      WHERE "testTypeId" = ${rows[0].testTypeId} AND "productionStageId" IS NOT DISTINCT FROM ${rows[0].productionStageId}
        AND id <> ${templateId} AND "isActive" = true`;
    await tx`UPDATE "QCTestTemplate" SET status = 'ACTIVE', "isActive" = true, "approvedById" = ${userId}, "approvedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${templateId}`;
    await writeProductionAudit(tx, userId, "qc.setup.template", "APPROVE_VERSION", templateId, { templateId });
    return { id: templateId };
  });
}

export async function mapQcTestToStage(input: {
  productionStageId: string; testTypeId: string; templateId: string; required: boolean;
  sequence: number; blocksNextStageOnFail: boolean; userId: string;
}) {
  if (!input.productionStageId || !input.testTypeId || !input.templateId) throw new Error("Stage, test type, and template are required");
  return sql.begin(async (tx) => {
    const template = await tx<Array<{ id: string }>>`SELECT id FROM "QCTestTemplate" WHERE id = ${input.templateId} AND "testTypeId" = ${input.testTypeId} LIMIT 1`;
    if (!template[0]) throw new Error("Selected template does not belong to the selected test type");
    const id = randomUUID();
    await tx`INSERT INTO "ProductionStageQCTest" (
      id, "productionStageId", "testTypeId", "templateId", required, sequence,
      "blocksNextStageOnFail", "createdAt", "updatedAt"
    ) VALUES (${id}, ${input.productionStageId}, ${input.testTypeId}, ${input.templateId}, ${input.required},
      ${Number(input.sequence || 0)}, ${input.blocksNextStageOnFail}, NOW(), NOW())
      ON CONFLICT ("productionStageId", "testTypeId") DO UPDATE SET
        "templateId" = EXCLUDED."templateId", required = EXCLUDED.required, sequence = EXCLUDED.sequence,
        "blocksNextStageOnFail" = EXCLUDED."blocksNextStageOnFail", "isActive" = true, "updatedAt" = NOW()`;
    await writeProductionAudit(tx, input.userId, "qc.setup.stage-test", "UPSERT", id, input);
    return { id };
  });
}
