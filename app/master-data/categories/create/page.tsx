"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CategoryForm } from "@/features/master-data/components";

export default function CreateCategoryPage() {
  const router = useRouter();

  const handleSubmit = async (data: unknown) => {
    const response = await fetch("/api/master-data/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create category");
    }

    router.push("/master-data/categories");
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
