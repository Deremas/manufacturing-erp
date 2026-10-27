import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { evaluateOperationalOverall, evaluateOperationalValue } from "@/services/qc/qc-evaluation.service";
import { getDefaultFormForSlug, getFormSections, getFormSpecifications } from "@/services/qc/qc-master.service";
import { assertReadingRowsValid, type OperationalReadingRow } from "@/services/qc/qc-record.helpers";
import { nextProductionDocumentNumber, writeProductionAudit } from "@/services/production/production-shared.service";

type Tx = typeof sql;

export interface QcRecordScope {
  accessibleLocationIds?: string[] | null;
  permissions?: string[];
}

export interface QcRecordInput {
  slug: string;
  controlledFormId?: string | null;
  recordDate: string;
  shiftCode?: string | null;
  itemId?: string | null;
  supplierId?: string | null;
  samplePointId?: string | null;
  batchNo?: string | null;
  locationId?: string | null;
  assetId?: string | null;
  quantity?: number | null;
  remarks?: string | null;
  extraFields?: Record<string, unknown>;
  backdateReason?: string | null;
  readings?: OperationalReadingRow[];
  results?: Array<{ parameterId: string; numericValue?: number | null; textValue?: string | null; remarks?: string | null }>;
}

function locationClause(scope?: QcRecordScope) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (scope?.accessibleLocationIds && locationIds.length === 0) {
    return sql`AND false`;
  }
  if (locationIds.length === 0) return sql``;
  return sql`AND (record."locationId" IS NULL OR record."locationId" IN ${sql(locationIds)})`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("A valid test date is required");
  return date;
}

function assertScopeLocation(locationId: string | null | undefined, scope?: QcRecordScope) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (!scope?.accessibleLocationIds) return;
  if (locationIds.length === 0 && locationId) throw new Error("You do not have access to this location");
  if (locationId && locationIds.length > 0 && !locationIds.includes(locationId)) {
    throw new Error("You do not have access to this location");
  }
}

async function loadFormContext(slug: string, controlledFormId?: string | null) {
  const catalog = getQcCatalogEntry(slug);
  if (!catalog) throw new Error("Unknown QC test type");
  const form = controlledFormId
    ? (await sql<Array<{
        id: string; code: string; title: string; version: number; testTypeId: string; frequencyName: string | null;
        requiresShift: boolean; requiresItem: boolean; requiresSupplier: boolean; requiresSamplePoint: boolean; requiresLocation: boolean;
        allowsMultipleReadings: boolean; allowsMultipleSamples: boolean; documentPrefix: string | null;
      }>>`
        SELECT form.id, form.code, form.title, form.version, form."testTypeId", frequency.name AS "frequencyName",
          type."requiresShift", type."requiresItem", type."requiresSupplier", type."requiresSamplePoint", type."requiresLocation",
          type."allowsMultipleReadings", type."allowsMultipleSamples", type."documentPrefix"
        FROM "QCControlledForm" form
        INNER JOIN "QCTestType" type ON type.id = form."testTypeId"
        LEFT JOIN "QCTestFrequency" frequency ON frequency.id = form."frequencyId"
        WHERE form.id = ${controlledFormId} AND type.slug = ${slug}
        LIMIT 1
      `)[0]
    : await getDefaultFormForSlug(slug);
  if (!form) throw new Error("No active controlled form is configured for this test");
  const [specs, sections] = await Promise.all([getFormSpecifications(form.id), getFormSections(form.id)]);
  return { catalog, form, specs, sections };
}

