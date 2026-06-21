"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { UnitForm } from "@/features/master-data/components";

export default function CreateUnitPage() {
  const router = useRouter();

  const handleSubmit = async (data: unknown) => {
    const response = await fetch("/api/master-data/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create unit");
    }

    router.push("/master-data/units");
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
        title="Create Unit"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Units", href: "/master-data/units" },
          { label: "Create" },
        ]}
      />
      <UnitForm onSubmit={handleSubmit} />
    </div>
  );
}
