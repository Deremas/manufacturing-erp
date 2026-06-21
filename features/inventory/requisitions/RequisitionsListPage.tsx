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
import type { RequisitionRecord } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const requisitions: RequisitionRecord[] = [];

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
    case "approved":
      return "active";
    case "rejected":
      return "voided";
    case "fulfilled":
      return "completed";
    default:
      return "inactive";
  }
}

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function RequisitionsListPage() {
  const [data] = useState<RequisitionRecord[]>(requisitions);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Store Requisitions" },
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
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Fulfilled", value: "fulfilled" },
      ],
    },
    {
      type: "select",
      key: "department",
      label: "Department",
      placeholder: "All Departments",
      options: [
        { label: "Production", value: "Production" },
        { label: "Quality Control", value: "Quality Control" },
        { label: "Maintenance", value: "Maintenance" },
      ],
    },
  ];

  const columns: Column<RequisitionRecord>[] = [
    {
      key: "requisitionNumber",
      label: "Requisition No",
      sortable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    { key: "department", label: "Department" },
    { key: "requestedBy", label: "Requested By" },
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
        console.log("View requisition", (record as RequisitionRecord).id),
    },
    {
      label: "Edit",
      onClick: (record) =>
        console.log("Edit requisition", (record as RequisitionRecord).id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Requisitions Found"
      message="There are no store requisitions to display."
      action={{
        label: "Create Requisition",
        onClick: () => console.log("Create Requisition"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export requisitions"),
    },
    {
      label: "Create Requisition",
      variant: "primary",
      onClick: () => console.log("Create Requisition"),
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
        title="Store Requisitions"
        subtitle="Manage internal material requisitions from departments"
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
