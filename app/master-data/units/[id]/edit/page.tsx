"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { UnitForm } from "@/features/master-data/components";
import type { Unit } from "@/features/master-data/types";

export default function EditUnitPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch unit by ID
    setData({
      id: params.id as string,
      name: "Kilogram",
      abbreviation: "kg",
      type: "weight",
      isActive: true,
    } as Unit);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update unit
    router.push("/master-data/units");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
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
