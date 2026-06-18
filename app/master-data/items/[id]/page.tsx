"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ItemDetail } from "@/features/master-data/components";
import type { Item } from "@/features/master-data/types";

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch item by ID
    setData({
      id: params.id as string,
      itemCode: "ITM-001",
      itemName: "Sample Item",
      sku: "SKU-001",
      categoryId: "cat-1",
      categoryName: "Raw Materials",
      itemType: "raw_material",
      uomId: "uom-1",
      uomName: "Pieces",
      reorderPoint: 10,
      standardCost: 50,
      sellingPrice: 75,
      vatApplicable: true,
      exciseApplicable: false,
      isActive: true,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    } as Item);
    setLoading(false);
  }, [params.id]);

  const handleEdit = () => {
    router.push(`/master-data/items/${params.id}/edit`);
  };

  const handleBack = () => {
    router.push("/master-data/items");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Item not found</div>;
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
        title={data.itemName}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Items", href: "/master-data/items" },
          { label: data.itemCode },
        ]}
      />
      <ItemDetail item={data} onEdit={handleEdit} onBack={handleBack} />
    </div>
  );
}
