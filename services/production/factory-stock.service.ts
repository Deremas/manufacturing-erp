import { sql } from "@/lib/db";

export async function listFactoryWipBalances() {
  try {
    return await sql<Array<{
      itemCode: string;
      itemName: string;
      uom: string | null;
      locationName: string;
      quantity: number;
      reservedQuantity: number;
      availableQuantity: number;
    }>>`
      SELECT
        i."itemCode",
        i."itemName",
        u.abbreviation AS uom,
        l."locationName",
        sb.quantity,
        sb."reservedQuantity",
        sb."availableQuantity"
      FROM "StockBalance" sb
      INNER JOIN "Item" i ON i.id = sb."itemId"
      INNER JOIN "Location" l ON l.id = sb."locationId"
      LEFT JOIN "Unit" u ON u.id = i."uomId"
      WHERE l."isProductionLocation" = true
        AND sb."isArchived" = false
        AND (sb.quantity <> 0 OR sb."reservedQuantity" <> 0)
      ORDER BY l."locationName", i."itemCode"
    `;
  } catch {
    return [];
  }
}

export async function listRejectedProductionOutput() {
  try {
    return await sql<Array<{
      id: string;
      publicId: number;
      batchNo: string;
      sessionNo: string;
      shiftCode: string;
      itemCode: string;
      itemName: string;
      rejectedQty: number;
      status: string;
      locationName: string;
    }>>`
      SELECT
        pb.id,
        pb."publicId",
        pb."batchNo",
        ss."sessionNo",
        ss."shiftCode",
        i."itemCode",
        i."itemName",
        pb."rejectedQty",
        pb.status::text AS status,
        l."locationName"
      FROM "ProductionBatch" pb
      INNER JOIN "ShiftSession" ss ON ss.id = pb."shiftSessionId"
      INNER JOIN "Item" i ON i.id = pb."finishedGoodId"
      INNER JOIN "Location" l ON l.id = pb."locationId"
      WHERE pb."rejectedQty" > 0
      ORDER BY pb."createdAt" DESC
    `;
  } catch {
    return [];
  }
}
