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
import type { IssueVoucher } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const issues: IssueVoucher[] = [];

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
export default function IssuesListPage() {
  const [data] = useState<IssueVoucher[]>(issues);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Issue Vouchers" },
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

  const columns: Column<IssueVoucher>[] = [
    {
      key: "voucherNumber",
      label: "Voucher No",
      sortable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    { key: "department", label: "Department" },
    { key: "issuedTo", label: "Issued To" },
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
        console.log("View issue", (record as IssueVoucher).id),
    },
    {
      label: "Edit",
      onClick: (record) =>
        console.log("Edit issue", (record as IssueVoucher).id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Issue Vouchers Found"
      message="There are no issue vouchers to display."
      action={{
        label: "Create Issue Voucher",
        onClick: () => console.log("Create Issue Voucher"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export issues"),
    },
    {
      label: "Create Issue Voucher",
      variant: "primary",
      onClick: () => console.log("Create Issue Voucher"),
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
        title="Issue Vouchers"
        subtitle="Record materials issued from stores to departments"
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