function evaluateLines(specs: Awaited<ReturnType<typeof getFormSpecifications>>, values: Array<{ parameterId: string; numericValue?: number | null; textValue?: string | null }>) {
  const results = specs.map((spec) => {
    const value = values.find((entry) => entry.parameterId === spec.parameterId);
    return evaluateOperationalValue({
      parameterName: spec.parameterName,
      dataType: spec.dataType,
      minValue: spec.minValue,
      maxValue: spec.maxValue,
      qualitativeCriterion: spec.qualitativeCriterion,
      required: spec.required,
      numericValue: value?.numericValue ?? (value?.textValue && spec.dataType === "NUMBER" ? Number(value.textValue) : null),
      textValue: value?.textValue ?? null,
    });
  });
  return {
    lineResults: specs.map((spec, index) => ({ spec, result: results[index] })),
    overall: evaluateOperationalOverall(results, specs.map((spec) => spec.required)),
  };
}

async function writeLines(
  tx: Tx,
  recordId: string,
  specs: Awaited<ReturnType<typeof getFormSpecifications>>,
  input: QcRecordInput,
  allowsMultipleReadings: boolean,
) {
  await tx`DELETE FROM "QCTestRecordLine" WHERE "recordId" = ${recordId}`;
  if (allowsMultipleReadings) {
    const rows = filterOrValidateReadings(input.readings ?? [], false);
    for (const [rowIndex, row] of rows.entries()) {
      for (const spec of specs) {
        const raw = String(row.values?.[spec.parameterCode] ?? "").trim();
        const numericValue = spec.dataType === "NUMBER" && raw ? Number(raw) : null;
        const evaluated = evaluateOperationalValue({
          parameterName: spec.parameterName,
          dataType: spec.dataType,
          minValue: spec.minValue,
          maxValue: spec.maxValue,
          qualitativeCriterion: spec.qualitativeCriterion,
          required: spec.required,
          numericValue: numericValue != null && Number.isFinite(numericValue) ? numericValue : null,
          textValue: raw,
        });
        await tx`
          INSERT INTO "QCTestRecordLine" (
            id, "recordId", "sectionCode", "rowIndex", "lineType", "timeValue", "parameterId", "parameterNameSnapshot",
            "unitSnapshot", "methodSnapshot", "limitSnapshot", "numericValue", "textValue", result, remarks, extra, "createdAt", "updatedAt"
          )
          VALUES (
            ${randomUUID()}, ${recordId}, 'READINGS', ${rowIndex}, 'READING', ${row.timeValue ?? null}, ${spec.parameterId}, ${spec.parameterName},
            ${spec.unitName}, ${spec.methodReference}, ${spec.acceptableLimit}, ${numericValue != null && Number.isFinite(numericValue) ? numericValue : null},
            ${raw || null}, ${evaluated}, ${row.remark ?? null}, ${JSON.stringify(row.values ?? {})}, NOW(), NOW()
          )
        `;
      }
    }
    const allResults = rows.flatMap((row) => specs.map((spec) => evaluateOperationalValue({
      parameterName: spec.parameterName,
      dataType: spec.dataType,
      minValue: spec.minValue,
      maxValue: spec.maxValue,
      qualitativeCriterion: spec.qualitativeCriterion,
      required: spec.required,
      numericValue: spec.dataType === "NUMBER" ? Number(row.values?.[spec.parameterCode]) : null,
      textValue: String(row.values?.[spec.parameterCode] ?? ""),
    })));
    const requiredFlags = rows.flatMap(() => specs.map((spec) => spec.required));
    return evaluateOperationalOverall(allResults, requiredFlags);
  }

  const evaluated = evaluateLines(specs, input.results ?? []);
  for (const [index, line] of evaluated.lineResults.entries()) {
    const value = (input.results ?? []).find((entry) => entry.parameterId === line.spec.parameterId);
    const raw = value?.textValue ?? (value?.numericValue != null ? String(value.numericValue) : "");
    await tx`
      INSERT INTO "QCTestRecordLine" (
        id, "recordId", "sectionCode", "rowIndex", "lineType", "parameterId", "parameterNameSnapshot",
        "unitSnapshot", "methodSnapshot", "limitSnapshot", "numericValue", "textValue", result, remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()}, ${recordId}, 'RESULTS', ${index}, 'PARAMETER', ${line.spec.parameterId}, ${line.spec.parameterName},
        ${line.spec.unitName}, ${line.spec.methodReference}, ${line.spec.acceptableLimit}, ${value?.numericValue ?? null},
        ${raw || null}, ${line.result}, ${value?.remarks ?? null}, NOW(), NOW()
      )
    `;
  }
  return evaluated.overall;
}

