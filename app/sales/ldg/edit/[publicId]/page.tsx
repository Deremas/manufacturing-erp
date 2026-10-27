import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getCustomers, getFleetDrivers, getFleetTrips, getLocations, getVehicles } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { LoadingOrderFormPage } from "@/features/sales/LoadingOrderPages";
import { getLoadingOrderById } from "@/services/sales/loading-order.service";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

export default async function EditLoadingOrderPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, locations, customers, vehicles, drivers, trips, preferences] = await Promise.all([
    getLoadingOrderById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getLocations(),
    getCustomers(),
    getVehicles(),
    getFleetDrivers(),
    getFleetTrips(),
    getSystemPreferences(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <LoadingOrderFormPage
      initialData={item}
      locations={filterLocationsForUser(user, locations)}
      customers={customers.filter((customer) => customer.isActive)}
      vehicles={vehicles.filter((vehicle) => vehicle.isActive)}
      drivers={drivers.filter((driver) => driver.isActive)}
      trips={trips.filter((trip) => trip.isActive)}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}
