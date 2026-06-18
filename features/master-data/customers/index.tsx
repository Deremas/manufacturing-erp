"use client";

import React, { useState } from "react";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  SearchInput,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  FilterField,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { Customer } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockCustomers: Customer[] = [
  {
    id: "cust-1",
    customerCode: "CUST-001",
    name: "Acme Corporation",
    phone: "+1-555-0101",
    email: "orders@acmecorp.com",
    address: "123 Industrial Blvd, Detroit, MI",
    creditLimit: 50000,
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "cust-2",
    customerCode: "CUST-002",
    name: "GlobalTech Solutions",
    phone: "+1-555-0102",
    email: "info@globaltech.com",
    address: "456 Innovation Drive, San Jose, CA",
    creditLimit: 75000,
    paymentTerms: "Net 45",
    isActive: true,
  },
  {
    id: "cust-3",
    customerCode: "CUST-003",
    name: "Precision Parts Ltd",
    phone: "+1-555-0103",
    email: "sales@precisionparts.com",
    address: "789 Manufacturing Ave, Chicago, IL",
    creditLimit: 30000,
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "cust-4",
    customerCode: "CUST-004",
    name: "BuildWell Construction",
    phone: "+1-555-0104",
    email: "procurement@buildwell.com",
    address: "321 Builder Street, Houston, TX",
    creditLimit: 100000,
    paymentTerms: "Net 60",
    isActive: false,
  },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function CustomersPage() {
  const [data] = useState<Customer[]>(mockCustomers);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Customers" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name, code, or contact...",
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
  ];

  const columns: Column<Customer>[] = [
    { key: "customerCode", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    {
      key: "phone",
      label: "Phone",
      render: (value) => value ?? "—",
    },
    {
      key: "email",
      label: "Email",
      render: (value) => value ?? "—",
    },
    {
      key: "creditLimit",
      label: "Credit Limit",
      render: (value) =>
        `$${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      sortable: true,
    },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      render: (value) => value ?? "—",
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      onClick: (record) => console.log("View", record.id),
    },
    {
      label: "Edit",
      onClick: (record) => console.log("Edit", record.id),
    },
    {
      label: "Delete",
      color: colors.danger[600],
      onClick: (record) => console.log("Delete", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Customers Found"
      message="There are no customers to display. Create your first customer to get started."
      action={{
        label: "Create Customer",
        onClick: () => console.log("Create Customer"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export customers"),
    },
    {
      label: "Create Customer",
      variant: "primary",
      onClick: () => console.log("Create Customer"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    setSearch("");
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
        title="Customers"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Customers"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, code, or contact..."
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        actions={tableActions}
        emptyState={emptyState}
        recordCount={data.length}
      />
    </div>
  );
}
