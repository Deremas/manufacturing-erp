"use client";

import { useRouter } from "next/navigation";

import { LocationFormPage } from "@/features/administration/locations";
import type { Location } from "@/features/administration/types";
import { publicViewUrl } from "@/lib/routing/urls";

export function LocationEditClient({ location }: { location: Location }) {
  const router = useRouter();

  return (
    <LocationFormPage
      initialData={location}
      isEdit
      onBack={() => router.push(publicViewUrl("administration.location", location.publicId))}
      onSubmit={async (data) => {
        const response = await fetch(`/api/administration/locations/${location.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to update location");
        }
        router.push(publicViewUrl("administration.location", location.publicId));
        router.refresh();
      }}
    />
  );
}
