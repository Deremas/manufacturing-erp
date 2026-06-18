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
import type { Category } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Raw Materials",
    description: "Base materials used in production",
    isActive: true,
  },
  {
    id: "cat-2",
    name: "Electrical Components",
    parentCategoryId: "cat-1",
    parentCategoryName: "Raw Materials",
    description: "Electrical parts and components",
    isActive: true,
  },
  {
    id: "cat-3",
    name: "Machinery Parts",
    description: "Spare parts for machinery",
    isActive: true,
  },
  {
    id: "cat-4",
    name: "Packaging Materials",
    description: "Materials used for packaging finished goods",
    isActive: false,
  },
  {
    id: "cat-5",
    name: "Consumables",
    parentCategoryId: "cat-1",
    parentCategoryName: "Raw Materials",
    description: "Consumable supplies",
    isActive: true,
  },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function CategoriesPage() {
  const [data] = useState<Category[]>(mockCategories);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Categories" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name...",
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

  const columns: Column<Category>[] = [
    { key: "name", label: "Name", sortable: true },
    {
      key: "parentCategoryName",
      label: "Parent Category",
      render: (value) => value ?? "—",
    },
    {
      key: "description",
      label: "Description",
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
      title="No Categories Found"
      message="There are no categories to display. Create your first category to get started."
      action={{
        label: "Create Category",
        onClick: () => console.log("Create Category"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export categories"),
    },
    {
      label: "Create Category",
      variant: "primary",
      onClick: () => console.log("Create Category"),
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
        title="Categories"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Categories"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name..."
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
