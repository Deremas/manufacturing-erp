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
import type { PriceList } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockPriceLists: PriceList[] = [
  {
    id: "pl-1",
    itemId: "1",
    itemName: "Premium Steel Rod",
    customerGroup: "Wholesale",
    price: 55.0,
    effectiveDate: "2026-01-01",
    isActive: true,
  },
  {
    id: "pl-2",
    itemId: "1",
    itemName: "Premium Steel Rod",
    customerGroup: "Retail",
    price: 65.0,
    effectiveDate: "2026-01-01",
    isActive: true,
  },
  {
    id: "pl-3",
    itemId: "2",
    itemName: "Aluminium Sheet",
    customerGroup: "Wholesale",
    price: 135.0,
    effectiveDate: "2026-02-01",
    isActive: true,
  },
  {
    id: "pl-4",
    itemId: "2",
    itemName: "Aluminium Sheet",
    customerGroup: "Retail",
    price: 155.0,
    effectiveDate: "2026-02-01",
    isActive: true,
  },
  {
    id: "pl-5",
    itemId: "3",
    itemName: "Copper Wire Spool",
    customerGroup: "Distributor",
    price: 250.0,
    effectiveDate: "2026-03-01",
    isActive: false,
  },
];

const customerGroupOptions = [
  { label: "Wholesale", value: "Wholesale" },
  { label: "Retail", value: "Retail" },
  { label: "Distributor", value: "Distributor" },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function PriceListsPage() {
  const [data] = useState<PriceList[]>(mockPriceLists);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Price Lists" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by item or customer group...",
    },
    {
      type: "select",
      key: "customerGroup",
      label: "Customer Group",
      placeholder: "All Groups",
      options: customerGroupOptions,
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

  const columns: Column<PriceList>[] = [
    {
      key: "itemName",
      label: "Item",
      render: (value) => value ?? "—",
      sortable: true,
    },
    { key: "customerGroup", label: "Customer Group", sortable: true },
    {
      key: "price",
      label: "Price",
      render: (value) =>
        `$${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      sortable: true,
    },
    { key: "effectiveDate", label: "Effective Date", sortable: true },
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
      title="No Price Lists Found"
      message="There are no price lists to display. Create your first price list entry to get started."
      action={{
        label: "Create Price List",
        onClick: () => console.log("Create Price List"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export price lists"),
    },
    {
      label: "Create Price List",
      variant: "primary",
      onClick: () => console.log("Create Price List"),
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
        title="Price Lists"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Price Lists"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by item or customer group..."
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
