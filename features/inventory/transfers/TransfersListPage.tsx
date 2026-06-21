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
import type { TransferRecord } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const transfers: TransferRecord[] = [];

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

function getTransferStatusVariant(status: string): string {
  switch (status) {
    case "draft":
      return "inactive";
    case "pending":
      return "pending";
    case "completed":
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
export default function TransfersListPage() {
  const [data] = useState<TransferRecord[]>(transfers);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Stock Transfers" },
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
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    {
      type: "select",
      key: "fromLocation",
      label: "From Location",
      placeholder: "All Locations",
      options: [
        { label: "Main Warehouse", value: "Main Warehouse" },
        { label: "Store B", value: "Store B" },
        { label: "Chemicals Store", value: "Chemicals Store" },
      ],
    },
  ];

  const columns: Column<TransferRecord>[] = [
    {
      key: "transferNumber",
      label: "Transfer No",
      sortable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    { key: "fromLocation", label: "From Location" },
    { key: "toLocation", label: "To Location" },
    {
      key: "items",
      label: "Items",
      render: (value) => `${value as number} item(s)`,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <StatusBadge
          status={getTransferStatusVariant(value as string) as any}
        />
      ),
    },
    { key: "createdBy", label: "Created By" },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      onClick: (record) =>
        console.log("View transfer", (record as TransferRecord).id),
    },
    {
      label: "Edit",
      onClick: (record) =>
        console.log("Edit transfer", (record as TransferRecord).id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Transfers Found"
      message="There are no stock transfers to display."
      action={{
        label: "Create Transfer",
        onClick: () => console.log("Create Transfer"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export transfers"),
    },
    {
      label: "Create Transfer",
      variant: "primary",
      onClick: () => console.log("Create Transfer"),
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
        title="Stock Transfers"
        subtitle="Manage stock transfers between locations"
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
