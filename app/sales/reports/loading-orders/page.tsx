import { requireAuth } from "@/lib/auth/auth";
import { getFleetTrips } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import {
  ReportFilters,
  ReportHeader,
  ReportKpiGrid,
  ReportPageShell,
  ReportTable,
} from "@/components/reporting";
import { getLoadingReport } from "@/services/sales/loading-report.service";
import type { Column } from "@/components/shared";

export default async function LoadingOrdersReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const tripId = typeof params.tripId === "string" ? params.tripId : null;
  const [preferences, trips, report] = await Promise.all([
    getSystemPreferences(),
    getFleetTrips(),
    getLoadingReport({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: typeof params.channel === "string" ? params.channel : null,
      status: typeof params.status === "string" ? params.status : null,
      tripId,
      dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : null,
      dateTo: typeof params.dateTo === "string" ? params.dateTo : null,
    }),
  ]);

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: preferences.currencyCode,
    minimumFractionDigits: 2,
  });
  const columns: Column<(typeof report.rows)[number]>[] = [
    { key: "loadingNo", label: "Loading No" },
    { key: "loadingDate", label: "Date", render: (value) => String(value ?? "").slice(0, 10) },
    { key: "channel", label: "Channel" },
    { key: "fromLocation", label: "From Location" },
    { key: "destination", label: "Destination", render: (value) => String(value ?? "-") },
    { key: "counterparty", label: "Counterparty / Truck", render: (value) => String(value ?? "-") },
    { key: "trip", label: "Trip", render: (value) => String(value ?? "-") },
    { key: "itemCount", label: "Items" },
    { key: "totalQuantity", label: "Qty" },
    { key: "reservedQuantity", label: "Reserved" },
    { key: "issuedQuantity", label: "Issued" },
    { key: "totalAmount", label: "Amount", render: (value) => money.format(Number(value ?? 0)) },
    { key: "status", label: "Status" },
  ];

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title="Loading Orders Report"
          subtitle="Reserve-only loading activity scoped to the locations the signed-in user can access."
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "Sales" },
          ]}
        />
      }
      filters={
        <ReportFilters title="Report Filters">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ color: "#667085", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Trip Filter
            </label>
            <form method="get" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <select
                name="tripId"
                defaultValue={tripId ?? ""}
                style={{ width: "100%", maxWidth: 420, height: 48, borderRadius: 14, border: "1px solid #94a3b8", padding: "0 14px", fontSize: 16 }}
              >
                <option value="">All trips</option>
                {trips.filter((trip) => trip.isActive).map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.tripNo} - {trip.routeName} - {trip.vehicleCode}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                style={{ height: 48, borderRadius: 14, border: "none", padding: "0 18px", background: "#00897b", color: "#fff", fontWeight: 700, cursor: "pointer" }}
              >
                Apply Filter
              </button>
            </form>
          </div>
        </ReportFilters>
      }
      kpis={
        <ReportKpiGrid
          items={[
            { label: "Total Documents", value: report.totals.totalDocuments },
            { label: "Draft", value: report.totals.draftCount },
            { label: "Reserved", value: report.totals.reservedCount },
            { label: "Confirmed", value: report.totals.confirmedCount },
            { label: "Cancelled", value: report.totals.cancelledCount },
            { label: "Total Value", value: money.format(report.totals.totalValue) },
          ]}
        />
      }
    >
      <ReportTable columns={columns} data={report.rows} pageSize={15} />
    </ReportPageShell>
  );
}
