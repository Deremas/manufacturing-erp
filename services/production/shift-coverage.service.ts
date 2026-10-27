import { sql } from "@/lib/db";

export type ShiftCoverageRow = {
  materialCode: string;
  materialName: string;
  uom: string | null;
  bomQuantity: number;
  totalRequired: number;
  wipOnHand: number;
  wipAvailable: number;
  reserved: number;
  shortage: number;
  status: string;
  productCode: string;
  productName: string;
  bomNo: string;
};

export async function getShiftMaterialCoverage(shiftSessionId: string, locationId: string): Promise<ShiftCoverageRow[]> {
  const lines = await sql<Array<{
    finishedGoodId: string;
    productCode: string;
    productName: string;
    producedQty: number;
    bomId: string | null;
    bomNo: string | null;
    outputQty: number | null;
    componentItemId: string | null;
    materialCode: string | null;
    materialName: string | null;
    uom: string | null;
    bomQuantity: number | null;
    wastagePercent: number | null;
  }>>`
    SELECT
      pb."finishedGoodId",
      fg."itemCode" AS "productCode",
      fg."itemName" AS "productName",
      pb."producedQty",
      bom.id AS "bomId",
      bom."bomNo",
      bom."outputQty",
      bi."componentItemId",
      component."itemCode" AS "materialCode",
      component."itemName" AS "materialName",
      unit.abbreviation AS uom,
      bi.quantity AS "bomQuantity",
      bi."wastagePercent"
    FROM "ProductionBatch" pb
    INNER JOIN "Item" fg ON fg.id = pb."finishedGoodId"
    LEFT JOIN "BOM" bom ON bom.status = 'ACTIVE' AND bom.id = CASE
      WHEN pb."bomId" IS NOT NULL THEN pb."bomId"
      ELSE (
        SELECT fallback.id
        FROM "BOM" fallback
        WHERE fallback."finishedGoodId" = pb."finishedGoodId"
          AND fallback."isDefault" = true
          AND fallback.status = 'ACTIVE'
        ORDER BY fallback."updatedAt" DESC
        LIMIT 1
      )
    END
    LEFT JOIN "BOMItem" bi ON bi."bomId" = bom.id
    LEFT JOIN "Item" component ON component.id = bi."componentItemId"
    LEFT JOIN "Unit" unit ON unit.id = COALESCE(bi."uomId", component."uomId")
    WHERE pb."shiftSessionId" = ${shiftSessionId}
  `;

  const itemIds = Array.from(new Set(lines.map((line) => line.componentItemId).filter((id): id is string => Boolean(id))));
  const stock = itemIds.length
    ? await sql<Array<{ itemId: string; quantity: number; reservedQuantity: number; availableQuantity: number }>>`
        SELECT "itemId", quantity, "reservedQuantity", "availableQuantity"
        FROM "StockBalance"
        WHERE "locationId" = ${locationId}
          AND "itemId" IN ${sql(itemIds)}
          AND "isArchived" = false
      `
    : [];
  const stockByItem = new Map(stock.map((row) => [row.itemId, row]));

  const grouped = new Map<string, ShiftCoverageRow>();
  for (const line of lines) {
    if (!line.componentItemId || !line.materialCode || !line.bomNo || !line.outputQty) continue;
    const scale = Number(line.outputQty) > 0 ? Number(line.producedQty) / Number(line.outputQty) : 0;
    const required = scale * Number(line.bomQuantity ?? 0) * (1 + Number(line.wastagePercent ?? 0) / 100);
    const key = `${line.productCode}:${line.materialCode}`;
    const current = grouped.get(key);
    const balance = stockByItem.get(line.componentItemId);
    if (current) {
      current.totalRequired += required;
    } else {
      grouped.set(key, {
        materialCode: line.materialCode,
        materialName: line.materialName ?? line.materialCode,
        uom: line.uom,
        bomQuantity: Number(line.bomQuantity ?? 0),
        totalRequired: required,
        wipOnHand: Number(balance?.quantity ?? 0),
        wipAvailable: Number(balance?.availableQuantity ?? 0),
        reserved: Number(balance?.reservedQuantity ?? 0),
        shortage: 0,
        status: "Ready",
        productCode: line.productCode,
        productName: line.productName,
        bomNo: line.bomNo,
      });
    }
  }

  return Array.from(grouped.values()).map((row) => {
    const shortage = Math.max(0, row.totalRequired - row.wipAvailable);
    return {
      ...row,
      shortage,
      status: row.totalRequired <= 0 ? "No requirement" : shortage > 0 ? "Shortage" : "Ready",
    };
  });
}
