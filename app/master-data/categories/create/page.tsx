"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CategoryForm } from "@/features/master-data/components";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

export default function CreateCategoryPage() {
  const router = useRouter();

  const handleSubmit = async (data: unknown) => {
    const response = await fetch("/api/master-data/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; publicId?: number }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to create category");
    }

    router.push(publicViewUrlFromPayload("master-data.category", payload, "/master-data/categories"));
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
        title="Create Category"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Categories", href: "/master-data/categories" },
          { label: "Create" },
        ]}
      />
      <CategoryForm onSubmit={handleSubmit} />
    </div>
  );
}
