import { requireAuth } from "@/lib/auth/auth";
import { getCustomers, getFleetDrivers, getFleetTrips, getLocations, getVehicles } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { LoadingOrderFormPage } from "@/features/sales/LoadingOrderPages";
import { filterLocationsForUser, userCanUseSalesChannel } from "@/services/sales/sales-access.service";

export default async function CreateLoadingOrderPage() {
  const user = await requireAuth();
  const [locations, customers, vehicles, drivers, trips, preferences] = await Promise.all([
    getLocations(),
    getCustomers(),
    getVehicles(),
    getFleetDrivers(),
    getFleetTrips(),
    getSystemPreferences(),
  ]);
  const allowedChannels = (["FACTORY", "BRANCH", "AGENT", "TRUCK"] as const).filter((channel) =>
    userCanUseSalesChannel(user, channel),
  );

  return (
    <LoadingOrderFormPage
      locations={filterLocationsForUser(user, locations)}
      customers={customers.filter((customer) => customer.isActive)}
      vehicles={vehicles.filter((vehicle) => vehicle.isActive)}
      drivers={drivers.filter((driver) => driver.isActive)}
      trips={trips.filter((trip) => trip.isActive)}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
      allowedChannels={[...allowedChannels]}
    />
  );
}
