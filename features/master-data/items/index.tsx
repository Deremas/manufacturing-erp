"use client";

import React, { useState } from "react";
import {
  PageHeader,
  FilterCard,
  MetricCard,
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
import type { Item } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockItems: Item[] = [
  {
    id: "1",
    itemCode: "ITM-001",
    itemName: "Premium Steel Rod",
    sku: "PSR-12MM-001",
    categoryId: "cat-1",
    categoryName: "Raw Materials",
    itemType: "Raw Material",
    uomId: "uom-1",
    uomName: "kg",
    purchaseUomId: "uom-1",
    salesUomId: "uom-2",
    conversionFactor: 1,
    reorderPoint: 100,
    standardCost: 45.0,
    sellingPrice: 65.0,
    vatApplicable: true,
    exciseApplicable: false,
    isActive: true,
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-06-10T10:30:00Z",
  },
  {
    id: "2",
    itemCode: "ITM-002",
    itemName: "Aluminium Sheet",
    sku: "ALS-2MM-002",
    categoryId: "cat-1",
    categoryName: "Raw Materials",
    itemType: "Raw Material",
    uomId: "uom-1",
    uomName: "kg",
    purchaseUomId: "uom-1",
    salesUomId: "uom-2",
    conversionFactor: 1,
    reorderPoint: 50,
    standardCost: 120.0,
    sellingPrice: 155.0,
    vatApplicable: true,
    exciseApplicable: false,
    isActive: true,
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-05-20T14:00:00Z",
  },
  {
    id: "3",
    itemCode: "ITM-003",
    itemName: "Copper Wire Spool",
    sku: "CWS-1MM-003",
    categoryId: "cat-2",
    categoryName: "Electrical Components",
    itemType: "Component",
    uomId: "uom-3",
    uomName: "roll",
    purchaseUomId: "uom-3",
    salesUomId: "uom-4",
    conversionFactor: 1,
    reorderPoint: 25,
    standardCost: 200.0,
    sellingPrice: 280.0,
    vatApplicable: true,
    exciseApplicable: true,
    isActive: true,
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z",
  },
  {
    id: "4",
    itemCode: "ITM-004",
    itemName: "Hydraulic Pump",
    sku: "HP-500-004",
    categoryId: "cat-3",
    categoryName: "Machinery Parts",
    itemType: "Finished Good",
    uomId: "uom-5",
    uomName: "unit",
    purchaseUomId: "uom-5",
    salesUomId: "uom-5",
    conversionFactor: 1,
    reorderPoint: 10,
    standardCost: 1500.0,
    sellingPrice: 2200.0,
    vatApplicable: true,
    exciseApplicable: false,
    isActive: false,
    createdAt: "2026-03-05T08:00:00Z",
    updatedAt: "2026-06-12T11:00:00Z",
  },
];

const itemTypes = ["Raw Material", "Component", "Finished Good", "Service"];
const statusOptions = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function ItemsPage() {
  const [data] = useState<Item[]>(mockItems);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Items" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name, code, or SKU...",
    },
    {
      type: "select",
      key: "categoryId",
      label: "Category",
      placeholder: "All Categories",
      options: [
        { label: "Raw Materials", value: "cat-1" },
        { label: "Electrical Components", value: "cat-2" },
        { label: "Machinery Parts", value: "cat-3" },
      ],
    },
    {
      type: "select",
      key: "itemType",
      label: "Item Type",
      placeholder: "All Types",
      options: itemTypes.map((t) => ({ label: t, value: t })),
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: statusOptions,
    },
  ];

  const columns: Column<Item>[] = [
    { key: "itemCode", label: "Item Code", sortable: true },
    { key: "itemName", label: "Item Name", sortable: true },
    { key: "sku", label: "SKU", sortable: true },
    {
      key: "categoryName",
      label: "Category",
      render: (value) => value ?? "—",
    },
    { key: "itemType", label: "Type", sortable: true },
    {
      key: "uomName",
      label: "UOM",
      render: (value) => value ?? "—",
    },
    {
      key: "standardCost",
      label: "Standard Cost",
      render: (value) =>
        `$${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      sortable: true,
    },
    {
      key: "sellingPrice",
      label: "Selling Price",
      render: (value) =>
        `$${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      sortable: true,
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
      label: "Print",
      onClick: (record) => console.log("Print", record.id),
    },
    {
      label: "Delete",
      color: colors.danger[600],
      onClick: (record) => console.log("Delete", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Items Found"
      message="There are no items to display. Create your first item to get started."
      action={{
        label: "Create Item",
        onClick: () => console.log("Create Item"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export items"),
    },
    {
      label: "Create Item",
      variant: "primary",
      onClick: () => console.log("Create Item"),
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
      {/* Page Header */}
      <PageHeader
        title="Items"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: `${spacing.card.gap}px`,
        }}
      >
        <MetricCard label="Total Items" value={data.length} />
        <MetricCard
          label="Active Items"
          value={data.filter((i) => i.isActive).length}
          color={colors.success[600]}
          borderColor={colors.success[500]}
        />
        <MetricCard
          label="Inactive Items"
          value={data.filter((i) => !i.isActive).length}
          color={colors.text.secondary}
          borderColor={colors.secondary[300]}
        />
      </div>

      {/* Filters */}
      <FilterCard
        title="Filter Items"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      {/* Search */}
      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, code, or SKU..."
        />
      </div>

      {/* Data Table */}
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
