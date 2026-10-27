"use client";

import { useRouter } from "next/navigation";

import { LocationFormPage } from "@/features/administration/locations";
import { publicViewUrl } from "@/lib/routing/urls";

export function LocationCreateClient() {
  const router = useRouter();

  return (
    <LocationFormPage
      onBack={() => router.push("/administration/locations")}
      onSubmit={async (data) => {
        const response = await fetch("/api/administration/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; publicId?: number }
          | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to create location");
        }
        router.push(
          payload?.publicId
            ? publicViewUrl("administration.location", payload.publicId)
            : "/administration/locations",
        );
        router.refresh();
      }}
    />
  );
}