function filterOrValidateReadings(rows: OperationalReadingRow[], requireComplete: boolean) {
  return assertReadingRowsValid(rows, requireComplete);
}

async function addHistory(tx: Tx, recordId: string, action: string, userId: string, remarks?: string | null) {
  await tx`
    INSERT INTO "QCTestRecordHistory" (id, "recordId", action, "performedById", remarks, "createdAt")
    VALUES (${randomUUID()}, ${recordId}, ${action}, ${userId}, ${remarks ?? null}, NOW())
  `;
}

export async function listQcTestRecords(slug: string, filters: {
  dateFrom?: string | null;
  dateTo?: string | null;
  shiftCode?: string | null;
  itemId?: string | null;
  samplePointId?: string | null;
  supplierId?: string | null;
  result?: string | null;
  status?: string | null;
  testedById?: string | null;
} = {}, scope?: QcRecordScope) {
  const catalog = getQcCatalogEntry(slug);
  if (!catalog) return [];
  return sql<Array<{
    id: string; publicId: number; recordNo: string; recordDate: string; shiftCode: string | null; formCode: string; formTitle: string;
    itemId: string | null; itemName: string | null; samplePointName: string | null; supplierId: string | null; supplierName: string | null; batchNo: string | null;
    locationName: string | null; result: string; status: string; testedByName: string | null; checkedByName: string | null; approvedByName: string | null;
    readingCount: number; quantity: number | null; extraFields: unknown;
  }>>`
    SELECT
      record.id, record."publicId", record."recordNo", record."recordDate"::text AS "recordDate", record."shiftCode",
      record."formCodeSnapshot" AS "formCode", record."formTitleSnapshot" AS "formTitle",
      record."itemId", item."itemName", point.name AS "samplePointName", record."supplierId", supplier.name AS "supplierName", record."batchNo",
      location."locationName", record.result, record.status,
      tester.name AS "testedByName", checker.name AS "checkedByName", approver.name AS "approvedByName",
      (SELECT COUNT(DISTINCT line."rowIndex") FROM "QCTestRecordLine" line WHERE line."recordId" = record.id)::int AS "readingCount",
      record.quantity, record."extraFields"
    FROM "QCTestRecord" record
    INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
    LEFT JOIN "Item" item ON item.id = record."itemId"
    LEFT JOIN "QCSamplePoint" point ON point.id = record."samplePointId"
    LEFT JOIN "Supplier" supplier ON supplier.id = record."supplierId"
    LEFT JOIN "Location" location ON location.id = record."locationId"
    LEFT JOIN "User" tester ON tester.id = record."testedById"
    LEFT JOIN "User" checker ON checker.id = record."checkedById"
    LEFT JOIN "User" approver ON approver.id = record."approvedById"
    WHERE type.slug = ${slug}
      ${locationClause(scope)}
      ${filters.dateFrom ? sql`AND record."recordDate" >= ${filters.dateFrom}::date` : sql``}
      ${filters.dateTo ? sql`AND record."recordDate" < (${filters.dateTo}::date + INTERVAL '1 day')` : sql``}
      ${filters.shiftCode ? sql`AND record."shiftCode" = ${filters.shiftCode}` : sql``}
      ${filters.itemId ? sql`AND record."itemId" = ${filters.itemId}` : sql``}
      ${filters.samplePointId ? sql`AND record."samplePointId" = ${filters.samplePointId}` : sql``}
      ${filters.supplierId ? sql`AND record."supplierId" = ${filters.supplierId}` : sql``}
      ${filters.result ? sql`AND record.result = ${filters.result}` : sql``}
      ${filters.status ? sql`AND record.status = ${filters.status}` : sql``}
      ${filters.testedById ? sql`AND record."testedById" = ${filters.testedById}` : sql``}
    ORDER BY record."recordDate" DESC, record."createdAt" DESC
  `;
}

