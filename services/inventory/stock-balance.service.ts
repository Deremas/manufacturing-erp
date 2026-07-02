import { sql } from "@/lib/db";

export interface StockBalanceRow {
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryId: string | null;
  categoryName: string | null;
  itemTypeId: string | null;
  itemTypeCode: string | null;
  itemTypeName: string | null;
  uomId: string | null;
  uomCode: string | null;
  uomName: string | null;
  locationId: string;
  locationCode: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  reorderPoint: number;
  totalValue: number;
  status: "OUT_OF_STOCK" | "LOW_STOCK" | "NORMAL";
  lastMovementDate: string | null;
}

export async function getStockBalanceByItemLocation(
  itemId: string,
  locationId: string,
) {
  const rows = await sql<
    Array<{
      itemId: string;
      locationId: string;
      quantity: number;
      reservedQuantity: number;
      availableQuantity: number;
      averageCost: number;
      lastMovementDate: Date | null;
    }>
  >`
    SELECT
      "itemId",
      "locationId",
      quantity,
      "reservedQuantity",
      "availableQuantity",
      "averageCost",
      "lastMovementDate"
    FROM "StockBalance"
    WHERE "itemId" = ${itemId} AND "locationId" = ${locationId} AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listStockBalances(): Promise<StockBalanceRow[]> {
  const rows = await sql<
    Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      categoryId: string | null;
      categoryName: string | null;
      itemTypeId: string | null;
      itemTypeCode: string | null;
      itemTypeName: string | null;
      uomId: string | null;
      uomCode: string | null;
      uomName: string | null;
      locationId: string;
      locationCode: string;
      locationName: string;
      quantity: number;
      reservedQuantity: number;
      availableQuantity: number;
      averageCost: number;
      reorderPoint: number | null;
      lastMovementDate: Date | null;
    }>
  >`
    SELECT
      sb."itemId",
      i."itemCode",
      i."itemName",
      i."categoryId",
      c.name AS "categoryName",
      i."itemTypeId",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName",
      i."uomId",
      u.code AS "uomCode",
      u.name AS "uomName",
      sb."locationId",
      l."locationCode",
      l."locationName",
      sb.quantity,
      sb."reservedQuantity",
      sb."availableQuantity",
      sb."averageCost",
      COALESCE(i."reorderPoint", 0) AS "reorderPoint",
      sb."lastMovementDate"
    FROM "StockBalance" sb
    INNER JOIN "Item" i ON i.id = sb."itemId"
    LEFT JOIN "Category" c ON c.id = i."categoryId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    INNER JOIN "Location" l ON l.id = sb."locationId"
    WHERE sb."isArchived" = false
    ORDER BY i."itemCode" ASC, l."locationName" ASC
  `;

  return rows.map((row) => {
    const availableQuantity = row.availableQuantity ?? row.quantity - row.reservedQuantity;
    const reorderPoint = row.reorderPoint ?? 0;
    const status =
      row.quantity <= 0
        ? "OUT_OF_STOCK"
        : availableQuantity <= reorderPoint
          ? "LOW_STOCK"
          : "NORMAL";

    return {
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      itemTypeId: row.itemTypeId,
      itemTypeCode: row.itemTypeCode,
      itemTypeName: row.itemTypeName,
      uomId: row.uomId,
      uomCode: row.uomCode,
      uomName: row.uomName,
      locationId: row.locationId,
      locationCode: row.locationCode,
      locationName: row.locationName,
      quantity: row.quantity,
      reservedQuantity: row.reservedQuantity,
      availableQuantity,
      averageCost: row.averageCost,
      reorderPoint,
      totalValue: row.quantity * row.averageCost,
      status,
      lastMovementDate: row.lastMovementDate?.toISOString() ?? null,
    };
  });
}

export async function listLowStockRows(): Promise<StockBalanceRow[]> {
  const rows = await listStockBalances();
  return rows.filter((row) => row.availableQuantity <= row.reorderPoint);
}
