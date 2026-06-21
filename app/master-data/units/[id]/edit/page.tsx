"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { UnitForm } from "@/features/master-data/components";
import type { Unit } from "@/features/master-data/types";

export default function EditUnitPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnit = async () => {
      try {
        const response = await fetch(`/api/master-data/units/${params.id}`);
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
      loadUnit();
    }
  }, [params.id]);

  const handleSubmit = async (formData: unknown) => {
    const response = await fetch(`/api/master-data/units/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Failed to update unit");
    }

    router.push("/master-data/units");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Unit not found</div>;
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
          { label: "Units", href: "/master-data/units" },
          { label: data.name },
          { label: "Edit" },
        ]}
      />
      <UnitForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
