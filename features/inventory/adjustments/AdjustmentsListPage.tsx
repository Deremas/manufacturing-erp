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
import type { AdjustmentRecord } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const adjustments: AdjustmentRecord[] = [];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "medium",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getStatusVariant(status: string): string {
  switch (status) {
    case "draft":
      return "inactive";
    case "pending":
      return "pending";
    case "posted":
      return "active";
    case "cancelled":
      return "voided";
    default:
      return "inactive";
  }
}

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function AdjustmentsListPage() {
  const [data] = useState<AdjustmentRecord[]>(adjustments);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Stock Adjustments" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Pending", value: "pending" },
        { label: "Posted", value: "posted" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    {
      type: "select",
      key: "type",
      label: "Adjustment Type",
      placeholder: "All Types",
      options: [
        { label: "Damage", value: "Damage" },
        { label: "Wastage", value: "Wastage" },
        { label: "Count Variance", value: "Count Variance" },
        { label: "Write-off", value: "Write-off" },
        { label: "Revaluation", value: "Revaluation" },
      ],
    },
  ];

  const columns: Column<AdjustmentRecord>[] = [
    {
      key: "adjustmentNumber",
      label: "Adjustment No",
      sortable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    { key: "location", label: "Location" },
    { key: "type", label: "Type" },
    { key: "reason", label: "Reason" },
    {
      key: "items",
      label: "Items",
      render: (value) => `${value as number} item(s)`,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <StatusBadge status={getStatusVariant(value as string) as any} />
      ),
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      onClick: (record) =>
        console.log("View adjustment", (record as AdjustmentRecord).id),
    },
    {
      label: "Edit",
      onClick: (record) =>
        console.log("Edit adjustment", (record as AdjustmentRecord).id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Adjustments Found"
      message="There are no stock adjustments to display."
      action={{
        label: "Create Adjustment",
        onClick: () => console.log("Create Adjustment"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export adjustments"),
    },
    {
      label: "Create Adjustment",
      variant: "primary",
      onClick: () => console.log("Create Adjustment"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    console.log("Filters reset");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Stock Adjustments"
        subtitle="Manage stock quantity and value adjustments"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filters"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={data}
        actions={tableActions}
        emptyState={emptyState}
        pageSize={15}
      />
    </div>
  );
}
