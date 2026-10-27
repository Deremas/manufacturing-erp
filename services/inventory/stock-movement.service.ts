import { sql } from "@/lib/db";

export interface StockMovementRow {
  id: string;
  movementNumber: string;
  date: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  movementType: string;
  qtyIn: number;
  qtyOut: number;
  balanceAfter: number;
  unitCost: number | null;
  totalCost: number | null;
  referenceType: string | null;
  referenceNo: string | null;
  sourceModule: string | null;
  sourceDocumentId: string | null;
  createdById: string;
  createdByName: string;
  remarks: string | null;
}

export interface StockMovementFilters {
  dateFrom?: Date;
  dateTo?: Date;
  itemId?: string;
  locationId?: string;
  movementType?: string;
  referenceType?: string;
  sourceModule?: string;
}

export async function listStockMovements(
  filters: StockMovementFilters = {},
): Promise<StockMovementRow[]> {
  const rows = await sql<
    Array<{
      id: string;
      movementNumber: string;
      date: Date;
      itemId: string;
      itemCode: string;
      itemName: string;
      locationId: string;
      locationCode: string;
      locationName: string;
      movementType: string;
      qtyIn: number;
      qtyOut: number;
      unitCost: number | null;
      totalCost: number | null;
      referenceType: string | null;
      referenceNo: string | null;
      sourceModule: string | null;
      sourceDocumentId: string | null;
      createdById: string;
      createdByName: string;
      remarks: string | null;
    }>
  >`
    SELECT
      sm.id,
      sm."movementNumber",
      sm.date,
      sm."itemId",
      i."itemCode",
      i."itemName",
      sm."locationId",
      l."locationCode",
      l."locationName",
      sm."movementType",
      sm."quantityIn" AS "qtyIn",
      sm."quantityOut" AS "qtyOut",
      sm."unitCost",
      sm."totalCost",
      sm."referenceType",
      sm."referenceId" AS "referenceNo",
      sm."sourceModule",
      sm."sourceDocumentId",
      sm."createdById",
      u.name AS "createdByName",
      sm.remarks
    FROM "StockMovement" sm
    INNER JOIN "Item" i ON i.id = sm."itemId"
    INNER JOIN "Location" l ON l.id = sm."locationId"
    INNER JOIN "User" u ON u.id = sm."createdById"
    WHERE sm."isArchived" = false
      AND i."isArchived" = false
      ${filters.itemId ? sql`AND sm."itemId" = ${filters.itemId}` : sql``}
      ${filters.locationId ? sql`AND sm."locationId" = ${filters.locationId}` : sql``}
      ${filters.movementType ? sql`AND sm."movementType" = ${filters.movementType}` : sql``}
      ${filters.referenceType ? sql`AND sm."referenceType" = ${filters.referenceType}` : sql``}
      ${filters.sourceModule ? sql`AND sm."sourceModule" = ${filters.sourceModule}` : sql``}
      ${filters.dateFrom ? sql`AND sm.date >= ${filters.dateFrom}` : sql``}
      ${filters.dateTo ? sql`AND sm.date <= ${filters.dateTo}` : sql``}
    ORDER BY sm.date ASC, sm."createdAt" ASC
  `;

  const runningBalances = new Map<string, number>();
  return rows.map((row) => {
    const key = `${row.itemId}:${row.locationId}`;
    const currentBalance = runningBalances.get(key) ?? 0;
    const balanceAfter = currentBalance + row.qtyIn - row.qtyOut;
    runningBalances.set(key, balanceAfter);

    return {
      id: row.id,
      movementNumber: row.movementNumber,
      date: row.date.toISOString(),
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      locationId: row.locationId,
      locationCode: row.locationCode,
      locationName: row.locationName,
      movementType: row.movementType,
      qtyIn: row.qtyIn,
      qtyOut: row.qtyOut,
      balanceAfter,
      unitCost: row.unitCost,
      totalCost: row.totalCost,
      referenceType: row.referenceType,
      referenceNo: row.referenceNo,
      sourceModule: row.sourceModule,
      sourceDocumentId: row.sourceDocumentId,
      createdById: row.createdById,
      createdByName: row.createdByName,
      remarks: row.remarks,
    };
  }).reverse();
}

export async function getMovementsForItemLocation(
  itemId: string,
  locationId?: string,
  filters: Omit<StockMovementFilters, "itemId" | "locationId"> = {},
) {
  return listStockMovements({ ...filters, itemId, locationId });
}
