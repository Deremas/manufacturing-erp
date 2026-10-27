import { TripsPage } from "@/features/fleet/FleetMasterPages";
import { getFleetDrivers, getLocations, getVehicles } from "@/lib/master-data-db";
import { requireAuth } from "@/lib/auth/auth";
import { getFleetTrips } from "@/services/fleet/fleet.service";

export const dynamic = "force-dynamic";

export default async function FleetTripsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireAuth();
  const query = await searchParams;

  const [trips, vehicles, drivers, locations] = await Promise.all([
    getFleetTrips({ accessibleLocationIds: user?.accessibleLocationIds }),
    getVehicles(),
    getFleetDrivers(),
    getLocations(),
  ]);

  const scopedLocations = user?.isSystem
    ? locations
    : locations.filter((location) => (user?.accessibleLocationIds ?? []).includes(location.id));

  return (
    <TripsPage
      initialItems={trips}
      vehicles={vehicles}
      drivers={drivers}
      locations={scopedLocations}
      initialEditingId={query.edit}
    />
  );
}
