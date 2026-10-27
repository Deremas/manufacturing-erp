import { sql } from "@/lib/db";
import { formatItemOptionLabel, isPlaceholderItem } from "@/lib/item-display";
import { postStockMovement } from "@/services/inventory/inventory-posting.service";

export interface ProductionBinCardFilters {
  itemId?: string;
  locationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ProductionBinCardRow {
  id: string;
  date: string;
  movementNumber: string;
  batchNo: string | null;
  referenceNo: string | null;
  itemCode: string;
  itemName: string;
  itemLabel: string;
  locationName: string;
  movementType: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitCost: number | null;
  totalCost: number | null;
  remarks: string | null;
  sourceModule: string | null;
}

export interface ProductionBinCardTotals {
  totalIn: number;
  totalOut: number;
  totalInValue: number;
  avgCost: number;
}

export interface ProductionBinCardRegister {
  lines: ProductionBinCardRow[];
  totals: ProductionBinCardTotals;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function productionBinCardSourceFilter() {
  return sql`
    AND (
      sm."sourceModule" IN (
        'production.issue',
        'production.output',
        'production.material-return',
        'production.bin-card'
      )
      OR (
        sm."sourceModule" = 'inventory.adjustment'
        AND sm."sourceDocumentId" IS NULL
      )
    )
  `;
}

function documentReference(row: {
  batchNo: string | null;
  issueNo: string | null;
  returnNo: string | null;
  referenceId: string | null;
  movementNumber: string;
}) {
  const candidates = [row.batchNo, row.issueNo, row.returnNo, row.referenceId, row.movementNumber];
  return candidates.find((value) => value && !UUID_PATTERN.test(value)) ?? row.movementNumber;
}

export async function listProductionBinCardRows(
  filters: ProductionBinCardFilters = {},
): Promise<ProductionBinCardRow[]> {
  const { lines } = await getProductionBinCardRegister(filters);
  return [...lines].reverse();
}

export async function getProductionBinCardRegister(
  filters: ProductionBinCardFilters = {},
): Promise<ProductionBinCardRegister> {
  const rows = await sql<
    Array<{
      id: string;
      date: Date;
      movementNumber: string;
      batchNo: string | null;
      issueNo: string | null;
      returnNo: string | null;
      referenceId: string | null;
      itemId: string;
      locationId: string;
      itemCode: string;
      itemName: string;
      itemTypeCode: string | null;
      itemTypeName: string | null;
      locationName: string;
      movementType: string;
      quantityIn: number;
      quantityOut: number;
      unitCost: number | null;
      totalCost: number | null;
      remarks: string | null;
      sourceModule: string | null;
    }>
  >`
    SELECT
      sm.id,
      sm.date,
      sm."movementNumber",
      pb."batchNo" AS "batchNo",
      pmi."issueNo" AS "issueNo",
      pmr."returnNo" AS "returnNo",
      sm."referenceId",
      sm."itemId",
      sm."locationId",
      i."itemCode",
      i."itemName",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName",
      l."locationName",
      sm."movementType",
      sm."quantityIn",
      sm."quantityOut",
      sm."unitCost",
      sm."totalCost",
      sm.remarks,
      sm."sourceModule"
    FROM "StockMovement" sm
    INNER JOIN "Item" i ON i.id = sm."itemId"
    INNER JOIN "Location" l ON l.id = sm."locationId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    LEFT JOIN "ProductionBatch" pb
      ON pb.id = sm."sourceDocumentId"
      AND sm."sourceModule" = 'production.output'
    LEFT JOIN "ProductionMaterialIssue" pmi
      ON pmi.id = sm."sourceDocumentId"
      AND sm."sourceModule" = 'production.issue'
    LEFT JOIN "ProductionMaterialReturn" pmr
      ON pmr.id = sm."sourceDocumentId"
      AND sm."sourceModule" = 'production.material-return'
    WHERE sm."isArchived" = false
      ${productionBinCardSourceFilter()}
      ${filters.itemId ? sql`AND sm."itemId" = ${filters.itemId}` : sql``}
      ${filters.locationId ? sql`AND sm."locationId" = ${filters.locationId}` : sql``}
      ${filters.dateFrom ? sql`AND sm.date >= ${filters.dateFrom}` : sql``}
      ${filters.dateTo ? sql`AND sm.date <= ${filters.dateTo}` : sql``}
    ORDER BY sm.date ASC, sm."createdAt" ASC
  `;

  const operationalRows = filters.itemId
    ? rows
    : rows.filter((row) => !isPlaceholderItem(row.itemName, row.itemCode));

  const balances = new Map<string, number>();
  const lines: ProductionBinCardRow[] = operationalRows.map((row) => {
    const key = `${row.itemId}:${row.locationId}`;
    const quantityIn = Number(row.quantityIn || 0);
    const quantityOut = Number(row.quantityOut || 0);
    const balance = (balances.get(key) ?? 0) + quantityIn - quantityOut;
    balances.set(key, balance);
    const itemLabel = formatItemOptionLabel({
      itemCode: row.itemCode,
      itemName: row.itemName,
      itemTypeCode: row.itemTypeCode,
      itemTypeName: row.itemTypeName,
    });

    return {
      id: row.id,
      date: row.date.toISOString(),
      movementNumber: row.movementNumber,
      batchNo: row.batchNo,
      referenceNo: documentReference(row),
      itemCode: row.itemCode,
      itemName: row.itemName,
      itemLabel,
      locationName: row.locationName,
      movementType: row.movementType,
      quantityIn,
      quantityOut,
      balance,
      unitCost: row.unitCost == null ? null : Number(row.unitCost),
      totalCost: row.totalCost == null ? null : Number(row.totalCost),
      remarks: row.remarks,
      sourceModule: row.sourceModule,
    };
  });

  const totals = lines.reduce<ProductionBinCardTotals>(
    (sum, line) => {
      const rate = Number(line.unitCost ?? 0);
      return {
        totalIn: sum.totalIn + line.quantityIn,
        totalOut: sum.totalOut + line.quantityOut,
        totalInValue: sum.totalInValue + line.quantityIn * rate,
        avgCost: 0,
      };
    },
    { totalIn: 0, totalOut: 0, totalInValue: 0, avgCost: 0 },
  );
  totals.avgCost = totals.totalIn > 0 ? totals.totalInValue / totals.totalIn : 0;

  return { lines, totals };
}

export async function postProductionBinCardStock(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  direction: "add" | "subtract";
  remarks?: string;
  shiftCode?: string;
  createdById: string;
}) {
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than 0.");
  }

  const unitCost = Number(input.unitCost);
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error("Unit cost cannot be negative.");
  }

  const remarkParts = [
    input.shiftCode ? `Shift ${input.shiftCode}` : null,
    input.remarks?.trim() || null,
  ].filter(Boolean);

  return postStockMovement({
    itemId: input.itemId,
    locationId: input.locationId,
    movementType: input.direction === "add" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
    sourceModule: "production.bin-card",
    qtyIn: input.direction === "add" ? quantity : 0,
    qtyOut: input.direction === "subtract" ? quantity : 0,
    unitCost,
    remarks: remarkParts.join(" — ") || undefined,
    createdById: input.createdById,
  });
}
