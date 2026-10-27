import { requireAuth } from "@/lib/auth/auth";
import { getFleetTrips } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { LoadingOrdersListPage } from "@/features/sales/LoadingOrderPages";
import { listLoadingOrders } from "@/services/sales/loading-order.service";

export default async function TruckLoadingListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const tripId = typeof params.tripId === "string" ? params.tripId : null;
  const [items, preferences, trips] = await Promise.all([
    listLoadingOrders({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: "TRUCK",
      tripId,
    }),
    getSystemPreferences(),
    getFleetTrips(),
  ]);

  return (
    <LoadingOrdersListPage
      items={items}
      forcedChannel="TRUCK"
      currencyCode={preferences.currencyCode}
      tripOptions={trips.filter((trip) => trip.isActive)}
      selectedTripId={tripId ?? ""}
      filterBasePath="/sales/truck/loading"
    />
  );
}