export async function getQcTestRecord(key: string, scope?: QcRecordScope): Promise<Record<string, unknown> | null> {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      record.*, type.slug, type.name AS "testTypeName", type."allowsMultipleReadings",
      item."itemName", item."itemCode", point.name AS "samplePointName", supplier.name AS "supplierName",
      location."locationName", tester.name AS "testedByName",
      submitter.name AS "submittedByName", checker.name AS "checkedByName", approver.name AS "approvedByName"
    FROM "QCTestRecord" record
    INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
    LEFT JOIN "Item" item ON item.id = record."itemId"
    LEFT JOIN "QCSamplePoint" point ON point.id = record."samplePointId"
    LEFT JOIN "Supplier" supplier ON supplier.id = record."supplierId"
    LEFT JOIN "Location" location ON location.id = record."locationId"
    LEFT JOIN "User" tester ON tester.id = record."testedById"
    LEFT JOIN "User" submitter ON submitter.id = record."submittedById"
    LEFT JOIN "User" checker ON checker.id = record."checkedById"
    LEFT JOIN "User" approver ON approver.id = record."approvedById"
    WHERE ${isPublicIdParam(key) ? sql`record."publicId" = ${Number(key)}` : sql`record.id = ${key}`}
      ${locationClause(scope)}
    LIMIT 1
  `;
  const record = rows[0];
  if (!record) return null;
  const id = String(record.id);
  const [lines, history] = await Promise.all([
    sql<Array<Record<string, unknown>>>`
      SELECT * FROM "QCTestRecordLine" WHERE "recordId" = ${id} ORDER BY "sectionCode", "rowIndex", "parameterNameSnapshot"
    `,
    sql<Array<{ id: string; action: string; performedById: string; performedByName: string | null; remarks: string | null; createdAt: string }>>`
      SELECT history.id, history.action, history."performedById", users.name AS "performedByName", history.remarks, history."createdAt"::text AS "createdAt"
      FROM "QCTestRecordHistory" history
      LEFT JOIN "User" users ON users.id = history."performedById"
      WHERE history."recordId" = ${id}
      ORDER BY history."createdAt"
    `,
  ]);
  return { ...(record as Record<string, unknown>), lines, history };
}

async function persistRecord(input: QcRecordInput, userId: string, scope: QcRecordScope | undefined, existingId?: string) {
  const context = await loadFormContext(input.slug, input.controlledFormId);
  const recordDate = parseDate(input.recordDate);
  if (recordDate.getTime() > Date.now()) throw new Error("Future test dates are not allowed");
  const backdated = recordDate < startOfToday();
  if (backdated) {
    if (!scope?.permissions?.includes("qc.record.backdate") && !scope?.permissions?.includes("*")) {
      throw new Error("Backdating QC records requires qc.record.backdate");
    }
    if (!String(input.backdateReason ?? "").trim()) throw new Error("A backdate reason is required");
  }
  const isRawWater = input.slug === "raw-water";
  const isPhysico = input.slug === "physicochemical";
  const isMicrobial = input.slug === "microbial";
  const isPreform = input.slug === "preform";
  const isHandle = input.slug === "handle";
  const isCap = input.slug === "cap";
  if (!isRawWater) {
    if (context.form.requiresShift && !String(input.shiftCode ?? "").trim()) throw new Error("Shift is required");
    if (context.form.requiresItem && !isPhysico && !isHandle && !input.itemId) throw new Error("Product / material is required");
    if (context.form.requiresSupplier && !input.supplierId && !((isPreform || isHandle || isCap) && String(input.extraFields?.supplierName ?? "").trim())) throw new Error("Supplier is required");
    if (context.form.requiresSamplePoint && !isPhysico && !input.samplePointId) throw new Error("Sample point is required");
    if (context.form.requiresLocation && !isMicrobial && !isPreform && !isHandle && !isCap && !input.locationId) throw new Error("Location is required");
  }
  assertScopeLocation(input.locationId, scope);

  const allowsReadings = context.form.allowsMultipleReadings || isRawWater;
  if (allowsReadings) {
    filterOrValidateReadings(input.readings ?? [], false);
  }

  return sql.begin(async (tx) => {
    const prefix = context.form.documentPrefix || context.catalog.prefix;
    const extraFields = input.extraFields ?? {};
    const snapshot = context.specs.map((spec) => ({
      parameterId: spec.parameterId,
      parameterCode: spec.parameterCode,
      parameterName: spec.parameterName,
      dataType: spec.dataType,
      unitName: spec.unitName,
      methodReference: spec.methodReference,
      acceptableLimit: spec.acceptableLimit,
      minValue: spec.minValue,
      maxValue: spec.maxValue,
      qualitativeCriterion: spec.qualitativeCriterion,
      required: spec.required,
    }));
    const operationalStatus = input.slug === "microbial" ? String(extraFields.operationalStatus ?? "SAMPLE_COLLECTED") : null;
    let recordId = existingId;
    if (!recordId) {
      const recordNo = await nextProductionDocumentNumber(tx, prefix, context.catalog.name);
      recordId = randomUUID();
      await tx`
        INSERT INTO "QCTestRecord" (
          id, "recordNo", "testTypeId", "controlledFormId", "recordDate", "shiftCode", "itemId", "supplierId", "samplePointId",
          "batchNo", "locationId", "assetId", quantity, "formVersion", "formCodeSnapshot", "formTitleSnapshot", "frequencySnapshot",
          "specificationSnapshot", "extraFields", result, status, "operationalStatus", "testedById", backdated, "backdateReason", remarks, "createdAt", "updatedAt"
        )
        VALUES (
          ${recordId}, ${recordNo}, ${context.form.testTypeId}, ${context.form.id}, ${recordDate}, ${input.shiftCode ?? null}, ${input.itemId ?? null},
          ${input.supplierId ?? null}, ${input.samplePointId ?? null}, ${input.batchNo ?? null}, ${input.locationId ?? null}, ${input.assetId ?? null},
          ${input.quantity ?? null}, ${context.form.version}, ${context.form.code}, ${context.form.title}, ${context.form.frequencyName},
          ${JSON.stringify(snapshot)}, ${JSON.stringify(extraFields)}, 'PENDING', 'DRAFT', ${operationalStatus}, ${userId}, ${backdated}, ${input.backdateReason ?? null}, ${input.remarks ?? null}, NOW(), NOW()
        )
      `;
      await addHistory(tx, recordId, "CREATE", userId);
      await writeProductionAudit(tx, userId, "qc", "CREATE", recordId, { slug: input.slug, recordNo });
    } else {
      const existing = await tx<Array<{ status: string }>>`SELECT status FROM "QCTestRecord" WHERE id = ${recordId} ${locationClause(scope)} LIMIT 1`;
      if (!existing[0]) throw new Error("QC record was not found");
      if (!["DRAFT", "REJECTED"].includes(existing[0].status)) throw new Error("Only draft or rejected records can be updated");
      await tx`
        UPDATE "QCTestRecord"
        SET "recordDate" = ${recordDate}, "shiftCode" = ${input.shiftCode ?? null}, "itemId" = ${input.itemId ?? null},
            "supplierId" = ${input.supplierId ?? null}, "samplePointId" = ${input.samplePointId ?? null}, "batchNo" = ${input.batchNo ?? null},
            "locationId" = ${input.locationId ?? null}, "assetId" = ${input.assetId ?? null}, quantity = ${input.quantity ?? null},
            "extraFields" = ${JSON.stringify(extraFields)}, backdated = ${backdated}, "backdateReason" = ${input.backdateReason ?? null},
            remarks = ${input.remarks ?? null}, "specificationSnapshot" = ${JSON.stringify(snapshot)}, "updatedAt" = NOW()
        WHERE id = ${recordId}
      `;
      await addHistory(tx, recordId, "UPDATE", userId);
    }

    const overall = await writeLines(tx, recordId, context.specs, input, allowsReadings);
    await tx`UPDATE "QCTestRecord" SET result = ${overall}, "updatedAt" = NOW() WHERE id = ${recordId}`;
    return getQcTestRecord(recordId);
  });
}

export async function createQcTestRecord(input: QcRecordInput, userId: string, scope?: QcRecordScope) {
  return persistRecord(input, userId, scope);
}

export async function updateQcTestRecord(id: string, input: QcRecordInput, userId: string, scope?: QcRecordScope) {
  return persistRecord(input, userId, scope, id);
}

async function transition(id: string, userId: string, action: "SUBMIT" | "CHECK" | "APPROVE" | "REJECT" | "CANCEL", scope?: QcRecordScope, remarks?: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string; result: string; slug: string }>>`
      SELECT record.id, record.status, record.result, type.slug
      FROM "QCTestRecord" record
      INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
      WHERE record.id = ${id} ${locationClause(scope)} LIMIT 1 FOR UPDATE
    `;
    const record = rows[0];
    if (!record) throw new Error("QC record was not found");
    const processSheet = record.slug === "treatment-monitoring" || record.slug === "raw-water" || record.slug === "chlorine-residual" || record.slug === "physicochemical" || record.slug === "microbial" || record.slug === "preform" || record.slug === "handle" || record.slug === "cap" || record.slug === "packaging";
    const next: Record<string, { from: string[]; status: string; field: string }> = {
      SUBMIT: { from: ["DRAFT", "REJECTED"], status: "SUBMITTED", field: "submitted" },
      CHECK: { from: ["SUBMITTED"], status: "CHECKED", field: "checked" },
      APPROVE: { from: processSheet ? ["SUBMITTED", "CHECKED"] : ["CHECKED"], status: "APPROVED", field: "approved" },
      REJECT: { from: ["SUBMITTED", "CHECKED"], status: "REJECTED", field: "rejected" },
      CANCEL: { from: ["DRAFT", "SUBMITTED"], status: "CANCELLED", field: "cancelled" },
    };
    const config = next[action];
    if (!config.from.includes(record.status)) throw new Error(`Cannot ${action.toLowerCase()} a ${record.status} record`);
    if (action === "SUBMIT" && ["INCOMPLETE", "PENDING"].includes(record.result) && !processSheet) {
      throw new Error("Complete required results before submitting");
    }
    if (action === "SUBMIT") {
      await tx`UPDATE "QCTestRecord" SET status = ${config.status}, "submittedById" = ${userId}, "submittedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${id}`;
    } else if (action === "CHECK") {
      await tx`UPDATE "QCTestRecord" SET status = ${config.status}, "checkedById" = ${userId}, "checkedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${id}`;
    } else if (action === "APPROVE") {
      await tx`UPDATE "QCTestRecord" SET status = ${config.status}, "approvedById" = ${userId}, "approvedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${id}`;
    } else if (action === "REJECT") {
      await tx`UPDATE "QCTestRecord" SET status = ${config.status}, "rejectedById" = ${userId}, "rejectedAt" = NOW(), remarks = COALESCE(${remarks ?? null}, remarks), "updatedAt" = NOW() WHERE id = ${id}`;
    } else {
      await tx`UPDATE "QCTestRecord" SET status = ${config.status}, "updatedAt" = NOW() WHERE id = ${id}`;
    }
    await addHistory(tx, id, action, userId, remarks);
    await writeProductionAudit(tx, userId, "qc", action, id, { status: config.status });
    return getQcTestRecord(id, scope);
  });
}

