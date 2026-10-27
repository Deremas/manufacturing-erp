"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ReportEmptyState,
  ReportExportActions,
  ReportHeader,
  ReportKpiGrid,
  ReportPageShell,
  ReportTable,
} from "@/components/reporting";
import type { Column, TableAction } from "@/components/shared";
import type { FleetTripReportRow } from "@/services/reports/fleet-report.service";
import { formatMoney } from "@/lib/utils/format-number";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE");
}

function buildExportRows(rows: FleetTripReportRow[]) {
  return rows.map((row) => ({
    tripNo: row.tripNo,
    tripDate: row.tripDate,
    vehicle: row.vehicle,
    driver: row.driver ?? "",
    route: row.route,
    fromLocation: row.fromLocation ?? "",
    destination: row.destination ?? "",
    status: row.status,
    loadingQuantity: row.loadingQuantity,
    dispatchQuantity: row.dispatchQuantity,
    soldQuantity: row.soldQuantity,
    undispatchedQuantity: row.undispatchedQuantity,
    unsoldQuantity: row.unsoldQuantity,
    fuelQuantity: row.fuelQuantity,
    fuelCost: row.fuelCost,
    soldAmount: row.soldAmount,
    expectedCollection: row.expectedCollection,
    actualCollection: row.actualCollection,
    creditSales: row.creditSales,
    paymentVariance: row.paymentVariance,
    dispatchCompletionPercent: row.dispatchCompletionPercent,
    salesCompletionPercent: row.salesCompletionPercent,
    fuelCostPerKm: row.fuelCostPerKm ?? "",
    fuelCostPerSoldUnit: row.fuelCostPerSoldUnit ?? "",
    reconciliationStatus: row.reconciliationStatus,
    reconciliationDecision: row.reconciliationDecision ?? "",
    reconciliationNote: row.reconciliationNote ?? "",
  }));
}

export default function FleetTripReportPage({
  rows,
  statusOptions,
  selectedStatus,
  refreshedAt,
  kpis,
}: {
  rows: FleetTripReportRow[];
  statusOptions: string[];
  selectedStatus: string;
  refreshedAt: string;
  kpis: Array<{ label: string; value: number | string }>;
}) {
  const router = useRouter();

  const columns: Column<FleetTripReportRow>[] = [
    { key: "tripNo", label: "Trip No" },
    { key: "tripDate", label: "Trip Date", render: (value) => formatDate(String(value ?? "")) },
    { key: "vehicle", label: "Vehicle" },
    { key: "driver", label: "Driver", render: (value) => String(value ?? "-") },
    { key: "route", label: "Route" },
    { key: "status", label: "Status" },
    { key: "loadingQuantity", label: "Loaded" },
    { key: "dispatchQuantity", label: "Dispatched" },
    { key: "soldQuantity", label: "Sold" },
    { key: "undispatchedQuantity", label: "Undispatched" },
    { key: "unsoldQuantity", label: "Unsold" },
    { key: "fuelCost", label: "Fuel Cost", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "soldAmount", label: "Sold Value", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "expectedCollection", label: "Expected Cash", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "actualCollection", label: "Collected", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "creditSales", label: "Credit Sales", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "paymentVariance", label: "Payment Variance", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "reconciliationStatus", label: "Recon Status" },
  ];

  const actions: TableAction[] = [
    {
      label: "View trip",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(`/fleet/trips/${(record as FleetTripReportRow).id}`),
    },
  ];

  const exportRows = buildExportRows(rows);

  return (
    <ReportPageShell
      hero={(
        <ReportHeader
          title="Fleet Trip Reconciliation"
          subtitle="Loaded, dispatched, sold, fuel, and variance visibility by trip."
          breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Fleet" }, { label: "Trips" }]}
          refreshedAt={refreshedAt}
          actions={<ReportExportActions fileName="fleet-trip-reconciliation" rows={exportRows} />}
        />
      )}
      filters={(
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 }}>
          <form style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#667085" }}>Trip Status</label>
              <select
                name="status"
                defaultValue={selectedStatus}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid #94a3b8", background: "#fff", fontSize: 16 }}
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "end", gap: 12 }}>
              <button
                type="submit"
                style={{ borderRadius: 12, border: "1px solid #0f9f95", background: "#0f9f95", color: "#fff", padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}
              >
                Apply Filter
              </button>
              <button
                type="button"
                onClick={() => router.push("/reports/fleet/trips")}
                style={{ borderRadius: 12, border: "1px solid #d0d5dd", background: "#fff", color: "#344054", padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}
      kpis={<ReportKpiGrid items={kpis} />}
    >
      <ReportTable
        columns={columns}
        data={rows}
        actions={actions}
        pageSize={20}
        emptyState={(
          <ReportEmptyState
            title="No fleet trips found"
            message="No trips matched the current location scope and filters."
          />
        )}
      />
    </ReportPageShell>
  );
}
