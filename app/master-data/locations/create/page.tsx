"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { LocationForm } from "@/features/master-data/components";

export default function CreateLocationPage() {
  const router = useRouter();

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — persist location
    router.push("/master-data/locations");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "24px",
      }}
    >
      <PageHeader
        title="Create Location"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Locations", href: "/master-data/locations" },
          { label: "Create" },
        ]}
      />
      <LocationForm onSubmit={handleSubmit} />
    </div>
  );
}
