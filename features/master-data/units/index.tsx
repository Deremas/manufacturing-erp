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
import type { Unit } from "../types";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockUnits: Unit[] = [
  {
    id: "uom-1",
    name: "Kilogram",
    abbreviation: "kg",
    type: "Weight",
    isActive: true,
  },
  {
    id: "uom-2",
    name: "Gram",
    abbreviation: "g",
    type: "Weight",
    isActive: true,
  },
  {
    id: "uom-3",
    name: "Roll",
    abbreviation: "rl",
    type: "Quantity",
    isActive: true,
  },
  {
    id: "uom-4",
    name: "Meter",
    abbreviation: "m",
    type: "Length",
    isActive: true,
  },
  {
    id: "uom-5",
    name: "Unit",
    abbreviation: "unit",
    type: "Quantity",
    isActive: true,
  },
  {
    id: "uom-6",
    name: "Liter",
    abbreviation: "L",
    type: "Volume",
    isActive: true,
  },
  {
    id: "uom-7",
    name: "Piece",
    abbreviation: "pc",
    type: "Quantity",
    isActive: false,
  },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function UnitsPage() {
  const [data] = useState<Unit[]>(mockUnits);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Units of Measure" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name or abbreviation...",
    },
    {
      type: "select",
      key: "type",
      label: "Type",
      placeholder: "All Types",
      options: [
        { label: "Weight", value: "Weight" },
        { label: "Volume", value: "Volume" },
        { label: "Length", value: "Length" },
        { label: "Quantity", value: "Quantity" },
      ],
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

  const columns: Column<Unit>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "abbreviation", label: "Abbreviation", sortable: true },
    { key: "type", label: "Type", sortable: true },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "Edit",
      onClick: (record) => console.log("Edit", record.id),
    },
    {
      label: "Delete",
      onClick: (record) => console.log("Delete", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Units Found"
      message="There are no units of measure to display. Create your first unit to get started."
      action={{
        label: "Create Unit",
        onClick: () => console.log("Create Unit"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export units"),
    },
    {
      label: "Create Unit",
      variant: "primary",
      onClick: () => console.log("Create Unit"),
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
        title="Units of Measure"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Units"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or abbreviation..."
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
