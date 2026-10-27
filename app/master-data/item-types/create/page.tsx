"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ItemTypeFormPage } from "@/features/master-data/item-types";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

export default function CreateItemTypePage() {
  const router = useRouter();

  const handleSubmit = async (data: unknown) => {
    const response = await fetch("/api/master-data/item-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; publicId?: number }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to create item type");
    }

    router.push(publicViewUrlFromPayload("master-data.item-type", payload, "/master-data/item-types"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title="Create Item Type"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Item Types", href: "/master-data/item-types" },
          { label: "Create" },
        ]}
      />
      <ItemTypeFormPage onSubmit={handleSubmit} />
    </div>
  );
}
