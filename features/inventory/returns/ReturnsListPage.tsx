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
import type { ReturnVoucher } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const returns: ReturnVoucher[] = [];

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
export default function ReturnsListPage() {
  const [data] = useState<ReturnVoucher[]>(returns);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Return Vouchers" },
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

  const columns: Column<ReturnVoucher>[] = [
    {
      key: "returnNumber",
      label: "Return No",
      sortable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    { key: "fromDepartment", label: "From Department" },
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
        console.log("View return", (record as ReturnVoucher).id),
    },
    {
      label: "Edit",
      onClick: (record) =>
        console.log("Edit return", (record as ReturnVoucher).id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Return Vouchers Found"
      message="There are no return vouchers to display."
      action={{
        label: "Create Return Voucher",
        onClick: () => console.log("Create Return Voucher"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export returns"),
    },
    {
      label: "Create Return Voucher",
      variant: "primary",
      onClick: () => console.log("Create Return Voucher"),
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
        title="Return Vouchers"
        subtitle="Record materials returned from departments to stores"
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
