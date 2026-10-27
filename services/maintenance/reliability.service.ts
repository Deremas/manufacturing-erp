import { sql } from "@/lib/db";

export type ReliabilityRow = { assetId:string; assetCode:string; machine:string; operatingHours:number; breakdownCount:number; totalDowntimeHours:number; mttrHours:number; mtbfHours:number; availabilityPercent:number; repeatFailures:number; maintenanceCost:number };

export async function getReliabilityRows(scope:{accessibleLocationIds?:string[]|null}={},filters:{assetId?:string|null;locationId?:string|null;dateFrom?:string|null;dateTo?:string|null}={}){
  const locations=scope.accessibleLocationIds?.filter(Boolean)??[];
  return sql<ReliabilityRow[]>`
    WITH failures AS (
      SELECT pd."assetId", COUNT(*)::int AS failures,
        COALESCE(SUM(pd."durationMinutes"),0)::float8 AS downtime_minutes,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ProductionDowntime" prior WHERE prior."assetId"=pd."assetId" AND prior.id<>pd.id AND prior."reasonId" IS NOT DISTINCT FROM pd."reasonId" AND prior."startTime" BETWEEN pd."startTime"-INTERVAL '30 days' AND pd."startTime"))::int AS repeats
      FROM "ProductionDowntime" pd WHERE pd."assetId" IS NOT NULL AND pd.status NOT IN ('CANCELLED')
      ${filters.dateFrom?sql`AND pd."startTime">=${new Date(filters.dateFrom)}`:sql``}${filters.dateTo?sql`AND pd."startTime"<=${new Date(filters.dateTo)}`:sql``}
      GROUP BY pd."assetId"
    ), costs AS (SELECT "assetId",COALESCE(SUM("totalCost"),0)::float8 AS cost FROM "MaintenanceWorkOrder" WHERE status='CLOSED' GROUP BY "assetId")
    SELECT a.id AS "assetId",a."assetCode",a."assetName" AS machine,
      GREATEST(EXTRACT(EPOCH FROM (NOW()-COALESCE(a."commissioningDate",a."installationDate",a."purchaseDate",a."createdAt")))/3600-COALESCE(f.downtime_minutes,0)/60,0)::float8 AS "operatingHours",
      COALESCE(f.failures,0)::int AS "breakdownCount",(COALESCE(f.downtime_minutes,0)/60)::float8 AS "totalDowntimeHours",
      CASE WHEN COALESCE(f.failures,0)>0 THEN (f.downtime_minutes/60/f.failures)::float8 ELSE 0 END AS "mttrHours",
      CASE WHEN COALESCE(f.failures,0)>0 THEN (GREATEST(EXTRACT(EPOCH FROM (NOW()-COALESCE(a."commissioningDate",a."installationDate",a."purchaseDate",a."createdAt")))/3600-f.downtime_minutes/60,0)/f.failures)::float8 ELSE 0 END AS "mtbfHours",
      CASE WHEN EXTRACT(EPOCH FROM (NOW()-COALESCE(a."commissioningDate",a."installationDate",a."purchaseDate",a."createdAt")))>0 THEN (100*GREATEST(EXTRACT(EPOCH FROM (NOW()-COALESCE(a."commissioningDate",a."installationDate",a."purchaseDate",a."createdAt")))/60-COALESCE(f.downtime_minutes,0),0)/(EXTRACT(EPOCH FROM (NOW()-COALESCE(a."commissioningDate",a."installationDate",a."purchaseDate",a."createdAt")))/60))::float8 ELSE 100 END AS "availabilityPercent",
      COALESCE(f.repeats,0)::int AS "repeatFailures",COALESCE(c.cost,0)::float8 AS "maintenanceCost"
    FROM "Asset" a LEFT JOIN failures f ON f."assetId"=a.id LEFT JOIN costs c ON c."assetId"=a.id
    WHERE a."isProductionAsset"=true AND a."isArchived"=false ${locations.length?sql`AND a."locationId"=ANY(${locations})`:sql``}${filters.locationId?sql`AND a."locationId"=${filters.locationId}`:sql``}${filters.assetId?sql`AND a.id=${filters.assetId}`:sql``}
    ORDER BY "totalDowntimeHours" DESC,a."assetCode"`;
}
