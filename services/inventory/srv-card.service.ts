import { sql } from "@/lib/db";

export type SrvCardBucket =
  | "received"
  | "produced"
  | "issued"
  | "sold"
  | "wastage"
  | "adjust";

export interface SrvDailyLine {
  date: string;
  opening: number;
  received: number;
  produced: number;
  issued: number;
  sold: number;
  wastage: number;
  adjustTransfer: number;
  closing: number;
}

export interface SrvCardTotals {
  openingBalance: number;
  received: number;
  produced: number;
  issued: number;
  sold: number;
  wastage: number;
  adjustTransfer: number;
  closingBalance: number;
}

export interface SrvCardResult {
  itemId: string;
  itemCode: string;
  itemName: string;
  uomName: string | null;
  totals: SrvCardTotals;
  lines: SrvDailyLine[];
}

type MovementRow = {
  date: Date;
  movementType: string;
  referenceType: string | null;
  sourceModule: string | null;
  qtyIn: number;
  qtyOut: number;
};

function classifyMovement(row: MovementRow): SrvCardBucket {
  const key = `${row.movementType} ${row.referenceType ?? ""} ${row.sourceModule ?? ""}`.toLowerCase();

  if (key.includes("sales_issue") || (key.includes("sales") && !key.includes("return"))) {
    return "sold";
  }
  if (key.includes("production_receipt") || key.includes("produced") || key.includes("output")) {
    return "produced";
  }
  if (key.includes("scrap") || key.includes("damage") || key.includes("expired") || key.includes("wastage")) {
    return "wastage";
  }
  if (key.includes("store_issue") || key.includes("production_issue") || key.includes("srv")) {
    return "issued";
  }
  if (key.includes("transfer") || key.includes("adjust") || key.includes("purchase_return")) {
    return "adjust";
  }
  if (
    key.includes("purchase_receipt") ||
    key.includes("store_return") ||
    key.includes("sales_return") ||
    key.includes("opening") ||
    key.includes("grn")
  ) {
    return "received";
  }
  if (row.qtyIn > 0 && row.qtyOut <= 0) return "received";
  return "adjust";
}

function dayKey(value: string) {
  return value.slice(0, 10);
}

export async function getSrvCard(input: {
  itemId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<SrvCardResult> {
  const dateFrom = input.dateFrom ? new Date(`${input.dateFrom}T00:00:00`) : undefined;
  const dateTo = input.dateTo ? new Date(`${input.dateTo}T23:59:59.999`) : undefined;

  const [item] = await sql<
    Array<{
      id: string;
      itemCode: string;
      itemName: string;
      uomName: string | null;
    }>
  >`
    SELECT i.id, i."itemCode", i."itemName", COALESCE(u.code, u.name) AS "uomName"
    FROM "Item" i
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    WHERE i.id = ${input.itemId}
    LIMIT 1
  `;

  if (!item) {
    throw new Error("Item not found");
  }

  const [openingRow] = dateFrom
    ? await sql<Array<{ opening: number }>>`
        SELECT COALESCE(SUM("quantityIn" - "quantityOut"), 0)::float AS opening
        FROM "StockMovement"
        WHERE "isArchived" = false
          AND "itemId" = ${input.itemId}
          AND date < ${dateFrom}
      `
    : await sql<Array<{ opening: number }>>`
        SELECT 0::float AS opening
      `;

  const movements = await sql<MovementRow[]>`
    SELECT
      sm.date,
      sm."movementType",
      sm."referenceType",
      sm."sourceModule",
      sm."quantityIn"::float AS "qtyIn",
      sm."quantityOut"::float AS "qtyOut"
    FROM "StockMovement" sm
    WHERE sm."isArchived" = false
      AND sm."itemId" = ${input.itemId}
      ${dateFrom ? sql`AND sm.date >= ${dateFrom}` : sql``}
      ${dateTo ? sql`AND sm.date <= ${dateTo}` : sql``}
    ORDER BY sm.date ASC, sm."createdAt" ASC
  `;

  const byDay = new Map<string, Omit<SrvDailyLine, "date" | "opening" | "closing">>();

  for (const row of movements) {
    const key = dayKey(row.date instanceof Date ? row.date.toISOString() : String(row.date));
    const current = byDay.get(key) ?? {
      received: 0,
      produced: 0,
      issued: 0,
      sold: 0,
      wastage: 0,
      adjustTransfer: 0,
    };
    const bucket = classifyMovement(row);
    const inbound = Number(row.qtyIn || 0);
    const outbound = Number(row.qtyOut || 0);

    if (bucket === "received") current.received += inbound || outbound;
    if (bucket === "produced") current.produced += inbound || outbound;
    if (bucket === "issued") current.issued += outbound || inbound;
    if (bucket === "sold") current.sold += outbound || inbound;
    if (bucket === "wastage") current.wastage += outbound || inbound;
    if (bucket === "adjust") current.adjustTransfer += inbound - outbound;

    byDay.set(key, current);
  }

  let running = Number(openingRow?.opening ?? 0);
  const lines: SrvDailyLine[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => {
      const opening = running;
      const closing =
        opening +
        day.received +
        day.produced +
        day.adjustTransfer -
        day.issued -
        day.sold -
        day.wastage;
      running = closing;
      return { date, opening, closing, ...day };
    });

  const totals = lines.reduce<SrvCardTotals>(
    (sum, line) => ({
      openingBalance: Number(openingRow?.opening ?? 0),
      received: sum.received + line.received,
      produced: sum.produced + line.produced,
      issued: sum.issued + line.issued,
      sold: sum.sold + line.sold,
      wastage: sum.wastage + line.wastage,
      adjustTransfer: sum.adjustTransfer + line.adjustTransfer,
      closingBalance: running,
    }),
    {
      openingBalance: Number(openingRow?.opening ?? 0),
      received: 0,
      produced: 0,
      issued: 0,
      sold: 0,
      wastage: 0,
      adjustTransfer: 0,
      closingBalance: Number(openingRow?.opening ?? 0),
    },
  );

  return {
    itemId: item.id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    uomName: item.uomName,
    totals,
    lines,
  };
}
