"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CategoryForm } from "@/features/master-data/components";
import type { Category } from "@/features/master-data/types";

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch category by ID
    setData({
      id: params.id as string,
      name: "Raw Materials",
      description: "All raw material items",
      isActive: true,
    } as Category);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update category
    router.push("/master-data/categories");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Category not found</div>;
  }

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
        title={`Edit: ${data.name}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Categories", href: "/master-data/categories" },
          { label: data.name },
          { label: "Edit" },
        ]}
      />
      <CategoryForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
