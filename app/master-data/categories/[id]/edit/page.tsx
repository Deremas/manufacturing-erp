"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CategoryForm } from "@/features/master-data/components";
import type { Category } from "@/features/master-data/types";

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategory = async () => {
      try {
        const response = await fetch(
          `/api/master-data/categories/${params.id}`,
        );
        if (!response.ok) {
          setData(null);
          return;
        }

        const payload = await response.json();
        setData(payload);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadCategory();
    }
  }, [params.id]);

  const handleSubmit = async (formData: unknown) => {
    const response = await fetch(`/api/master-data/categories/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Failed to update category");
    }

    router.push("/master-data/categories");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
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
