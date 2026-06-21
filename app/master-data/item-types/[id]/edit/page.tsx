"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ItemTypeFormPage } from "@/features/master-data/item-types";
import type { ItemType } from "@/features/master-data/types";

export default function EditItemTypePage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<ItemType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItemType = async () => {
      try {
        const response = await fetch(`/api/master-data/item-types/${params.id}`);
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
      loadItemType();
    }
  }, [params.id]);

  const handleSubmit = async (formData: unknown) => {
    const response = await fetch(`/api/master-data/item-types/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Failed to update item type");
    }

    router.push("/master-data/item-types");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Item type not found</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={`Edit: ${data.name}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Item Types", href: "/master-data/item-types" },
          { label: data.name },
          { label: "Edit" },
        ]}
      />
      <ItemTypeFormPage initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
