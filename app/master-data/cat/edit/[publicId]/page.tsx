"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { CategoryForm } from "@/features/master-data/components";
import { publicViewUrl } from "@/lib/routing/urls";

export default function MasterDataEditPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = String(params.publicId ?? "");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/master-data/categories/${publicId}`);
        if (!response.ok) {
          setData(null);
          return;
        }
        setData(await response.json());
      } finally {
        setLoading(false);
      }
    };
    if (publicId) load();
  }, [publicId]);

  const handleSubmit = async (formData: unknown) => {
    const id = String(data?.id ?? publicId);
    const response = await fetch(`/api/master-data/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!response.ok) throw new Error("Failed to update");
    router.push(publicViewUrl("master-data.category", publicId));
  };

  if (loading) return <div style={{ padding: "24px" }}>Loading...</div>;
  if (!data) return <div style={{ padding: "24px" }}>Record not found</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={`Edit: ${data.name}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Categories", href: "/master-data/categories" },
          { label: String(data.name) },
          { label: "Edit" },
        ]}
      />
      <CategoryForm initialData={data as never} onSubmit={handleSubmit} />
    </div>
  );
}
