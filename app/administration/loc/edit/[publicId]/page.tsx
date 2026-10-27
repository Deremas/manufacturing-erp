import { notFound } from "next/navigation";

import { LocationEditClient } from "@/features/administration/locations/LocationEditClient";
import { getLocationById } from "@/lib/master-data-db";

export default async function AdministrationLocationEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const location = await getLocationById(publicId);
  if (!location) notFound();
  return <LocationEditClient location={location} />;
}
