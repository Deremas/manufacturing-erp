import { TripDetailPage } from "@/features/fleet/FleetMasterPages";
import { requireAuth } from "@/lib/auth/auth";
import { getFleetTripById, getFuelRecordsForTrip } from "@/services/fleet/fleet.service";

export const dynamic = "force-dynamic";

export default async function FleetTripViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const user = await requireAuth();
  const trip = await getFleetTripById(publicId, { accessibleLocationIds: user?.accessibleLocationIds });
  const fuelRecords = trip
    ? await getFuelRecordsForTrip(trip.id, { accessibleLocationIds: user?.accessibleLocationIds })
    : [];
  return <TripDetailPage trip={trip} fuelRecords={fuelRecords} />;
}
