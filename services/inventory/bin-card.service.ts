import { sql } from "@/lib/db";

export interface BinCardRow {
  date: string;
  movementNumber: string;
  description: string;
  qtyIn: number;
  qtyOut: number;
  balance: number;
  unitCost: number | null;
  totalValue: number | null;
  reference: string | null;
}

export async function getBinCard(
  itemId: string,
  locationId?: string,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<BinCardRow[]> {
  const rows = await sql<
    Array<{
      date: Date;
      movementNumber: string;
      description: string | null;
      qtyIn: number;
      qtyOut: number;
      unitCost: number | null;
      totalCost: number | null;
      reference: string | null;
      itemId: string;
      locationId: string;
    }>
  >`
    SELECT
      sm.date,
      sm."movementNumber",
      COALESCE(sm.remarks, sm."movementType"::text) AS description,
      sm."quantityIn" AS "qtyIn",
      sm."quantityOut" AS "qtyOut",
      sm."unitCost",
      sm."totalCost",
      sm."referenceId" AS reference,
      sm."itemId",
      sm."locationId"
    FROM "StockMovement" sm
    WHERE sm."isArchived" = false
      AND sm."itemId" = ${itemId}
      ${locationId ? sql`AND sm."locationId" = ${locationId}` : sql``}
      ${dateFrom ? sql`AND sm.date >= ${dateFrom}` : sql``}
      ${dateTo ? sql`AND sm.date <= ${dateTo}` : sql``}
    ORDER BY sm.date ASC, sm."createdAt" ASC
  `;

  let runningBalance = 0;
  return rows.map((row) => {
    runningBalance += row.qtyIn - row.qtyOut;
    return {
      date: row.date.toISOString(),
      movementNumber: row.movementNumber,
      description: row.description ?? "",
      qtyIn: row.qtyIn,
      qtyOut: row.qtyOut,
      balance: runningBalance,
      unitCost: row.unitCost,
      totalValue: row.totalCost,
      reference: row.reference,
    };
  });
}
