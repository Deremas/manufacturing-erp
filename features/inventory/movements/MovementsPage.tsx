"use client";

import React, { useState } from "react";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  FilterField,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { StockMovementRow } from "@/services/inventory/stock-movement.service";
import { spacing } from "@/components/ui/spacing";

type Option = { label: string; value: string };

interface MovementsPageProps {
  initialData?: StockMovementRow[];
  itemOptions?: Option[];
  locationOptions?: Option[];
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

function getMovementBadgeVariant(movementType: string): string {
  const incoming = [
    "PURCHASE_RECEIPT",
    "TRANSFER_IN",
    "ADJUSTMENT_IN",
    "SALES_RETURN",
    "PRODUCTION_RECEIPT",
    "STORE_RETURN",
    "OPENING",
  ];
  const outgoing = [
    "PURCHASE_RETURN",
    "PRODUCTION_ISSUE",
    "TRANSFER_OUT",
    "ADJUSTMENT_OUT",
    "SALES_ISSUE",
    "STORE_ISSUE",
    "SCRAP",
    "DAMAGED",
    "EXPIRED",
  ];
  if (incoming.includes(movementType)) return "active";
  if (outgoing.includes(movementType)) return "voided";
  return "pending";
}

export default function MovementsPage({
  initialData = [],
  itemOptions = [],
  locationOptions = [],
}: MovementsPageProps) {
  const [data] = useState(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Stock Movements" },
  ];

  const filterFields: FilterField[] = [
    { type: "date", key: "dateFrom", label: "From Date" },
    { type: "date", key: "dateTo", label: "To Date" },
    {
      type: "select",
      key: "item",
      label: "Item",
      placeholder: "All Items",
      options: itemOptions,
    },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: locationOptions,
    },
  ];

  const columns: Column<StockMovementRow>[] = [
    { key: "date", label: "Date", sortable: true, render: (value) => formatDateTime(value as string) },
    { key: "movementNumber", label: "Movement No", sortable: true },
    { key: "itemCode", label: "Item", render: (_, record) => `${record.itemCode} - ${record.itemName}` },
    { key: "locationName", label: "Location" },
    {
      key: "movementType",
      label: "Movement Type",
      render: (value) => <StatusBadge status={getMovementBadgeVariant(value as string) as any} />,
    },
    { key: "qtyIn", label: "Qty In", render: (value) => (value as number).toLocaleString() },
    { key: "qtyOut", label: "Qty Out", render: (value) => (value as number).toLocaleString() },
    { key: "balanceAfter", label: "Balance After", render: (value) => <strong>{(value as number).toLocaleString()}</strong> },
    { key: "unitCost", label: "Unit Cost", render: (value) => (value as number | null)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—" },
    { key: "totalCost", label: "Total Cost", render: (value) => (value as number | null)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—" },
    { key: "referenceType", label: "Ref Type" },
    { key: "referenceNo", label: "Ref No" },
    { key: "sourceModule", label: "Source Module" },
    { key: "createdByName", label: "Created By" },
    { key: "remarks", label: "Remarks" },
  ];

  const tableActions: TableAction[] = [
    { label: "View", onClick: (record) => console.log("View movement", (record as StockMovementRow).movementNumber) },
  ];

  const pageActions: Action[] = [
    { label: "Export", variant: "secondary", onClick: () => console.log("Export movements") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Stock Movements"
        subtitle="Inventory ledger across all modules"
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
        emptyState={<EmptyState title="No Movements Found" message="There are no stock movements to display." />}
        pageSize={15}
      />
    </div>
  );
}
