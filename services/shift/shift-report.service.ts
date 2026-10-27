import { sql } from "@/lib/db";

export async function getShiftDailyReport() {
  try {
    return await sql<Array<{
      productionDate: string;
      sessionNo: string;
      shiftCode: string;
      locationName: string;
      productName: string;
      producedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      wastageQty: number;
      downtimeMinutes: number;
      efficiencyPercent: number;
    }>>`
      SELECT
        ss."productionDate"::text AS "productionDate",
        ss."sessionNo",
        ss."shiftCode",
        l."locationName",
        COALESCE(i."itemName", '-') AS "productName",
        COALESCE(pb."producedQty", 0) AS "producedQty",
        COALESCE(pb."acceptedQty", 0) AS "acceptedQty",
        COALESCE(pb."rejectedQty", 0) AS "rejectedQty",
        COALESCE(pb."wastageQty", 0) AS "wastageQty",
        COALESCE(dt."downtimeMinutes", 0) AS "downtimeMinutes",
        CASE
          WHEN COALESCE(pb."producedQty", 0) > 0 THEN ROUND((pb."acceptedQty" / NULLIF(pb."producedQty", 0)) * 100, 2)
          ELSE 0
        END::double precision AS "efficiencyPercent"
      FROM "ShiftSession" ss
      INNER JOIN "Location" l ON l.id = ss."locationId"
      LEFT JOIN "ProductionBatch" pb ON pb."shiftSessionId" = ss.id
      LEFT JOIN "Item" i ON i.id = pb."finishedGoodId"
      LEFT JOIN (
        SELECT "shiftSessionId", COALESCE(SUM("durationMinutes"), 0)::double precision AS "downtimeMinutes"
        FROM "ProductionDowntime"
        GROUP BY "shiftSessionId"
      ) dt ON dt."shiftSessionId" = ss.id
      ORDER BY ss."productionDate" DESC, ss."shiftCode" ASC
    `;
  } catch {
    return [];
  }
}

export async function getShiftEfficiencyReport() {
  try {
    return await sql<Array<{
      productionDate: string;
      sessionNo: string;
      shiftCode: string;
      plannedOutput: number;
      actualOutput: number;
      efficiencyPercent: number;
      downtimeMinutes: number;
    }>>`
      SELECT
        ss."productionDate"::text AS "productionDate",
        ss."sessionNo",
        ss."shiftCode",
        COALESCE(SUM(pmi."requestedQty"), 0)::double precision AS "plannedOutput",
        COALESCE(SUM(pb."acceptedQty"), 0)::double precision AS "actualOutput",
        CASE
          WHEN COALESCE(SUM(pmi."requestedQty"), 0) > 0 THEN ROUND((COALESCE(SUM(pb."acceptedQty"), 0) / NULLIF(SUM(pmi."requestedQty"), 0)) * 100, 2)
          ELSE 0
        END::double precision AS "efficiencyPercent",
        COALESCE((SELECT SUM("durationMinutes") FROM "ProductionDowntime" WHERE "shiftSessionId" = ss.id), 0)::double precision AS "downtimeMinutes"
      FROM "ShiftSession" ss
      LEFT JOIN "ProductionBatch" pb ON pb."shiftSessionId" = ss.id
      LEFT JOIN "ProductionMaterialIssue" issueDoc ON issueDoc."shiftSessionId" = ss.id
      LEFT JOIN "ProductionMaterialIssueItem" pmi ON pmi."issueId" = issueDoc.id
      GROUP BY ss.id
      ORDER BY ss."productionDate" DESC
    `;
  } catch {
    return [];
  }
}

export async function getShiftDowntimeReport() {
  try {
    return await sql<Array<{
      productionDate: string;
      sessionNo: string;
      shiftCode: string;
      machine: string | null;
      reason: string;
      durationMinutes: number;
      remarks: string | null;
    }>>`
      SELECT
        ss."productionDate"::text AS "productionDate",
        ss."sessionNo",
        ss."shiftCode",
        CASE WHEN a.id IS NULL THEN NULL ELSE a."assetCode" || ' - ' || a."assetName" END AS machine,
        pd.reason::text AS reason,
        pd."durationMinutes",
        pd.remarks
      FROM "ProductionDowntime" pd
      INNER JOIN "ShiftSession" ss ON ss.id = pd."shiftSessionId"
      LEFT JOIN "Asset" a ON a.id = pd."assetId"
      ORDER BY ss."productionDate" DESC, pd."createdAt" DESC
    `;
  } catch {
    return [];
  }
}
