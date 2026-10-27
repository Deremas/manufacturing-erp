import { sql } from "@/lib/db";
import { normalizeSalesChannel, type SalesChannel } from "@/services/sales/sales-shared.service";

export interface LoadingReportFilters {
  accessibleLocationIds?: string[] | null;
  channel?: string | null;
  status?: string | null;
  tripId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface LoadingReportRow {
  id: string;
  loadingNo: string;
  loadingDate: string;
  channel: SalesChannel;
  status: string;
  fromLocation: string;
  destination: string | null;
  counterparty: string | null;
  trip: string | null;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  reservedQuantity: number;
  issuedQuantity: number;
}

export interface LoadingReportResult {
  totals: {
    totalDocuments: number;
    draftCount: number;
    reservedCount: number;
    confirmedCount: number;
    cancelledCount: number;
    totalQuantity: number;
    totalValue: number;
  };
  rows: LoadingReportRow[];
}

export async function getLoadingReport(filters: LoadingReportFilters = {}): Promise<LoadingReportResult> {
  const locationIds = (filters.accessibleLocationIds ?? []).filter(Boolean);
  if (filters.accessibleLocationIds && locationIds.length === 0) {
    return {
      totals: {
        totalDocuments: 0,
        draftCount: 0,
        reservedCount: 0,
        confirmedCount: 0,
        cancelledCount: 0,
        totalQuantity: 0,
        totalValue: 0,
      },
      rows: [],
    };
  }

  const channel = filters.channel ? normalizeSalesChannel(filters.channel) : null;
  const status = String(filters.status ?? "").trim().toUpperCase() || null;
  const tripId = String(filters.tripId ?? "").trim() || null;
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  const rows = await sql<Array<{
    id: string;
    loadingNo: string;
    loadingDate: string;
    channel: string;
    status: string;
    tripNo: string | null;
    routeName: string | null;
    fromLocationCode: string;
    fromLocationName: string;
    destinationCode: string | null;
    destinationName: string | null;
    agentName: string | null;
    customerName: string | null;
    truckCode: string | null;
    truckPlateNumber: string | null;
    itemCount: number;
    totalQuantity: number;
    totalAmount: number;
    reservedQuantity: number;
    issuedQuantity: number;
  }>>`
    SELECT
      lo.id,
      lo."loadingNo",
      lo."loadingDate"::text AS "loadingDate",
      lo.channel,
      lo.status::text AS status,
      trip."tripNo",
      trip."routeName",
      fl."locationCode" AS "fromLocationCode",
      fl."locationName" AS "fromLocationName",
      dl."locationCode" AS "destinationCode",
      dl."locationName" AS "destinationName",
      agent.name AS "agentName",
      customer.name AS "customerName",
      vehicle."vehicleCode" AS "truckCode",
      vehicle."plateNumber" AS "truckPlateNumber",
      COUNT(loi.id)::int AS "itemCount",
      COALESCE(SUM(loi.quantity), 0)::double precision AS "totalQuantity",
      lo."totalAmount",
      COALESCE(SUM(loi."reservedQty"), 0)::double precision AS "reservedQuantity",
      COALESCE(SUM(loi."issuedQty"), 0)::double precision AS "issuedQuantity"
    FROM "LoadingOrder" lo
    INNER JOIN "Location" fl ON fl.id = lo."fromLocationId"
    LEFT JOIN "Location" dl ON dl.id = lo."destinationLocationId"
    LEFT JOIN "Customer" agent ON agent.id = lo."agentId"
    LEFT JOIN "Customer" customer ON customer.id = lo."customerId"
    LEFT JOIN "Vehicle" vehicle ON vehicle.id = lo."truckId"
    LEFT JOIN "FleetTrip" trip ON trip.id = lo."tripId"
    LEFT JOIN "LoadingOrderItem" loi ON loi."loadingOrderId" = lo.id
    WHERE lo."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR lo."fromLocationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      AND (${channel}::text IS NULL OR lo.channel = ${channel})
      AND (${status}::text IS NULL OR lo.status::text = ${status})
      AND (${tripId}::text IS NULL OR lo."tripId" = ${tripId})
      AND (${dateFrom}::timestamptz IS NULL OR lo."loadingDate" >= ${dateFrom}::timestamptz)
      AND (${dateTo}::timestamptz IS NULL OR lo."loadingDate" <= ${dateTo}::timestamptz)
    GROUP BY lo.id, fl.id, dl.id, agent.id, customer.id, vehicle.id, trip.id
    ORDER BY lo."loadingDate" DESC, lo."createdAt" DESC
  `;

  const mappedRows = rows.map((row) => ({
    id: row.id,
    loadingNo: row.loadingNo,
    loadingDate: row.loadingDate,
    channel: normalizeSalesChannel(row.channel),
    status: row.status,
    fromLocation: `${row.fromLocationCode} - ${row.fromLocationName}`,
    destination: row.destinationCode ? `${row.destinationCode} - ${row.destinationName ?? ""}`.trim() : null,
    counterparty: row.agentName ?? row.customerName ?? (row.truckCode ? `${row.truckCode} - ${row.truckPlateNumber ?? ""}`.trim() : null),
    trip: row.tripNo ? `${row.tripNo}${row.routeName ? ` - ${row.routeName}` : ""}` : null,
    itemCount: Number(row.itemCount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    reservedQuantity: Number(row.reservedQuantity ?? 0),
    issuedQuantity: Number(row.issuedQuantity ?? 0),
  }));

  return {
    totals: {
      totalDocuments: mappedRows.length,
      draftCount: mappedRows.filter((row) => row.status === "DRAFT").length,
      reservedCount: mappedRows.filter((row) => row.status === "POSTED" || row.status === "PARTIALLY_CONFIRMED").length,
      confirmedCount: mappedRows.filter((row) => row.status === "CONFIRMED").length,
      cancelledCount: mappedRows.filter((row) => row.status === "CANCELLED").length,
      totalQuantity: mappedRows.reduce((sum, row) => sum + row.totalQuantity, 0),
      totalValue: mappedRows.reduce((sum, row) => sum + row.totalAmount, 0),
    },
    rows: mappedRows,
  };
}
