import { ChannelSalesReportPage } from "@/features/sales/ChannelSalesReportPage";
import { requireAuth } from "@/lib/auth/auth";
import { getFleetTrips } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getChannelSalesReport } from "@/services/sales/channel-sales-report.service";

export default async function TruckSalesReportPage({
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
    getChannelSalesReport({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: "TRUCK",
      tripId,
      dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : null,
      dateTo: typeof params.dateTo === "string" ? params.dateTo : null,
    }),
  ]);

  return (
    <ChannelSalesReportPage
      title="Truck Sales Report"
      subtitle="Truck-channel sales only, using the same location-scoped visibility as operational sales pages."
      currencyCode={preferences.currencyCode}
      report={report}
      tripOptions={trips.filter((trip) => trip.isActive)}
      selectedTripId={tripId ?? ""}
      filterBasePath="/sales/reports/truck-sales"
    />
  );
}
