"use client";

import { useRouter } from "next/navigation";

import type { FleetTrip } from "@/features/fleet/types";
import type { ChannelSalesReportResult } from "@/services/sales/channel-sales-report.service";
import {
  ReportFilters,
  ReportHeader,
  ReportKpiGrid,
  ReportPageShell,
  ReportTable,
} from "@/components/reporting";
import type { Column } from "@/components/shared";

export function ChannelSalesReportPage({
  title,
  subtitle,
  currencyCode,
  report,
  tripOptions = [],
  selectedTripId = "",
  filterBasePath,
}: {
  title: string;
  subtitle: string;
  currencyCode: string;
  report: ChannelSalesReportResult;
  tripOptions?: FleetTrip[];
  selectedTripId?: string;
  filterBasePath?: string;
}) {
  const router = useRouter();
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  });
  const columns: Column<ChannelSalesReportResult["rows"][number]>[] = [
    { key: "saleNo", label: "Sale No" },
    { key: "saleDate", label: "Date", render: (value) => String(value ?? "").slice(0, 10) },
    { key: "channel", label: "Channel" },
    { key: "location", label: "Location" },
    { key: "counterparty", label: "Customer / Agent", render: (value) => String(value ?? "-") },
    { key: "truck", label: "Truck", render: (value) => String(value ?? "-") },
    { key: "trip", label: "Trip", render: (value) => String(value ?? "-") },
    { key: "itemCount", label: "Items" },
    { key: "totalQuantity", label: "Qty", render: (value) => Number(value ?? 0).toFixed(2) },
    { key: "totalAmount", label: "Amount", render: (value) => money.format(Number(value ?? 0)) },
    { key: "paymentStatus", label: "Payment" },
    { key: "status", label: "Status" },
  ];

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "Sales" },
          ]}
        />
      }
      filters={
        tripOptions.length > 0 && filterBasePath ? (
          <ReportFilters title="Trip Filter">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Trip
              </label>
              <select
                style={{ width: "100%", height: 48, borderRadius: 14, border: "1px solid #94a3b8", padding: "0 14px", fontSize: 16 }}
                value={selectedTripId}
                onChange={(event) => {
                  const query = new URLSearchParams();
                  if (event.target.value) {
                    query.set("tripId", event.target.value);
                  }
                  router.push(query.size > 0 ? `${filterBasePath}?${query.toString()}` : filterBasePath);
                }}
              >
                <option value="">All trips</option>
                {tripOptions.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.tripNo} - {trip.routeName} - {trip.vehicleCode}
                  </option>
                ))}
              </select>
            </div>
          </ReportFilters>
        ) : undefined
      }
      kpis={
        <ReportKpiGrid
          items={[
            { label: "Total Sales", value: report.totals.totalDocuments },
            { label: "Paid", value: report.totals.paidCount },
            { label: "Unpaid", value: report.totals.unpaidCount },
            { label: "Total Qty", value: report.totals.totalQuantity.toFixed(2) },
            { label: "Total Value", value: money.format(report.totals.totalValue) },
          ]}
        />
      }
    >
      <ReportTable columns={columns} data={report.rows} pageSize={15} />
    </ReportPageShell>
  );
}
