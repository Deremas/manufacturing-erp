import { notFound } from "next/navigation";

import { LocationViewClient } from "@/features/administration/locations/LocationViewClient";
import { getLocationById } from "@/lib/master-data-db";

export default async function AdministrationLocationViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const location = await getLocationById(publicId);
  if (!location) notFound();
  return <LocationViewClient location={location} />;
}
