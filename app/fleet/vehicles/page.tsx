import { VehiclesPage as FleetVehiclesPage } from "@/features/fleet/FleetMasterPages";
import { getVehicles } from "@/services/fleet/fleet.service";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const items = await getVehicles();
  return <FleetVehiclesPage initialItems={items} />;
}
