import { sql } from "@/lib/db";
import { normalizeSalesChannel, type SalesChannel } from "@/services/sales/sales-shared.service";

export interface SalesReportFilters {
  accessibleLocationIds?: string[] | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  locationId?: string | null;
  channel?: string | null;
}

export interface DailySalesReportRow {
  saleDate: string;
  documentCount: number;
  totalQuantity: number;
  totalValue: number;
  paidValue: number;
  unpaidValue: number;
}

export interface DailySalesReportResult {
  totals: {
    totalDocuments: number;
    totalQuantity: number;
    totalValue: number;
  };
  rows: DailySalesReportRow[];
}

export interface ProductSalesReportRow {
  itemId: string;
  itemCode: string;
  itemName: string;
  uom: string | null;
  documentCount: number;
  totalQuantity: number;
  averageUnitPrice: number;
  totalValue: number;
}

export interface ProductSalesReportResult {
  totals: {
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
  };
  rows: ProductSalesReportRow[];
}

export interface ChannelSummaryReportRow {
  channel: SalesChannel;
  documentCount: number;
  totalQuantity: number;
  totalValue: number;
  paidCount: number;
  unpaidCount: number;
}

export interface ChannelSummaryReportResult {
  totals: {
    totalChannels: number;
    totalDocuments: number;
    totalQuantity: number;
    totalValue: number;
  };
  rows: ChannelSummaryReportRow[];
}

function normalizeScope(filters: SalesReportFilters) {
  const locationIds = (filters.accessibleLocationIds ?? []).filter(Boolean);
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
  const locationId = filters.locationId ? String(filters.locationId).trim() : null;
  const channel = filters.channel ? normalizeSalesChannel(filters.channel) : null;

  return {
    locationIds,
    dateFrom,
    dateTo,
    locationId,
    channel,
    noAccess: Boolean(filters.accessibleLocationIds && locationIds.length === 0),
  };
}

export async function getDailySalesReport(
  filters: SalesReportFilters,
): Promise<DailySalesReportResult> {
  const scope = normalizeScope(filters);
  if (scope.noAccess) {
    return {
      totals: { totalDocuments: 0, totalQuantity: 0, totalValue: 0 },
      rows: [],
    };
  }

  const rows = await sql<Array<{
    saleDate: string;
    documentCount: number;
    totalQuantity: number;
    totalValue: number;
    paidValue: number;
    unpaidValue: number;
  }>>`
    SELECT
      TO_CHAR(DATE(s."saleDate"), 'YYYY-MM-DD') AS "saleDate",
      COUNT(DISTINCT s.id)::int AS "documentCount",
      COALESCE(SUM(si.quantity), 0)::double precision AS "totalQuantity",
      COALESCE(SUM(si."lineTotal"), 0)::double precision AS "totalValue",
      COALESCE(SUM(CASE WHEN s."paymentStatus" = 'PAID' THEN si."lineTotal" ELSE 0 END), 0)::double precision AS "paidValue",
      COALESCE(SUM(CASE WHEN s."paymentStatus" <> 'PAID' THEN si."lineTotal" ELSE 0 END), 0)::double precision AS "unpaidValue"
    FROM "Sale" s
    LEFT JOIN "SaleItem" si ON si."saleId" = s.id
    WHERE s."isArchived" = false
      AND (${scope.locationIds.length > 0 ? scope.locationIds : null}::text[] IS NULL OR s."locationId" = ANY(${scope.locationIds.length > 0 ? scope.locationIds : null}::text[]))
      AND (${scope.locationId}::text IS NULL OR s."locationId" = ${scope.locationId})
      AND (${scope.channel}::text IS NULL OR s.channel = ${scope.channel})
      AND (${scope.dateFrom}::timestamptz IS NULL OR s."saleDate" >= ${scope.dateFrom}::timestamptz)
      AND (${scope.dateTo}::timestamptz IS NULL OR s."saleDate" <= ${scope.dateTo}::timestamptz)
    GROUP BY DATE(s."saleDate")
    ORDER BY DATE(s."saleDate") DESC
  `;

  return {
    totals: {
      totalDocuments: rows.reduce((sum, row) => sum + Number(row.documentCount ?? 0), 0),
      totalQuantity: rows.reduce((sum, row) => sum + Number(row.totalQuantity ?? 0), 0),
      totalValue: rows.reduce((sum, row) => sum + Number(row.totalValue ?? 0), 0),
    },
    rows: rows.map((row) => ({
      saleDate: row.saleDate,
      documentCount: Number(row.documentCount ?? 0),
      totalQuantity: Number(row.totalQuantity ?? 0),
      totalValue: Number(row.totalValue ?? 0),
      paidValue: Number(row.paidValue ?? 0),
      unpaidValue: Number(row.unpaidValue ?? 0),
    })),
  };
}