export const submitQcTestRecord = (id: string, userId: string, scope?: QcRecordScope) => transition(id, userId, "SUBMIT", scope);
export const checkQcTestRecord = (id: string, userId: string, scope?: QcRecordScope) => transition(id, userId, "CHECK", scope);
export const approveQcTestRecord = (id: string, userId: string, scope?: QcRecordScope) => transition(id, userId, "APPROVE", scope);
export const rejectQcTestRecord = (id: string, userId: string, remarks: string, scope?: QcRecordScope) => transition(id, userId, "REJECT", scope, remarks);
export const cancelQcTestRecord = (id: string, userId: string, scope?: QcRecordScope) => transition(id, userId, "CANCEL", scope);

export async function listDailyQcRecords(filters: {
  date?: string | null;
  shiftCode?: string | null;
  locationId?: string | null;
  itemId?: string | null;
  slug?: string | null;
  status?: string | null;
  result?: string | null;
} = {}, scope?: QcRecordScope) {
  const date = filters.date || new Date().toISOString().slice(0, 10);
  return sql<Array<{
    id: string; recordNo: string; recordDate: string; shiftCode: string | null; slug: string; testTypeName: string;
    formCode: string; itemName: string | null; samplePointName: string | null; batchNo: string | null;
    result: string; status: string; testedByName: string | null; extraFields: unknown;
  }>>`
    SELECT
      record.id, record."recordNo", record."recordDate"::text AS "recordDate", record."shiftCode", type.slug, type.name AS "testTypeName",
      record."formCodeSnapshot" AS "formCode", item."itemName", point.name AS "samplePointName", record."batchNo",
      record.result, record.status, tester.name AS "testedByName", record."extraFields"
    FROM "QCTestRecord" record
    INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
    LEFT JOIN "Item" item ON item.id = record."itemId"
    LEFT JOIN "QCSamplePoint" point ON point.id = record."samplePointId"
    LEFT JOIN "User" tester ON tester.id = record."testedById"
    WHERE record."recordDate" >= ${date}::date
      AND record."recordDate" < (${date}::date + INTERVAL '1 day')
      ${locationClause(scope)}
      ${filters.shiftCode ? sql`AND record."shiftCode" = ${filters.shiftCode}` : sql``}
      ${filters.locationId ? sql`AND record."locationId" = ${filters.locationId}` : sql``}
      ${filters.itemId ? sql`AND record."itemId" = ${filters.itemId}` : sql``}
      ${filters.slug ? sql`AND type.slug = ${filters.slug}` : sql``}
      ${filters.status ? sql`AND record.status = ${filters.status}` : sql``}
      ${filters.result ? sql`AND record.result = ${filters.result}` : sql``}
    ORDER BY record."shiftCode", type."displayOrder", record."createdAt"
  `;
}

