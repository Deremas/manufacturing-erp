"use client";

import React, { useState } from "react";
import { PageHeader, DataTable, EmptyState, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Column, TableAction, Action } from "@/components/shared";
import type { StockBalanceRow } from "@/services/inventory/stock-balance.service";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

interface LowStockPageProps {
  initialData?: StockBalanceRow[];
}

export default function LowStockPage({ initialData = [] }: LowStockPageProps) {
  const [data] = useState(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Low Stock" },
  ];

  const columns: Column<StockBalanceRow>[] = [
    { key: "itemCode", label: "Item Code", sortable: true },
    { key: "itemName", label: "Item Name", sortable: true },
    { key: "categoryName", label: "Category" },
    { key: "locationName", label: "Location" },
    { key: "availableQuantity", label: "Available Qty", render: (value) => (value as number).toLocaleString() },
    { key: "reorderPoint", label: "Low Stock Alert Level", render: (value) => (value as number).toLocaleString() },
    {
      key: "shortage",
      label: "Shortage Qty",
      render: (_, record) =>
        Math.max(0, (record as StockBalanceRow).reorderPoint - (record as StockBalanceRow).availableQuantity).toLocaleString(),
    },
    {
      key: "suggestedAction",
      label: "Suggested Action",
      render: (_, record) => (
        <span style={{ color: colors.warning[700], fontWeight: 600 }}>
          Replenish
        </span>
      ),
    },
  ];

  const pageActions: Action[] = [
    { label: "Export", variant: "secondary", onClick: () => console.log("Export low stock") },
  ];

  const tableActions: TableAction[] = [
    { label: "View Item", onClick: (record) => console.log("View low stock item", (record as StockBalanceRow).itemCode) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Low Stock"
        subtitle="Items at or below reorder point"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <DataTable
        columns={columns}
        data={data}
        actions={tableActions}
        emptyState={<EmptyState title="No Low Stock Items" message="No items are currently below their reorder point." />}
        pageSize={15}
      />
    </div>
  );
}
