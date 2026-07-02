"use client";

import React, { useState } from "react";
import { PageHeader, FilterCard, DataTable, EmptyState, ActionButtons } from "@/components/shared";
import type { Breadcrumb, FilterField, Column, TableAction, Action } from "@/components/shared";
import type { BinCardRow } from "@/services/inventory/bin-card.service";
import { spacing } from "@/components/ui/spacing";

type Option = { label: string; value: string };

interface BinCardPageProps {
  initialData?: BinCardRow[];
  itemOptions?: Option[];
  locationOptions?: Option[];
}

export default function BinCardPage({
  initialData = [],
  itemOptions = [],
  locationOptions = [],
}: BinCardPageProps) {
  const [data] = useState(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Bin Card" },
  ];

  const columns: Column<BinCardRow>[] = [
    { key: "date", label: "Date", sortable: true },
    { key: "movementNumber", label: "Movement No", sortable: true },
    { key: "description", label: "Description" },
    { key: "qtyIn", label: "Qty In", render: (value) => (value as number).toLocaleString() },
    { key: "qtyOut", label: "Qty Out", render: (value) => (value as number).toLocaleString() },
    { key: "balance", label: "Balance", render: (value) => (value as number).toLocaleString() },
    { key: "unitCost", label: "Unit Cost", render: (value) => (value as number | null)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—" },
    { key: "totalValue", label: "Total Value", render: (value) => (value as number | null)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—" },
    { key: "reference", label: "Reference" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "select",
      key: "item",
      label: "Item",
      placeholder: "Select Item",
      options: itemOptions,
    },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: locationOptions,
    },
    { type: "date", key: "dateFrom", label: "From Date" },
    { type: "date", key: "dateTo", label: "To Date" },
  ];

  const tableActions: TableAction[] = [
    { label: "View Movement", onClick: (record) => console.log("View bin card movement", (record as BinCardRow).movementNumber) },
  ];

  const pageActions: Action[] = [
    { label: "Export", variant: "secondary", onClick: () => console.log("Export bin card") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Bin Card"
        subtitle="Running item/location ledger from stock movements"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filters"
        fields={filterFields}
        onFilter={(values) => console.log("Filter values", values)}
        onReset={() => console.log("Filters reset")}
      />

      <DataTable
        columns={columns}
        data={data}
        actions={tableActions}
        emptyState={<EmptyState title="No Bin Card Entries" message="Select an item to view its bin card." />}
        pageSize={15}
      />
    </div>
  );
}