export async function listItemQcHistory(itemId: string, scope?: QcRecordScope) {
  return sql<Array<{
    id: string; recordDate: string; shiftCode: string | null; slug: string; testTypeName: string; batchNo: string | null;
    samplePointName: string | null; result: string; status: string; testedByName: string | null; recordNo: string;
  }>>`
    SELECT record.id, record."recordDate"::text AS "recordDate", record."shiftCode", type.slug, type.name AS "testTypeName",
      record."batchNo", point.name AS "samplePointName", record.result, record.status, tester.name AS "testedByName", record."recordNo"
    FROM "QCTestRecord" record
    INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
    LEFT JOIN "QCSamplePoint" point ON point.id = record."samplePointId"
    LEFT JOIN "User" tester ON tester.id = record."testedById"
    WHERE record."itemId" = ${itemId}
      ${locationClause(scope)}
    ORDER BY record."recordDate" DESC
  `;
}

export async function listControlledFormsForSlug(slug: string) {
  return sql<Array<{ id: string; code: string; title: string; version: number; isDefault: boolean }>>`
    SELECT form.id, form.code, form.title, form.version, form."isDefault"
    FROM "QCControlledForm" form
    INNER JOIN "QCTestType" type ON type.id = form."testTypeId"
    WHERE type.slug = ${slug} AND form."isActive" = true AND form."isArchived" = false
    ORDER BY form."isDefault" DESC, form.version DESC
  `;
}

export { loadFormContext };
