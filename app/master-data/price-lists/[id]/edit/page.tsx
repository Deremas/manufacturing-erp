"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { PriceListForm } from "@/features/master-data/components";
import type { PriceList } from "@/features/master-data/types";

export default function EditPriceListPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<PriceList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch price list entry by ID
    setData({
      id: params.id as string,
      itemId: "item-1",
      itemName: "Sample Item",
      customerGroup: "retail",
      price: 1500,
      effectiveDate: "2025-01-01T00:00:00Z",
      isActive: true,
    } as PriceList);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update price list entry
    router.push("/master-data/price-lists");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Price List entry not found</div>;
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
        title={`Edit: ${data.itemName ?? data.id}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Price Lists", href: "/master-data/price-lists" },
          { label: data.id },
          { label: "Edit" },
        ]}
      />
      <PriceListForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
