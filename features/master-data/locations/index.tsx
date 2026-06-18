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
import type { Location } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockLocations: Location[] = [
  {
    id: "loc-1",
    locationCode: "WH-MAIN",
    locationName: "Main Warehouse",
    locationType: "Warehouse",
    address: "100 Industrial Area, Nairobi",
    isActive: true,
  },
  {
    id: "loc-2",
    locationCode: "WH-EAST",
    locationName: "East Side Warehouse",
    locationType: "Warehouse",
    address: "200 East Road, Mombasa",
    isActive: true,
  },
  {
    id: "loc-3",
    locationCode: "STORE-PROD",
    locationName: "Production Floor Store",
    locationType: "Store",
    address: "Factory Building 1, Ground Floor",
    isActive: true,
  },
  {
    id: "loc-4",
    locationCode: "YARD-01",
    locationName: "Open Yard Storage",
    locationType: "Yard",
    address: "Outer Ring Road, Nairobi",
    isActive: false,
  },
  {
    id: "loc-5",
    locationCode: "COLD-01",
    locationName: "Cold Storage Facility",
    locationType: "Cold Room",
    address: "Warehouse Complex, Section C",
    isActive: true,
  },
];

const locationTypeOptions = [
  { label: "Warehouse", value: "Warehouse" },
  { label: "Store", value: "Store" },
  { label: "Yard", value: "Yard" },
  { label: "Cold Room", value: "Cold Room" },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function LocationsPage() {
  const [data] = useState<Location[]>(mockLocations);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Locations" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by code or name...",
    },
    {
      type: "select",
      key: "locationType",
      label: "Location Type",
      placeholder: "All Types",
      options: locationTypeOptions,
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

  const columns: Column<Location>[] = [
    { key: "locationCode", label: "Code", sortable: true },
    { key: "locationName", label: "Name", sortable: true },
    { key: "locationType", label: "Type", sortable: true },
    {
      key: "address",
      label: "Address",
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
      title="No Locations Found"
      message="There are no locations to display. Create your first location to get started."
      action={{
        label: "Create Location",
        onClick: () => console.log("Create Location"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export locations"),
    },
    {
      label: "Create Location",
      variant: "primary",
      onClick: () => console.log("Create Location"),
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
        title="Locations"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Locations"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by code or name..."
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
