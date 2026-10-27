import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  isUnconfirmedMethod,
  preformGramDefault,
  QC_FORM_PARAMETERS,
  QC_FORM_SPEC_DEFAULTS,
  QC_FREQUENCY_SEED,
  QC_LAB_UNITS,
  QC_PARAMETER_SEED,
  QC_SAMPLE_POINT_SEED,
  QC_TEST_CATALOG,
} from "@/services/qc/qc-catalog";
import { formatSpecificationLimit } from "@/services/qc/qc-evaluation.service";

function blankToNull(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

export async function seedOperationalQcMaster() {
  await sql.begin(async (tx) => {
    for (const frequency of QC_FREQUENCY_SEED) {
      const id = `qcfreq-${frequency.code.toLowerCase()}`;
      await tx`
        INSERT INTO "QCTestFrequency" (id, code, name, "intervalMinutes", "intervalHours", "intervalDays", "isActive", "isArchived", "createdAt", "updatedAt")
        VALUES (${id}, ${frequency.code}, ${frequency.name}, ${"intervalMinutes" in frequency ? frequency.intervalMinutes ?? null : null}, ${"intervalHours" in frequency ? frequency.intervalHours ?? null : null}, ${"intervalDays" in frequency ? frequency.intervalDays ?? null : null}, true, false, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "intervalMinutes" = EXCLUDED."intervalMinutes", "intervalHours" = EXCLUDED."intervalHours", "intervalDays" = EXCLUDED."intervalDays", "isActive" = true, "isArchived" = false, "updatedAt" = NOW()
      `;
    }

    for (const [index, point] of QC_SAMPLE_POINT_SEED.entries()) {
      const id = `qcsp-${point.code.toLowerCase()}`;
      await tx`
        INSERT INTO "QCSamplePoint" (id, code, name, "groupName", "displayOrder", "isActive", "isArchived", "createdAt", "updatedAt")
        VALUES (${id}, ${point.code}, ${point.name}, ${point.groupName}, ${index + 1}, true, false, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "groupName" = EXCLUDED."groupName", "displayOrder" = EXCLUDED."displayOrder", "isActive" = true, "isArchived" = false, "updatedAt" = NOW()
      `;
    }

    for (const unit of QC_LAB_UNITS) {
      const id = `qcunit-${unit.code.toLowerCase()}`;
      await tx`
        INSERT INTO "Unit" (id, code, name, abbreviation, type, "isActive", "isArchived", "createdAt", "updatedAt")
        VALUES (${id}, ${unit.code}, ${unit.name}, ${unit.abbreviation}, ${unit.type}, true, false, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, abbreviation = EXCLUDED.abbreviation, type = EXCLUDED.type, "isActive" = true, "isArchived" = false, "updatedAt" = NOW()
      `;
    }

    const unitByCode = new Map<string, string>();
    for (const unit of QC_LAB_UNITS) {
      const rows = await tx<Array<{ id: string }>>`SELECT id FROM "Unit" WHERE code = ${unit.code} LIMIT 1`;
      if (rows[0]) unitByCode.set(unit.code, rows[0].id);
    }

    for (const [index, parameter] of QC_PARAMETER_SEED.entries()) {
      const id = `qcparam-${parameter.code.toLowerCase()}`;
      const unitId = parameter.unitCode ? unitByCode.get(parameter.unitCode) ?? null : null;
      await tx`
        INSERT INTO "QCParameter" (id, code, name, category, "dataType", "unitId", "methodReference", technique, incubation, media, "qualitativeOptions", "displayOrder", "isActive", "isArchived", "createdAt", "updatedAt")
        VALUES (${id}, ${parameter.code}, ${parameter.name}, ${parameter.category}, ${parameter.dataType}, ${unitId}, ${parameter.method ?? null}, ${parameter.technique ?? null}, ${parameter.incubation ?? null}, ${parameter.media ?? null}, ${parameter.options ?? parameter.qualitative ?? null}, ${index + 1}, true, false, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          "dataType" = EXCLUDED."dataType",
          "unitId" = COALESCE("QCParameter"."unitId", EXCLUDED."unitId"),
          "methodReference" = CASE
            WHEN EXCLUDED.category IN ('MICRO', 'PHYSICO') THEN EXCLUDED."methodReference"
            WHEN "QCParameter"."methodReference" IS NULL OR btrim("QCParameter"."methodReference") = '' OR "QCParameter"."methodReference" ILIKE 'e.g.%'
            THEN EXCLUDED."methodReference"
            ELSE "QCParameter"."methodReference"
          END,
          technique = EXCLUDED.technique,
          incubation = EXCLUDED.incubation,
          media = EXCLUDED.media,
          "qualitativeOptions" = CASE
            WHEN EXCLUDED.category IN ('MICRO', 'PHYSICO') THEN EXCLUDED."qualitativeOptions"
            ELSE COALESCE(NULLIF(btrim("QCParameter"."qualitativeOptions"), ''), EXCLUDED."qualitativeOptions")
          END,
          "displayOrder" = EXCLUDED."displayOrder",
          "isActive" = true,
          "isArchived" = false,
          "updatedAt" = NOW()
      `;
    }

    const hourlyId = "qcfreq-hourly";
    const every30Id = "qcfreq-every_30_min";
    const every2HoursId = "qcfreq-every_2_hours";
    const perDeliveryId = "qcfreq-per_delivery";
    const perBatchId = "qcfreq-per_batch";

    for (const [index, entry] of QC_TEST_CATALOG.entries()) {
      const typeId = `qctype-${entry.slug}`;
      await tx`
        INSERT INTO "QCTestType" (
          id, code, name, "appliesTo", slug, category, "requiresDate", "requiresShift", "requiresItem", "requiresSupplier",
          "requiresSamplePoint", "requiresLocation", "requiresBatch", "requiresMachine", "allowsMultipleReadings", "allowsMultipleSamples",
          "requiresApproval", "blocksReleaseOnFail", "documentPrefix", "displayOrder", "isActive", "isArchived", "createdAt", "updatedAt"
        )
        VALUES (
          ${typeId}, ${entry.slug.toUpperCase().replace(/-/g, "_")}, ${entry.name}, 'OPERATIONAL', ${entry.slug}, ${entry.category},
          true, ${Boolean(entry.requiresShift)}, ${Boolean(entry.requiresItem)}, ${Boolean(entry.requiresSupplier)},
          ${Boolean(entry.requiresSamplePoint)}, ${Boolean(entry.requiresLocation)}, false, false, ${Boolean(entry.allowsMultipleReadings)}, ${Boolean(entry.allowsMultipleSamples)},
          true, false, ${entry.prefix}, ${index + 1}, true, false, NOW(), NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name, slug = EXCLUDED.slug, category = EXCLUDED.category, "requiresShift" = EXCLUDED."requiresShift",
          "requiresItem" = EXCLUDED."requiresItem", "requiresSupplier" = EXCLUDED."requiresSupplier", "requiresSamplePoint" = EXCLUDED."requiresSamplePoint",
          "requiresLocation" = EXCLUDED."requiresLocation", "allowsMultipleReadings" = EXCLUDED."allowsMultipleReadings",
          "allowsMultipleSamples" = EXCLUDED."allowsMultipleSamples", "documentPrefix" = EXCLUDED."documentPrefix",
          "displayOrder" = EXCLUDED."displayOrder", "isActive" = true, "isArchived" = false, "updatedAt" = NOW()
      `;

      const frequencyId = entry.slug === "chlorine-residual"
        ? every30Id
        : entry.slug === "treatment-monitoring"
          ? every2HoursId
          : entry.requiresSupplier
            ? perDeliveryId
            : entry.slug === "packaging"
              ? perBatchId
              : hourlyId;
      const formId = `qcform-${entry.slug}`;
      await tx`
        INSERT INTO "QCControlledForm" (id, code, title, "testTypeId", version, "frequencyId", "effectiveFrom", description, "isDefault", "isActive", "isArchived", "createdAt", "updatedAt")
        VALUES (${formId}, ${entry.formCode}, ${entry.formTitle}, ${typeId}, 1, ${frequencyId}, NOW(), ${entry.name}, true, true, false, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, "testTypeId" = EXCLUDED."testTypeId", "frequencyId" = EXCLUDED."frequencyId", "isDefault" = true, "isActive" = true, "isArchived" = false, "updatedAt" = NOW()
      `;

      await tx`
        INSERT INTO "QCFormSection" (id, "formId", code, title, "sectionType", "displayOrder", repeatable, "minRows", "createdAt", "updatedAt")
        VALUES (${`${formId}-spec`}, ${formId}, 'SPECIFICATION', 'Controlled Specification', 'PARAMETER_TABLE', 1, false, 1, NOW(), NOW())
        ON CONFLICT ("formId", code) DO NOTHING
      `;
      if (entry.allowsMultipleReadings) {
        await tx`
          INSERT INTO "QCFormSection" (id, "formId", code, title, "sectionType", "displayOrder", repeatable, "minRows", "createdAt", "updatedAt")
          VALUES (${`${formId}-readings`}, ${formId}, 'READINGS', 'Readings', 'READING_GRID', 2, true, ${entry.minRows ?? 1}, NOW(), NOW())
          ON CONFLICT ("formId", code) DO NOTHING
        `;
      } else {
        await tx`
          INSERT INTO "QCFormSection" (id, "formId", code, title, "sectionType", "displayOrder", repeatable, "minRows", "createdAt", "updatedAt")
          VALUES (${`${formId}-results`}, ${formId}, 'RESULTS', 'Results', 'SAMPLE_GRID', 2, false, 1, NOW(), NOW())
          ON CONFLICT ("formId", code) DO NOTHING
        `;
      }

      const parameterCodes = QC_FORM_PARAMETERS[entry.slug] ?? [];
      const formDefaults = QC_FORM_SPEC_DEFAULTS[entry.slug] ?? {};
      for (const [parameterIndex, code] of parameterCodes.entries()) {
        const parameter = QC_PARAMETER_SEED.find((row) => row.code === code);
        const fill = formDefaults[code] ?? {};
        const paramRows = await tx<Array<{ id: string }>>`SELECT id FROM "QCParameter" WHERE code = ${code} LIMIT 1`;
        const parameterId = paramRows[0]?.id ?? `qcparam-${code.toLowerCase()}`;
        const method = fill.method ?? parameter?.method ?? null;
        const limitText = fill.limitText ?? parameter?.qualitative ?? null;
        const unitId = unitByCode.get(fill.unitCode ?? parameter?.unitCode ?? "") ?? null;
        const minValue = fill.min ?? null;
        const maxValue = fill.max ?? null;
        const existing = await tx<Array<{
          id: string; methodReference: string | null; minValue: number | null; maxValue: number | null;
          limitText: string | null; qualitativeCriterion: string | null; unitId: string | null;
        }>>`
          SELECT id, "methodReference", "minValue", "maxValue", "limitText", "qualitativeCriterion", "unitId"
          FROM "QCParameterSpecification"
          WHERE "controlledFormId" = ${formId} AND "parameterId" = ${parameterId}
          LIMIT 1
        `;
        if (existing[0]) {
          const row = existing[0];
          const overwrite = (entry.slug === "microbial" || entry.slug === "physicochemical") && code !== "CONDUCTIVITY";
          const qualitative = parameter?.dataType === "NUMBER" || entry.slug === "physicochemical"
            ? null
            : (limitText ?? parameter?.qualitative ?? null);
          const nextMethod = overwrite || isUnconfirmedMethod(row.methodReference) ? method : row.methodReference;
          const rangeEmpty = row.minValue == null && row.maxValue == null && !blankToNull(row.limitText);
          const nextMin = overwrite || rangeEmpty ? minValue : row.minValue;
          const nextMax = overwrite || rangeEmpty ? maxValue : row.maxValue;
          const nextLimit = overwrite || rangeEmpty ? limitText : (blankToNull(row.limitText) ?? limitText);
          const nextQualitative = overwrite ? qualitative : (blankToNull(row.qualitativeCriterion) ?? qualitative);
          await tx`
            UPDATE "QCParameterSpecification"
            SET "methodReference" = ${nextMethod},
                "minValue" = ${nextMin},
                "maxValue" = ${nextMax},
                "limitText" = ${nextLimit},
                "qualitativeCriterion" = ${nextQualitative},
                "unitId" = ${overwrite ? (unitId ?? row.unitId) : (row.unitId ?? unitId)},
                "displayOrder" = ${parameterIndex + 1},
                "updatedAt" = NOW()
            WHERE id = ${row.id}
          `;
          continue;
        }
        await tx`
          INSERT INTO "QCParameterSpecification" (
            id, "controlledFormId", "parameterId", "unitId", "methodReference", "minValue", "maxValue",
            "qualitativeCriterion", "limitText", required, "displayOrder", "isActive", "createdAt", "updatedAt"
          )
          VALUES (
            ${randomUUID()}, ${formId}, ${parameterId}, ${unitId}, ${method}, ${minValue}, ${maxValue},
            ${parameter?.dataType === "NUMBER" || entry.slug === "physicochemical" ? null : (limitText ?? parameter?.qualitative ?? null)}, ${limitText}, true, ${parameterIndex + 1}, true, NOW(), NOW()
          )
        `;
      }
    }

    const packType = await tx<Array<{ id: string }>>`SELECT id FROM "ItemType" WHERE code = 'PACK' LIMIT 1`;
    const packCategory = await tx<Array<{ id: string }>>`SELECT id FROM "Category" WHERE code = 'PACK' LIMIT 1`;
    const pcsUnit = await tx<Array<{ id: string }>>`SELECT id FROM "Unit" WHERE code = 'PCS' LIMIT 1`;
    if (packType[0] && packCategory[0] && pcsUnit[0]) {
      const extraPreforms = [
        { code: "PACK-013", name: "PET Preform 0.25L", sku: "PRE-025L-001" },
        { code: "PACK-014", name: "PET Preform 0.6L", sku: "PRE-06L-001" },
        { code: "PACK-015", name: "PET Preform 1L", sku: "PRE-1L-001" },
        { code: "PACK-016", name: "PET Preform 2L", sku: "PRE-2L-001" },
        { code: "PACK-017", name: "PET Preform 5L", sku: "PRE-5L-001" },
        { code: "PACK-018", name: "PET Preform 10L", sku: "PRE-10L-001" },
        { code: "PACK-019", name: "PET Preform 15L", sku: "PRE-15L-001" },
      ];
      for (const item of extraPreforms) {
        await tx`
          INSERT INTO "Item" (
            id, "itemCode", "itemName", sku, "categoryId", "itemTypeId", "uomId",
            "reorderPoint", "standardCost", "sellingPrice", "vatApplicable", "exciseApplicable",
            "isActive", "isArchived", "createdAt", "updatedAt"
          )
          VALUES (
            ${`item-${item.code.toLowerCase()}`}, ${item.code}, ${item.name}, ${item.sku},
            ${packCategory[0].id}, ${packType[0].id}, ${pcsUnit[0].id},
            0, 0, 0, true, false, true, false, NOW(), NOW()
          )
          ON CONFLICT ("itemCode") DO UPDATE SET
            "itemName" = EXCLUDED."itemName", sku = EXCLUDED.sku, "isActive" = true, "isArchived" = false, "updatedAt" = NOW()
        `;
      }
    }

    const packItems = await tx<Array<{ id: string; itemCode: string; itemName: string }>>`
      SELECT id, "itemCode", "itemName"
      FROM "Item"
      WHERE "isArchived" = false AND "isActive" = true
    `;
    for (const item of packItems) {
      const preset = preformGramDefault(item.itemName, item.itemCode);
      if (!preset) continue;
      const existing = await tx<Array<{ id: string; gramMin: number | null; gramMax: number | null; label: string | null }>>`
        SELECT id, "gramMin", "gramMax", label
        FROM "QCItemSpecification"
        WHERE "itemId" = ${item.id} AND kind = 'PREFORM'
        LIMIT 1
      `;
      const gramMin = existing[0]?.gramMin ?? preset.min;
      const gramMax = existing[0]?.gramMax ?? preset.max;
      const label = blankToNull(existing[0]?.label) ?? preset.label;
      if (existing[0]) {
        if (existing[0].gramMin != null && existing[0].gramMax != null) continue;
        await tx`
          UPDATE "QCItemSpecification"
          SET label = ${label}, "gramMin" = ${gramMin}, "gramMax" = ${gramMax}, "isActive" = true, "updatedAt" = NOW()
          WHERE id = ${existing[0].id}
        `;
        continue;
      }
      await tx`
        INSERT INTO "QCItemSpecification" (id, "itemId", kind, label, "gramMin", "gramMax", "isActive", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${item.id}, 'PREFORM', ${label}, ${gramMin}, ${gramMax}, true, NOW(), NOW())
      `;
    }
  });
}

export async function alignMicrobialMaster() {
  await sql`
    UPDATE "Unit"
    SET abbreviation = 'CFU/1ml', name = 'Colony-forming units per millilitre', "updatedAt" = NOW()
    WHERE code = 'CFU'
  `;
  const cfu = await sql<Array<{ id: string }>>`SELECT id FROM "Unit" WHERE code = 'CFU' LIMIT 1`;
  const cfuId = cfu[0]?.id ?? null;
  for (const parameter of QC_PARAMETER_SEED.filter((row) => row.category === "MICRO")) {
    await sql`
      UPDATE "QCParameter"
      SET name = ${parameter.name},
          "dataType" = ${parameter.dataType},
          "methodReference" = ${parameter.method ?? null},
          technique = ${parameter.technique ?? null},
          incubation = ${parameter.incubation ?? null},
          media = ${parameter.media ?? null},
          "qualitativeOptions" = ${parameter.options ?? parameter.qualitative ?? null},
          "unitId" = COALESCE("unitId", ${parameter.unitCode === "CFU" ? cfuId : null}),
          "updatedAt" = NOW()
      WHERE code = ${parameter.code}
    `;
  }
  const form = await getDefaultFormForSlug("microbial");
  if (!form) return;
  const defaults = QC_FORM_SPEC_DEFAULTS.microbial ?? {};
  for (const [code, fill] of Object.entries(defaults)) {
    const parameter = QC_PARAMETER_SEED.find((row) => row.code === code);
    const method = fill.method ?? parameter?.method ?? null;
    const limitText = fill.limitText ?? parameter?.qualitative ?? null;
    await sql`
      UPDATE "QCParameterSpecification" spec
      SET "methodReference" = ${method},
          "minValue" = ${fill.min ?? null},
          "maxValue" = ${fill.max ?? null},
          "limitText" = ${limitText},
          "qualitativeCriterion" = ${limitText},
          "unitId" = COALESCE(spec."unitId", ${fill.unitCode === "CFU" ? cfuId : null}),
          "updatedAt" = NOW()
      FROM "QCParameter" parameter
      WHERE spec."controlledFormId" = ${form.id}
        AND spec."parameterId" = parameter.id
        AND parameter.code = ${code}
    `;
  }
}

export async function alignPhysicoChemicalMaster() {
  await sql`
    UPDATE "Unit"
    SET abbreviation = 'µS/cm', name = 'Microsiemens per centimetre', "updatedAt" = NOW()
    WHERE code = 'USCM'
  `;
  const units = await sql<Array<{ id: string; code: string }>>`
    SELECT id, code FROM "Unit" WHERE code IN ('USCM', 'PPM', 'NTU')
  `;
  const unitByCode = new Map(units.map((row) => [row.code, row.id]));
  for (const parameter of QC_PARAMETER_SEED.filter((row) => row.category === "PHYSICO")) {
    const unitId = parameter.unitCode ? unitByCode.get(parameter.unitCode) ?? null : null;
    await sql`
      UPDATE "QCParameter"
      SET name = ${parameter.name},
          "dataType" = ${parameter.dataType},
          "methodReference" = ${parameter.method ?? null},
          "qualitativeOptions" = ${parameter.options ?? null},
          "unitId" = ${unitId},
          "updatedAt" = NOW()
      WHERE code = ${parameter.code}
    `;
  }

  const catalog = QC_TEST_CATALOG.find((entry) => entry.slug === "physicochemical");
  const form = await getDefaultFormForSlug("physicochemical");
  if (!form) return;
  if (catalog) {
    await sql`
      UPDATE "QCControlledForm"
      SET title = ${catalog.formTitle}, code = ${catalog.formCode}, "updatedAt" = NOW()
      WHERE id = ${form.id}
    `;
  }

  const allowed = QC_FORM_PARAMETERS.physicochemical ?? [];
  const defaults = QC_FORM_SPEC_DEFAULTS.physicochemical ?? {};
  for (const [index, code] of allowed.entries()) {
    const parameter = QC_PARAMETER_SEED.find((row) => row.code === code);
    const fill = defaults[code] ?? {};
    const method = fill.method ?? parameter?.method ?? null;
    const limitText = fill.limitText ?? parameter?.qualitative ?? null;
    const qualitative = null;
    const unitId = unitByCode.get(fill.unitCode ?? parameter?.unitCode ?? "") ?? null;
    const paramRows = await sql<Array<{ id: string }>>`SELECT id FROM "QCParameter" WHERE code = ${code} LIMIT 1`;
    const parameterId = paramRows[0]?.id;
    if (!parameterId) continue;
    const existing = await sql<Array<{
      id: string; minValue: number | null; maxValue: number | null; limitText: string | null;
    }>>`
      SELECT id, "minValue", "maxValue", "limitText"
      FROM "QCParameterSpecification"
      WHERE "controlledFormId" = ${form.id} AND "parameterId" = ${parameterId}
      LIMIT 1
    `;
    if (existing[0]) {
      const catalogHasRange = fill.min != null || fill.max != null || Boolean(fill.limitText);
      const hasSavedRange = existing[0].minValue != null || existing[0].maxValue != null || Boolean(existing[0].limitText?.trim());
      const keepSavedLimits = code === "CONDUCTIVITY" && hasSavedRange;
      const nextMin = keepSavedLimits ? existing[0].minValue : catalogHasRange ? (fill.min ?? null) : existing[0].minValue;
      const nextMax = keepSavedLimits ? existing[0].maxValue : catalogHasRange ? (fill.max ?? null) : existing[0].maxValue;
      const nextLimit = keepSavedLimits ? existing[0].limitText : catalogHasRange ? (fill.limitText ?? null) : (existing[0].limitText ?? limitText);
      await sql`
        UPDATE "QCParameterSpecification"
        SET "methodReference" = ${method},
            "minValue" = ${nextMin},
            "maxValue" = ${nextMax},
            "limitText" = ${nextLimit},
            "qualitativeCriterion" = ${qualitative},
            "unitId" = ${unitId},
            "displayOrder" = ${index + 1},
            required = true,
            "isActive" = true,
            "updatedAt" = NOW()
        WHERE id = ${existing[0].id}
      `;
      continue;
    }
    await sql`
      INSERT INTO "QCParameterSpecification" (
        id, "controlledFormId", "parameterId", "unitId", "methodReference", "minValue", "maxValue",
        "qualitativeCriterion", "limitText", required, "displayOrder", "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()}, ${form.id}, ${parameterId}, ${unitId}, ${method}, ${fill.min ?? null}, ${fill.max ?? null},
        ${qualitative}, ${limitText}, true, ${index + 1}, true, NOW(), NOW()
      )
    `;
  }

  if (allowed.length) {
    await sql`
      UPDATE "QCParameterSpecification" spec
      SET "isActive" = false, "updatedAt" = NOW()
      FROM "QCParameter" parameter
      WHERE spec."parameterId" = parameter.id
        AND spec."controlledFormId" = ${form.id}
        AND parameter.code NOT IN ${sql(allowed)}
    `;
  }
}

export async function seedQcSamplePoints() {
  for (const [index, point] of QC_SAMPLE_POINT_SEED.entries()) {
    const id = `qcsp-${point.code.toLowerCase()}`;
    await sql`
      INSERT INTO "QCSamplePoint" (id, code, name, "groupName", "displayOrder", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${id}, ${point.code}, ${point.name}, ${point.groupName}, ${index + 1}, true, false, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "groupName" = EXCLUDED."groupName", "displayOrder" = EXCLUDED."displayOrder", "isActive" = true, "isArchived" = false, "updatedAt" = NOW()
    `;
  }
  await sql`
    UPDATE "QCSamplePoint"
    SET "isActive" = false, "isArchived" = true, "updatedAt" = NOW()
    WHERE code IN ('PRD-FINISHED', 'PRD-PRODUCT', 'FINISHED', 'FINISHED_PRODUCT')
       OR lower(name) IN ('finished product', 'finished products', 'product')
  `;
}

export async function listQcFrequencies() {
  return sql<Array<{ id: string; code: string; name: string; intervalMinutes: number | null; intervalHours: number | null; intervalDays: number | null; isActive: boolean }>>`
    SELECT id, code, name, "intervalMinutes", "intervalHours", "intervalDays", "isActive"
    FROM "QCTestFrequency"
    WHERE "isArchived" = false
    ORDER BY name
  `;
}

export async function listQcSamplePoints() {
  return sql<Array<{ id: string; code: string; name: string; groupName: string; isActive: boolean; displayOrder: number }>>`
    SELECT id, code, name, "groupName", "isActive", "displayOrder"
    FROM "QCSamplePoint"
    WHERE "isArchived" = false
    ORDER BY
      CASE "groupName"
        WHEN 'ENVIRONMENT' THEN 1
        WHEN 'PROCESSING' THEN 2
        WHEN 'PRODUCT' THEN 3
        ELSE 4
      END,
      "displayOrder",
      name
  `;
}

export async function listQcParameters() {
  return sql<Array<{ id: string; code: string; name: string; category: string; dataType: string; methodReference: string | null; qualitativeOptions: string | null; isActive: boolean }>>`
    SELECT id, code, name, category, "dataType", "methodReference", "qualitativeOptions", "isActive"
    FROM "QCParameter"
    WHERE "isArchived" = false
    ORDER BY "displayOrder", name
  `;
}

export async function listQcControlledForms() {
  return sql<Array<{
    id: string; code: string; title: string; testTypeId: string; testTypeName: string; slug: string | null;
    version: number; frequencyName: string | null; isDefault: boolean; isActive: boolean; specCount: number; missingLimits: number;
  }>>`
    SELECT
      form.id, form.code, form.title, form."testTypeId", type.name AS "testTypeName", type.slug,
      form.version, frequency.name AS "frequencyName", form."isDefault", form."isActive",
      COUNT(spec.id)::int AS "specCount",
      COUNT(spec.id) FILTER (
        WHERE spec."isActive" = true
          AND spec."minValue" IS NULL AND spec."maxValue" IS NULL
          AND (spec."limitText" IS NULL OR spec."limitText" = '')
          AND (spec."qualitativeCriterion" IS NULL OR spec."qualitativeCriterion" = '')
      )::int AS "missingLimits"
    FROM "QCControlledForm" form
    INNER JOIN "QCTestType" type ON type.id = form."testTypeId"
    LEFT JOIN "QCTestFrequency" frequency ON frequency.id = form."frequencyId"
    LEFT JOIN "QCParameterSpecification" spec ON spec."controlledFormId" = form.id
    WHERE form."isArchived" = false
    GROUP BY form.id, type.name, type.slug, type."displayOrder", frequency.name
    ORDER BY type."displayOrder", form.code
  `;
}

export async function getDefaultFormForSlug(slug: string) {
  const rows = await sql<Array<{
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
    WHERE form."isActive" = true AND form."isArchived" = false
      AND (type.slug = ${slug} OR type.code = ${slug.toUpperCase().replace(/-/g, "_")})
    ORDER BY form."isDefault" DESC, form.version DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getFormSpecifications(formId: string) {
  const rows = await sql<Array<{
    id: string; parameterId: string; parameterCode: string; parameterName: string; dataType: string; unitName: string | null;
    methodReference: string | null; minValue: number | null; maxValue: number | null; targetValue: number | null;
    limitText: string | null; qualitativeCriterion: string | null; frequencyName: string | null; required: boolean; displayOrder: number;
    technique: string | null; incubation: string | null; media: string | null; qualitativeOptions: string | null;
  }>>`
    SELECT
      spec.id, spec."parameterId", parameter.code AS "parameterCode", parameter.name AS "parameterName", parameter."dataType",
      COALESCE(spec_unit.abbreviation, param_unit.abbreviation, spec_unit.name, param_unit.name) AS "unitName",
      COALESCE(spec."methodReference", parameter."methodReference") AS "methodReference",
      spec."minValue", spec."maxValue", spec."targetValue", spec."limitText", spec."qualitativeCriterion",
      frequency.name AS "frequencyName", spec.required, spec."displayOrder",
      parameter.technique, parameter.incubation, parameter.media, parameter."qualitativeOptions"
    FROM "QCParameterSpecification" spec
    INNER JOIN "QCParameter" parameter ON parameter.id = spec."parameterId"
    LEFT JOIN "Unit" spec_unit ON spec_unit.id = spec."unitId"
    LEFT JOIN "Unit" param_unit ON param_unit.id = parameter."unitId"
    LEFT JOIN "QCTestFrequency" frequency ON frequency.id = spec."frequencyId"
    WHERE spec."controlledFormId" = ${formId} AND spec."isActive" = true
    ORDER BY spec."displayOrder", parameter.name
  `;
  return rows.map((row) => ({
    ...row,
    acceptableLimit: formatSpecificationLimit(row),
    configured: row.minValue != null || row.maxValue != null || Boolean(row.limitText?.trim()) || Boolean(row.qualitativeCriterion?.trim()),
  }));
}

export async function getFormSections(formId: string) {
  return sql<Array<{ id: string; code: string; title: string; sectionType: string; displayOrder: number; repeatable: boolean; minRows: number; maxRows: number | null }>>`
    SELECT id, code, title, "sectionType", "displayOrder", repeatable, "minRows", "maxRows"
    FROM "QCFormSection"
    WHERE "formId" = ${formId}
    ORDER BY "displayOrder"
  `;
}

export async function listQcItemSpecifications() {
  return sql<Array<{ id: string; itemId: string; itemCode: string | null; itemName: string | null; kind: string; label: string | null; gramMin: number | null; gramMax: number | null; tolerance: number | null; notes: string | null; isActive: boolean }>>`
    SELECT spec.id, spec."itemId", item."itemCode", item."itemName", spec.kind, spec.label, spec."gramMin", spec."gramMax", spec.tolerance, spec.notes, spec."isActive"
    FROM "QCItemSpecification" spec
    LEFT JOIN "Item" item ON item.id = spec."itemId"
    ORDER BY spec.kind, item."itemCode"
  `;
}

export async function listPreformTypeRows() {
  return sql<Array<{
    id: string | null; itemId: string; itemCode: string; itemName: string; label: string | null;
    gramMin: number | null; gramMax: number | null; notes: string | null; isActive: boolean;
  }>>`
    SELECT
      spec.id,
      item.id AS "itemId",
      item."itemCode",
      item."itemName",
      COALESCE(spec.label, item."itemName") AS label,
      spec."gramMin",
      spec."gramMax",
      spec.notes,
      COALESCE(spec."isActive", true) AS "isActive"
    FROM "Item" item
    LEFT JOIN "QCItemSpecification" spec ON spec."itemId" = item.id AND spec.kind = 'PREFORM'
    WHERE item."isArchived" = false
      AND item."isActive" = true
      AND (
        spec.id IS NOT NULL
        OR item."itemName" ILIKE '%preform%'
        OR item."itemCode" ILIKE '%preform%'
        OR item."itemName" ILIKE '%empty bottle%'
      )
    ORDER BY item."itemCode", item."itemName"
  `;
}

export async function upsertQcItemSpecification(input: {
  itemId: string;
  kind?: string;
  label?: string | null;
  gramMin?: number | null;
  gramMax?: number | null;
  notes?: string | null;
  isActive?: boolean;
}) {
  if (!String(input.itemId ?? "").trim()) throw new Error("An item is required");
  const gramMin = input.gramMin != null && Number.isFinite(Number(input.gramMin)) ? Number(input.gramMin) : null;
  const gramMax = input.gramMax != null && Number.isFinite(Number(input.gramMax)) ? Number(input.gramMax) : null;
  if ((gramMin == null) !== (gramMax == null)) {
    throw new Error("Both ends of a range, or neither. A half-configured range would pass or fail every preform against one bound, which is worse than reporting that it is not configured.");
  }
  const kind = input.kind ?? "PREFORM";
  const existing = await sql<Array<{ id: string }>>`
    SELECT id FROM "QCItemSpecification" WHERE "itemId" = ${input.itemId} AND kind = ${kind} LIMIT 1
  `;
  if (existing[0]) {
    await sql`
      UPDATE "QCItemSpecification"
      SET label = ${input.label ?? null}, "gramMin" = ${gramMin}, "gramMax" = ${gramMax}, notes = ${input.notes ?? null},
          "isActive" = ${input.isActive ?? true}, "updatedAt" = NOW()
      WHERE id = ${existing[0].id}
    `;
    return existing[0].id;
  }
  const id = randomUUID();
  await sql`
    INSERT INTO "QCItemSpecification" (id, "itemId", kind, label, "gramMin", "gramMax", notes, "isActive", "createdAt", "updatedAt")
    VALUES (${id}, ${input.itemId}, ${kind}, ${input.label ?? null}, ${gramMin}, ${gramMax}, ${input.notes ?? null}, ${input.isActive ?? true}, NOW(), NOW())
  `;
  return id;
}

export async function listFormItems(formId: string, kind?: string | null) {
  const linked = await sql<Array<{ id: string; itemCode: string; itemName: string }>>`
    SELECT item.id, item."itemCode", item."itemName"
    FROM "QCFormItemApplicability" link
    INNER JOIN "Item" item ON item.id = link."itemId"
    WHERE link."formId" = ${formId} AND item."isArchived" = false AND item."isActive" = true
    ORDER BY item."itemCode"
  `;
  if (linked.length > 0) return linked;
  if (kind) {
    const specified = await sql<Array<{ id: string; itemCode: string; itemName: string }>>`
      SELECT item.id, item."itemCode", item."itemName"
      FROM "QCItemSpecification" spec
      INNER JOIN "Item" item ON item.id = spec."itemId"
      WHERE spec.kind = ${kind} AND spec."isActive" = true AND item."isArchived" = false AND item."isActive" = true
      ORDER BY item."itemCode"
    `;
    if (specified.length > 0) return specified;
  }
  return sql<Array<{ id: string; itemCode: string; itemName: string }>>`
    SELECT id, "itemCode", "itemName"
    FROM "Item"
    WHERE "isArchived" = false AND "isActive" = true
    ORDER BY "itemCode"
  `;
}

export async function updateParameterSpecification(id: string, input: {
  minValue?: number | null;
  maxValue?: number | null;
  targetValue?: number | null;
  limitText?: string | null;
  qualitativeCriterion?: string | null;
  methodReference?: string | null;
  technique?: string | null;
  incubation?: string | null;
  media?: string | null;
  dataType?: string | null;
  qualitativeOptions?: string | null;
  unitName?: string | null;
  required?: boolean;
}) {
  const minValue = input.minValue ?? null;
  const maxValue = input.maxValue ?? null;
  await sql`
    UPDATE "QCParameterSpecification"
    SET "minValue" = ${minValue}, "maxValue" = ${maxValue}, "targetValue" = ${input.targetValue ?? null},
        "limitText" = ${input.limitText ?? null}, "qualitativeCriterion" = ${input.qualitativeCriterion ?? null},
        "methodReference" = ${input.methodReference ?? null}, required = ${input.required ?? true}, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  if (input.unitName !== undefined) {
    const abbreviation = blankToNull(input.unitName);
    let unitId: string | null = null;
    if (abbreviation) {
      const found = await sql<Array<{ id: string }>>`
        SELECT id FROM "Unit"
        WHERE abbreviation ILIKE ${abbreviation} OR code ILIKE ${abbreviation}
        ORDER BY CASE WHEN upper(code) = upper(${abbreviation}) THEN 0 ELSE 1 END
        LIMIT 1
      `;
      if (found[0]) {
        unitId = found[0].id;
      } else {
        const code = `PHY-${abbreviation.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "U"}`;
        unitId = `qcunit-${code.toLowerCase()}`;
        await sql`
          INSERT INTO "Unit" (id, code, name, abbreviation, type, "isActive", "isArchived", "createdAt", "updatedAt")
          VALUES (${unitId}, ${code}, ${abbreviation}, ${abbreviation}, 'MEASURE', true, false, NOW(), NOW())
          ON CONFLICT (code) DO UPDATE SET abbreviation = EXCLUDED.abbreviation, name = EXCLUDED.name, "updatedAt" = NOW()
        `;
        const resolved = await sql<Array<{ id: string }>>`SELECT id FROM "Unit" WHERE code = ${code} LIMIT 1`;
        unitId = resolved[0]?.id ?? unitId;
      }
    }
    await sql`UPDATE "QCParameterSpecification" SET "unitId" = ${unitId}, "updatedAt" = NOW() WHERE id = ${id}`;
  }
  if (
    input.technique !== undefined
    || input.incubation !== undefined
    || input.media !== undefined
    || input.dataType !== undefined
    || input.qualitativeOptions !== undefined
  ) {
    await sql`
      UPDATE "QCParameter" parameter
      SET technique = COALESCE(${input.technique ?? null}, parameter.technique),
          incubation = COALESCE(${input.incubation ?? null}, parameter.incubation),
          media = COALESCE(${input.media ?? null}, parameter.media),
          "dataType" = COALESCE(${input.dataType ?? null}, parameter."dataType"),
          "qualitativeOptions" = COALESCE(${input.qualitativeOptions ?? null}, parameter."qualitativeOptions"),
          "updatedAt" = NOW()
      FROM "QCParameterSpecification" spec
      WHERE spec.id = ${id} AND parameter.id = spec."parameterId"
    `;
  }
}
