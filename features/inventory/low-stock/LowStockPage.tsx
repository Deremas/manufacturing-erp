"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader, DataTable, EmptyState } from "@/components/shared";
import type { Column } from "@/components/shared";
import type { StockBalanceRow } from "@/services/inventory/stock-balance.service";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";

interface LowStockPageProps {
  initialData?: StockBalanceRow[];
}

export default function LowStockPage({ initialData = [] }: LowStockPageProps) {
  const [data] = useState(initialData);

  const columns: Column<StockBalanceRow>[] = [
    { key: "itemCode", label: "Item Code", sortable: true },
    { key: "itemName", label: "Item Name", sortable: true },
    { key: "categoryName", label: "Category" },
    { key: "locationName", label: "Location" },
    {
      key: "availableQuantity",
      label: "Available Qty",
      render: (value) => (value as number).toLocaleString(),
    },
    {
      key: "reorderPoint",
      label: "Low Stock Alert",
      render: (value) => (value as number).toLocaleString(),
    },
    {
      key: "shortage",
      label: "Shortage Qty",
      render: (_, record) =>
        Math.max(
          0,
          (record as StockBalanceRow).reorderPoint -
            (record as StockBalanceRow).availableQuantity,
        ).toLocaleString(),
    },
    {
      key: "suggestedAction",
      label: "Actions",
      render: (_, record) => (
        <Link
          href={`/procurement/requisitions/create?itemPublicId=${encodeURIComponent(String((record as StockBalanceRow).itemPublicId))}&locationPublicId=${encodeURIComponent(String((record as StockBalanceRow).locationPublicId))}`}
          style={{
            border: `1px solid ${colors.primary[200]}`,
            backgroundColor: colors.primary[50],
            color: colors.primary[700],
            borderRadius: 10,
            padding: "8px 12px",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Create PR
        </Link>
      ),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Low Stock"
        subtitle="Items at or below reorder point"
      />

      <DataTable
        columns={columns}
        data={data}
        emptyState={
          <EmptyState
            title="No Low Stock Items"
            message="No items are currently below their reorder point."
          />
        }
        pageSize={15}
      />
    </div>
  );
}
