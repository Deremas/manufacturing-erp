import { DriversPage as FleetDriversPage } from "@/features/fleet/FleetMasterPages";
import { getFleetDrivers } from "@/services/fleet/fleet.service";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const items = await getFleetDrivers();
  return <FleetDriversPage initialItems={items} />;
}
