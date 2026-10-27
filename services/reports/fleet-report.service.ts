import { getFleetTrips } from "@/services/fleet/fleet.service";
import type { FleetTrip } from "@/features/fleet/types";

export type FleetTripReportFilter = {
  accessibleLocationIds?: string[] | null;
  status?: string | null;
};

export type FleetTripReportRow = {
  id: string;
  tripNo: string;
  tripDate: string;
  vehicle: string;
  driver: string | null;
  route: string;
  fromLocation: string | null;
  destination: string | null;
  status: string;
  loadingQuantity: number;
  dispatchQuantity: number;
  soldQuantity: number;
  undispatchedQuantity: number;
  unsoldQuantity: number;
  fuelQuantity: number;
  fuelCost: number;
  soldAmount: number;
  expectedCollection: number;
  actualCollection: number;
  creditSales: number;
  paymentVariance: number;
  dispatchCompletionPercent: number;
  salesCompletionPercent: number;
  fuelCostPerKm: number | null;
  fuelCostPerSoldUnit: number | null;
  reconciliationStatus: string;
  reconciliationDecision: string | null;
  reconciliationNote: string | null;
};

export type FleetTripReportResult = {
  rows: FleetTripReportRow[];
  kpis: Array<{ label: string; value: number | string }>;
};

function toRow(item: FleetTrip): FleetTripReportRow {
  return {
    id: item.id,
    tripNo: item.tripNo,
    tripDate: item.tripDate,
    vehicle: [item.vehicleCode, item.plateNumber].filter(Boolean).join(" - ") || item.vehicleName || "-",
    driver: item.driverCode ? [item.driverCode, item.driverName].filter(Boolean).join(" - ") : item.driverName ?? null,
    route: item.routeName,
    fromLocation: item.fromLocationLabel ?? null,
    destination: item.destinationLabel ?? null,
    status: item.status,
    loadingQuantity: Number(item.loadingQuantity ?? 0),
    dispatchQuantity: Number(item.dispatchQuantity ?? 0),
    soldQuantity: Number(item.soldQuantity ?? 0),
    undispatchedQuantity: Number(item.undispatchedQuantity ?? 0),
    unsoldQuantity: Number(item.unsoldQuantity ?? 0),
    fuelQuantity: Number(item.fuelQuantity ?? 0),
    fuelCost: Number(item.fuelCost ?? 0),
    soldAmount: Number(item.soldAmount ?? 0),
    expectedCollection: Number(item.expectedCollection ?? 0),
    actualCollection: Number(item.actualCollection ?? 0),
    creditSales: Number(item.creditSales ?? 0),
    paymentVariance: Number(item.paymentVariance ?? 0),
    dispatchCompletionPercent: Number(item.dispatchCompletionPercent ?? 0),
    salesCompletionPercent: Number(item.salesCompletionPercent ?? 0),
    fuelCostPerKm: item.fuelCostPerKm ?? null,
    fuelCostPerSoldUnit: item.fuelCostPerSoldUnit ?? null,
    reconciliationStatus: item.reconciliationStatus ?? "PENDING",
    reconciliationDecision: item.reconciliationDecision ?? null,
    reconciliationNote: item.reconciliationNote ?? null,
  };
}

export async function getFleetTripReport(
  filters: FleetTripReportFilter = {},
): Promise<FleetTripReportResult> {
  const status = String(filters.status ?? "").trim().toUpperCase();
  const trips = await getFleetTrips({ accessibleLocationIds: filters.accessibleLocationIds });
  const filtered = status
    ? trips.filter((trip) => String(trip.status ?? "").trim().toUpperCase() === status)
    : trips;
  const rows = filtered.map(toRow);

  const totalFuelCost = rows.reduce((sum, row) => sum + row.fuelCost, 0);
  const totalSoldAmount = rows.reduce((sum, row) => sum + row.soldAmount, 0);
  const totalPaymentVariance = rows.reduce((sum, row) => sum + row.paymentVariance, 0);

  return {
    rows,
    kpis: [
      { label: "Trips", value: rows.length },
      { label: "Pending Reconciliation", value: rows.filter((row) => row.reconciliationStatus === "PENDING").length },
      { label: "Variance Trips", value: rows.filter((row) => row.reconciliationStatus === "VARIANCE").length },
      { label: "Completed", value: rows.filter((row) => row.status === "COMPLETED").length },
      { label: "Fuel Cost", value: `ETB ${totalFuelCost.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: "Sold Value", value: `ETB ${totalSoldAmount.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: "Payment Variance", value: `ETB ${totalPaymentVariance.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    ],
  };
}
