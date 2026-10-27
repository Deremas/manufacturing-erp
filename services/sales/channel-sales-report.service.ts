import { sql } from "@/lib/db";
import { normalizeSalesChannel, type SalesChannel } from "@/services/sales/sales-shared.service";

export interface ChannelSalesReportFilters {
  accessibleLocationIds?: string[] | null;
  channel: string;
  tripId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface ChannelSalesReportRow {
  id: string;
  saleNo: string;
  saleDate: string;
  channel: SalesChannel;
  location: string;
  counterparty: string | null;
  truck: string | null;
  trip: string | null;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  paymentStatus: string;
  status: string;
}

export interface ChannelSalesReportResult {
  totals: {
    totalDocuments: number;
    totalQuantity: number;
    totalValue: number;
    paidCount: number;
    unpaidCount: number;
  };
  rows: ChannelSalesReportRow[];
}

export async function getChannelSalesReport(
  filters: ChannelSalesReportFilters,
): Promise<ChannelSalesReportResult> {
  const locationIds = (filters.accessibleLocationIds ?? []).filter(Boolean);
  if (filters.accessibleLocationIds && locationIds.length === 0) {
    return {
      totals: {
        totalDocuments: 0,
        totalQuantity: 0,
        totalValue: 0,
        paidCount: 0,
        unpaidCount: 0,
      },
      rows: [],
    };
  }

  const channel = normalizeSalesChannel(filters.channel);
  const tripId = String(filters.tripId ?? "").trim() || null;
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  const rows = await sql<Array<{
    id: string;
    saleNo: string;
    saleDate: string;
    channel: string;
    locationCode: string;
    locationName: string;
    customerCode: string | null;
    customerName: string | null;
    agentCode: string | null;
    agentName: string | null;
    truckCode: string | null;
    truckPlateNumber: string | null;
    tripNo: string | null;
    routeName: string | null;
    itemCount: number;
    totalQuantity: number;
    totalAmount: number;
    paymentStatus: string;
    status: string;
  }>>`
    SELECT
      s.id,
      s."saleNo",
      s."saleDate"::text AS "saleDate",
      s.channel,
      location."locationCode",
      location."locationName",
      customer."customerCode",
      customer.name AS "customerName",
      agent."customerCode" AS "agentCode",
      agent.name AS "agentName",
      vehicle."vehicleCode" AS "truckCode",
      vehicle."plateNumber" AS "truckPlateNumber",
      trip."tripNo",
      s."routeName",
      COUNT(item.id)::int AS "itemCount",
      COALESCE(SUM(item.quantity), 0)::double precision AS "totalQuantity",
      s."totalAmount",
      s."paymentStatus",
      s.status
    FROM "Sale" s
    INNER JOIN "Location" location ON location.id = s."locationId"
    LEFT JOIN "Customer" customer ON customer.id = s."customerId"
    LEFT JOIN "Customer" agent ON agent.id = s."agentId"
    LEFT JOIN "Vehicle" vehicle ON vehicle.id = s."truckId"
    LEFT JOIN "FleetTrip" trip ON trip.id = s."tripId"
    LEFT JOIN "SaleItem" item ON item."saleId" = s.id
    WHERE s."isArchived" = false
      AND s.channel = ${channel}
      AND (${tripId}::text IS NULL OR s."tripId" = ${tripId})
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR s."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      AND (${dateFrom}::timestamptz IS NULL OR s."saleDate" >= ${dateFrom}::timestamptz)
      AND (${dateTo}::timestamptz IS NULL OR s."saleDate" <= ${dateTo}::timestamptz)
    GROUP BY s.id, location.id, customer.id, agent.id, vehicle.id
    ORDER BY s."saleDate" DESC, s."createdAt" DESC
  `;

  const mappedRows = rows.map((row) => ({
    id: row.id,
    saleNo: row.saleNo,
    saleDate: row.saleDate,
    channel: normalizeSalesChannel(row.channel),
    location: `${row.locationCode} - ${row.locationName}`,
    counterparty:
      row.agentCode
        ? `${row.agentCode} - ${row.agentName ?? ""}`.trim()
        : row.customerCode
          ? `${row.customerCode} - ${row.customerName ?? ""}`.trim()
          : row.customerName ?? null,
    truck: row.truckCode ? `${row.truckCode} - ${row.truckPlateNumber ?? ""}`.trim() : null,
    trip: row.tripNo ? `${row.tripNo}${row.routeName ? ` - ${row.routeName}` : ""}` : null,
    itemCount: Number(row.itemCount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    paymentStatus: row.paymentStatus,
    status: row.status,
  }));

  return {
    totals: {
      totalDocuments: mappedRows.length,
      totalQuantity: mappedRows.reduce((sum, row) => sum + row.totalQuantity, 0),
      totalValue: mappedRows.reduce((sum, row) => sum + row.totalAmount, 0),
      paidCount: mappedRows.filter((row) => row.paymentStatus === "PAID").length,
      unpaidCount: mappedRows.filter((row) => row.paymentStatus !== "PAID").length,
    },
    rows: mappedRows,
  };
}
