import { notFound } from "next/navigation";
import { LocationDetailPage } from "@/features/administration/locations";
import { getLocationById } from "@/lib/master-data-db";

interface LocationPageProps {
  params: { id: string };
}

export default async function ViewLocationPage({
  params,
}: LocationPageProps) {
  const location = await getLocationById(params.id);

  if (!location) {
    notFound();
  }

  return <LocationDetailPage location={location} />;
}
