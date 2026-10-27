"use client";

import { useRouter } from "next/navigation";

import { LocationDetailPage } from "@/features/administration/locations";
import type { Location } from "@/features/administration/types";
import { publicEditUrl } from "@/lib/routing/urls";

export function LocationViewClient({ location }: { location: Location }) {
  const router = useRouter();
  return (
    <LocationDetailPage
      location={location}
      onBack={() => router.push("/administration/locations")}
      onEdit={() => router.push(publicEditUrl("administration.location", location.publicId))}
    />
  );
}
