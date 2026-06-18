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
import type { Supplier } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockSuppliers: Supplier[] = [
  {
    id: "sup-1",
    supplierCode: "SUP-001",
    name: "SteelWorks Inc.",
    contactPerson: "John Smith",
    phone: "+1-555-0201",
    email: "orders@steelworks.com",
    address: "100 Foundry Lane, Pittsburgh, PA",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "sup-2",
    supplierCode: "SUP-002",
    name: "ChemSupply Co.",
    contactPerson: "Sarah Johnson",
    phone: "+1-555-0202",
    email: "sales@chemsupply.com",
    address: "200 Chemical Road, Houston, TX",
    paymentTerms: "Net 45",
    isActive: true,
  },
  {
    id: "sup-3",
    supplierCode: "SUP-003",
    name: "ElectroParts Ltd",
    contactPerson: "Mike Chen",
    phone: "+1-555-0203",
    email: "info@electroparts.com",
    address: "300 Circuit Avenue, San Jose, CA",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "sup-4",
    supplierCode: "SUP-004",
    name: "Packaging Plus",
    contactPerson: "Lisa Brown",
    phone: "+1-555-0204",
    email: "orders@packagingplus.com",
    address: "400 Box Street, Chicago, IL",
    paymentTerms: "Net 60",
    isActive: false,
  },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function SuppliersPage() {
  const [data] = useState<Supplier[]>(mockSuppliers);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Suppliers" },
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

  const columns: Column<Supplier>[] = [
    { key: "supplierCode", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    {
      key: "contactPerson",
      label: "Contact Person",
      render: (value) => value ?? "—",
    },
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
      title="No Suppliers Found"
      message="There are no suppliers to display. Create your first supplier to get started."
      action={{
        label: "Create Supplier",
        onClick: () => console.log("Create Supplier"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export suppliers"),
    },
    {
      label: "Create Supplier",
      variant: "primary",
      onClick: () => console.log("Create Supplier"),
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
        title="Suppliers"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Suppliers"
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
