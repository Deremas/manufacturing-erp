import { LocationsPage } from "@/features/administration/locations";
import { getLocations } from "@/lib/master-data-db";

export default async function AdministrationLocationsPage() {
  const locations = await getLocations();
  return <LocationsPage initialData={locations} />;
}