export async function getProductSalesReport(
  filters: SalesReportFilters,
): Promise<ProductSalesReportResult> {
  const scope = normalizeScope(filters);
  if (scope.noAccess) {
    return {
      totals: { totalProducts: 0, totalQuantity: 0, totalValue: 0 },
      rows: [],
    };
  }

  const rows = await sql<Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    uomCode: string | null;
    uomName: string | null;
    documentCount: number;
    totalQuantity: number;
    averageUnitPrice: number;
    totalValue: number;
  }>>`
    SELECT
      si."itemId",
      i."itemCode",
      i."itemName",
      u.code AS "uomCode",
      u.name AS "uomName",
      COUNT(DISTINCT s.id)::int AS "documentCount",
      COALESCE(SUM(si.quantity), 0)::double precision AS "totalQuantity",
      COALESCE(AVG(si."unitPrice"), 0)::double precision AS "averageUnitPrice",
      COALESCE(SUM(si."lineTotal"), 0)::double precision AS "totalValue"
    FROM "SaleItem" si
    INNER JOIN "Sale" s ON s.id = si."saleId"
    INNER JOIN "Item" i ON i.id = si."itemId"
    LEFT JOIN "Unit" u ON u.id = si."unitId"
    WHERE s."isArchived" = false
      AND (${scope.locationIds.length > 0 ? scope.locationIds : null}::text[] IS NULL OR s."locationId" = ANY(${scope.locationIds.length > 0 ? scope.locationIds : null}::text[]))
      AND (${scope.locationId}::text IS NULL OR s."locationId" = ${scope.locationId})
      AND (${scope.channel}::text IS NULL OR s.channel = ${scope.channel})
      AND (${scope.dateFrom}::timestamptz IS NULL OR s."saleDate" >= ${scope.dateFrom}::timestamptz)
      AND (${scope.dateTo}::timestamptz IS NULL OR s."saleDate" <= ${scope.dateTo}::timestamptz)
    GROUP BY si."itemId", i."itemCode", i."itemName", u.code, u.name
    ORDER BY COALESCE(SUM(si."lineTotal"), 0) DESC, i."itemCode" ASC
  `;

  return {
    totals: {
      totalProducts: rows.length,
      totalQuantity: rows.reduce((sum, row) => sum + Number(row.totalQuantity ?? 0), 0),
      totalValue: rows.reduce((sum, row) => sum + Number(row.totalValue ?? 0), 0),
    },
    rows: rows.map((row) => ({
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      uom: row.uomCode && row.uomName ? `${row.uomCode} - ${row.uomName}` : row.uomName ?? row.uomCode,
      documentCount: Number(row.documentCount ?? 0),
      totalQuantity: Number(row.totalQuantity ?? 0),
      averageUnitPrice: Number(row.averageUnitPrice ?? 0),
      totalValue: Number(row.totalValue ?? 0),
    })),
  };
}

export async function getChannelSummaryReport(
  filters: SalesReportFilters,
): Promise<ChannelSummaryReportResult> {
  const scope = normalizeScope(filters);
  if (scope.noAccess) {
    return {
      totals: { totalChannels: 0, totalDocuments: 0, totalQuantity: 0, totalValue: 0 },
      rows: [],
    };
  }

  const rows = await sql<Array<{
    channel: string;
    documentCount: number;
    totalQuantity: number;
    totalValue: number;
    paidCount: number;
    unpaidCount: number;
  }>>`
    SELECT
      s.channel,
      COUNT(DISTINCT s.id)::int AS "documentCount",
      COALESCE(SUM(si.quantity), 0)::double precision AS "totalQuantity",
      COALESCE(SUM(si."lineTotal"), 0)::double precision AS "totalValue",
      COUNT(DISTINCT CASE WHEN s."paymentStatus" = 'PAID' THEN s.id END)::int AS "paidCount",
      COUNT(DISTINCT CASE WHEN s."paymentStatus" <> 'PAID' THEN s.id END)::int AS "unpaidCount"
    FROM "Sale" s
    LEFT JOIN "SaleItem" si ON si."saleId" = s.id
    WHERE s."isArchived" = false
      AND (${scope.locationIds.length > 0 ? scope.locationIds : null}::text[] IS NULL OR s."locationId" = ANY(${scope.locationIds.length > 0 ? scope.locationIds : null}::text[]))
      AND (${scope.locationId}::text IS NULL OR s."locationId" = ${scope.locationId})
      AND (${scope.channel}::text IS NULL OR s.channel = ${scope.channel})
      AND (${scope.dateFrom}::timestamptz IS NULL OR s."saleDate" >= ${scope.dateFrom}::timestamptz)
      AND (${scope.dateTo}::timestamptz IS NULL OR s."saleDate" <= ${scope.dateTo}::timestamptz)
    GROUP BY s.channel
    ORDER BY COALESCE(SUM(si."lineTotal"), 0) DESC, s.channel ASC
  `;

  const mappedRows = rows.map((row) => ({
    channel: normalizeSalesChannel(row.channel),
    documentCount: Number(row.documentCount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    totalValue: Number(row.totalValue ?? 0),
    paidCount: Number(row.paidCount ?? 0),
    unpaidCount: Number(row.unpaidCount ?? 0),
  }));

  return {
    totals: {
      totalChannels: mappedRows.length,
      totalDocuments: mappedRows.reduce((sum, row) => sum + row.documentCount, 0),
      totalQuantity: mappedRows.reduce((sum, row) => sum + row.totalQuantity, 0),
      totalValue: mappedRows.reduce((sum, row) => sum + row.totalValue, 0),
    },
    rows: mappedRows,
  };
}
