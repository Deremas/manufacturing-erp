import { sql } from "@/lib/db";

export async function recalculateProductionCost(batchId: string, options?: { tx?: typeof sql }) {
  const db = options?.tx ?? sql;

  const batchRows = await db<Array<{
    id: string;
    shiftSessionId: string;
    producedQty: number;
    acceptedQty: number;
    wastageQty: number;
    productionDate: string;
  }>>`
    SELECT
      pb.id,
      pb."shiftSessionId",
      pb."producedQty",
      pb."acceptedQty",
      pb."wastageQty",
      ss."productionDate"::text AS "productionDate"
    FROM "ProductionBatch" pb
    INNER JOIN "ShiftSession" ss ON ss.id = pb."shiftSessionId"
    WHERE pb.id = ${batchId}
    LIMIT 1
  `;
  const batch = batchRows[0];
  if (!batch) throw new Error("Production batch not found");

  const materialRows = await db<Array<{ materialCost: number }>>`
    SELECT COALESCE(SUM(pmii."issuedQty" * pmii."unitCost"), 0)::double precision AS "materialCost"
    FROM "ProductionMaterialIssue" pmi
    INNER JOIN "ProductionMaterialIssueItem" pmii ON pmii."issueId" = pmi.id
    WHERE pmi."shiftSessionId" = ${batch.shiftSessionId}
      AND pmi.status = 'POSTED'
      AND (pmi."productionBatchId" IS NULL OR pmi."productionBatchId" = ${batchId})
  `;
  const materialCost = Number(materialRows[0]?.materialCost ?? 0);
  const unitMaterialCost = Number(batch.producedQty ?? 0) > 0 ? materialCost / Number(batch.producedQty) : 0;
  const wastageCost = Number(batch.wastageQty ?? 0) * unitMaterialCost;

  const overheadRows = await db<Array<{ fixedPerShift: number; perUnit: number; perHour: number }>>`
    SELECT
      COALESCE(SUM(CASE WHEN "allocationMethod" = 'FIXED_PER_SHIFT' AND status = 'ACTIVE' AND DATE("effectiveFrom") <= DATE(${new Date(batch.productionDate)}) THEN rate ELSE 0 END), 0)::double precision AS "fixedPerShift",
      COALESCE(SUM(CASE WHEN "allocationMethod" = 'COST_PER_UNIT' AND status = 'ACTIVE' AND DATE("effectiveFrom") <= DATE(${new Date(batch.productionDate)}) THEN rate ELSE 0 END), 0)::double precision AS "perUnit",
      COALESCE(SUM(CASE WHEN "allocationMethod" = 'COST_PER_HOUR' AND status = 'ACTIVE' AND DATE("effectiveFrom") <= DATE(${new Date(batch.productionDate)}) THEN rate ELSE 0 END), 0)::double precision AS "perHour"
    FROM "OverheadCostSetting"
  `;
  const downtimeRows = await db<Array<{ activeMinutes: number }>>`
    SELECT
      GREATEST(
        EXTRACT(EPOCH FROM (COALESCE(ss."endedAt", NOW()) - COALESCE(ss."startedAt", ss."createdAt"))) / 60
        - COALESCE((SELECT SUM("durationMinutes") FROM "ProductionDowntime" WHERE "shiftSessionId" = ${batch.shiftSessionId}), 0),
        0
      )::double precision AS "activeMinutes"
    FROM "ShiftSession" ss
    WHERE ss.id = ${batch.shiftSessionId}
    LIMIT 1
  `;
  const overhead = overheadRows[0] ?? { fixedPerShift: 0, perUnit: 0, perHour: 0 };
  const activeHours = Number(downtimeRows[0]?.activeMinutes ?? 0) / 60;
  const overheadCost = Number(overhead.fixedPerShift ?? 0)
    + (Number(overhead.perUnit ?? 0) * Number(batch.acceptedQty ?? 0))
    + (Number(overhead.perHour ?? 0) * activeHours);

  const laborCost = 0;
  const totalCost = materialCost + wastageCost + overheadCost + laborCost;
  const costPerUnit = Number(batch.acceptedQty ?? 0) > 0 ? totalCost / Number(batch.acceptedQty) : 0;

  await db`
    INSERT INTO "ProductionCostRecord" (
      id, "batchId", "materialCost", "wastageCost", "overheadCost", "laborCost", "totalCost", "costPerUnit", "createdAt", "updatedAt"
    )
    VALUES (
      ${`cost-${batchId}`},
      ${batchId},
      ${materialCost},
      ${wastageCost},
      ${overheadCost},
      ${laborCost},
      ${totalCost},
      ${costPerUnit},
      NOW(),
      NOW()
    )
    ON CONFLICT ("batchId")
    DO UPDATE SET
      "materialCost" = EXCLUDED."materialCost",
      "wastageCost" = EXCLUDED."wastageCost",
      "overheadCost" = EXCLUDED."overheadCost",
      "laborCost" = EXCLUDED."laborCost",
      "totalCost" = EXCLUDED."totalCost",
      "costPerUnit" = EXCLUDED."costPerUnit",
      "updatedAt" = NOW()
  `;

  return { batchId, materialCost, wastageCost, overheadCost, laborCost, totalCost, costPerUnit };
}

