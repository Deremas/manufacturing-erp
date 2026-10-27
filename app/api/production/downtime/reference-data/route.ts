import { withApiAuthorization } from "@/lib/auth/api-authorization";
import { sql } from "@/lib/db";
import { listDowntimeReasons } from "@/services/shift/downtime.service";

export async function GET() {
  return withApiAuthorization("production.downtime.view", async (user) => {
    const locations = user.accessibleLocationIds ?? [];
    const [reasons, shifts, machines, users] = await Promise.all([
      listDowntimeReasons(),
      sql<Array<Record<string, unknown>>>`SELECT ss.id, ss."sessionNo", ss."shiftCode", ss."productionDate"::text AS "productionDate", ss."locationId", l."locationName" FROM "ShiftSession" ss INNER JOIN "Location" l ON l.id=ss."locationId" WHERE ss.status='ACTIVE' ${locations.length ? sql`AND ss."locationId" = ANY(${locations})` : sql``} ORDER BY ss."startedAt" DESC`,
      sql<Array<Record<string, unknown>>>`SELECT a.id, a."assetCode", a."assetName", a."locationId", a.status::text AS status, a."expectedProductionRatePerHour" FROM "Asset" a WHERE a."isProductionAsset"=true AND a."isActive"=true AND a."isArchived"=false AND a.status IN ('ACTIVE','ASSIGNED','IN_USE') ${locations.length ? sql`AND a."locationId" = ANY(${locations})` : sql``} ORDER BY a."assetCode"`,
      sql<Array<Record<string, unknown>>>`SELECT id, name FROM "User" WHERE "isArchived"=false ORDER BY name`,
    ]);
    return { reasons, shifts, machines, users };
  });
}
