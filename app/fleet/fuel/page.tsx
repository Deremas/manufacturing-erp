import { FuelRecordsPage } from "@/features/fleet/FuelRecordsPage";
import { requireAuth } from "@/lib/auth/auth";
import {
  getBankAccounts,
  getFleetDrivers,
  getLocations,
  getSuppliers,
  getVehicles,
} from "@/lib/master-data-db";
import { getFleetTrips, getFuelRecords } from "@/services/fleet/fleet.service";

export const dynamic = "force-dynamic";

export default async function FleetFuelRecordsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireAuth();
  const query = await searchParams;
  const [fuelRecords, vehicles, drivers, trips, suppliers, bankAccounts, locations] = await Promise.all([
    getFuelRecords({ accessibleLocationIds: user?.accessibleLocationIds }),
    getVehicles(),
    getFleetDrivers(),
    getFleetTrips({ accessibleLocationIds: user?.accessibleLocationIds }),
    getSuppliers(),
    getBankAccounts(),
    getLocations(),
  ]);

  const scopedLocations = user?.isSystem
    ? locations
    : locations.filter((location) => (user?.accessibleLocationIds ?? []).includes(location.id));

  return (
    <FuelRecordsPage
      initialItems={fuelRecords}
      vehicles={vehicles}
      drivers={drivers}
      trips={trips}
      suppliers={suppliers}
      bankAccounts={bankAccounts}
      locations={scopedLocations}
      initialEditingId={query.edit}
    />
  );
}