export async function getBatchCostReportRows(filters?: { shiftSessionId?: string }) {
  try {
    return await sql<Array<{
      batchId: string;
      batchNo: string;
      productionDate: string;
      shiftCode: string;
      productCode: string;
      productName: string;
      producedQty: number;
      acceptedQty: number;
      materialCost: number;
      wastageCost: number;
      overheadCost: number;
      laborCost: number;
      totalCost: number;
      costPerUnit: number;
      status: string;
    }>>`
      SELECT
        pb.id AS "batchId",
        pb."batchNo",
        ss."productionDate"::text AS "productionDate",
        ss."shiftCode",
        i."itemCode" AS "productCode",
        i."itemName" AS "productName",
        pb."producedQty",
        pb."acceptedQty",
        COALESCE(pcr."materialCost", 0) AS "materialCost",
        COALESCE(pcr."wastageCost", 0) AS "wastageCost",
        COALESCE(pcr."overheadCost", 0) AS "overheadCost",
        COALESCE(pcr."laborCost", 0) AS "laborCost",
        COALESCE(pcr."totalCost", 0) AS "totalCost",
        COALESCE(pcr."costPerUnit", 0) AS "costPerUnit",
        pb.status::text AS status
      FROM "ProductionBatch" pb
      INNER JOIN "ShiftSession" ss ON ss.id = pb."shiftSessionId"
      INNER JOIN "Item" i ON i.id = pb."finishedGoodId"
      LEFT JOIN "ProductionCostRecord" pcr ON pcr."batchId" = pb.id
      ${filters?.shiftSessionId ? sql`WHERE pb."shiftSessionId" = ${filters.shiftSessionId}` : sql``}
      ORDER BY ss."productionDate" DESC, pb."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getDailyProductionCostSummary() {
  try {
    return await sql<Array<{
      productionDate: string;
      shiftCode: string;
      productCode: string;
      productName: string;
      totalProduced: number;
      totalAccepted: number;
      totalRejected: number;
      totalCost: number;
      averageCostPerUnit: number;
    }>>`
      SELECT
        ss."productionDate"::text AS "productionDate",
        ss."shiftCode",
        i."itemCode" AS "productCode",
        i."itemName" AS "productName",
        COALESCE(SUM(pb."producedQty"), 0)::double precision AS "totalProduced",
        COALESCE(SUM(pb."acceptedQty"), 0)::double precision AS "totalAccepted",
        COALESCE(SUM(pb."rejectedQty"), 0)::double precision AS "totalRejected",
        COALESCE(SUM(pcr."totalCost"), 0)::double precision AS "totalCost",
        CASE
          WHEN COALESCE(SUM(pb."acceptedQty"), 0) > 0 THEN COALESCE(SUM(pcr."totalCost"), 0) / SUM(pb."acceptedQty")
          ELSE 0
        END::double precision AS "averageCostPerUnit"
      FROM "ProductionBatch" pb
      INNER JOIN "ShiftSession" ss ON ss.id = pb."shiftSessionId"
      INNER JOIN "Item" i ON i.id = pb."finishedGoodId"
      LEFT JOIN "ProductionCostRecord" pcr ON pcr."batchId" = pb.id
      GROUP BY DATE(ss."productionDate"), ss."shiftCode", i."itemCode", i."itemName"
      ORDER BY DATE(ss."productionDate") DESC, ss."shiftCode" ASC
    `;
  } catch {
    return [];
  }
}
