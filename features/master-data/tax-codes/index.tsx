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
import type { TaxCode } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockTaxCodes: TaxCode[] = [
  {
    id: "tax-1",
    taxName: "VAT Standard",
    taxType: "VAT",
    rate: 16.0,
    isActive: true,
  },
  {
    id: "tax-2",
    taxName: "VAT Reduced",
    taxType: "VAT",
    rate: 8.0,
    isActive: true,
  },
  {
    id: "tax-3",
    taxName: "Excise Duty",
    taxType: "Excise",
    rate: 10.0,
    isActive: true,
  },
  {
    id: "tax-4",
    taxName: "Withholding Tax",
    taxType: "Withholding",
    rate: 5.0,
    isActive: true,
  },
  {
    id: "tax-5",
    taxName: "Import Duty",
    taxType: "Customs",
    rate: 25.0,
    isActive: false,
  },
  {
    id: "tax-6",
    taxName: "VAT Zero Rated",
    taxType: "VAT",
    rate: 0.0,
    isActive: true,
  },
];

const taxTypeOptions = [
  { label: "VAT", value: "VAT" },
  { label: "Excise", value: "Excise" },
  { label: "Withholding", value: "Withholding" },
  { label: "Customs", value: "Customs" },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function TaxCodesPage() {
  const [data] = useState<TaxCode[]>(mockTaxCodes);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Tax Codes" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by tax name...",
    },
    {
      type: "select",
      key: "taxType",
      label: "Tax Type",
      placeholder: "All Types",
      options: taxTypeOptions,
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

  const columns: Column<TaxCode>[] = [
    { key: "taxName", label: "Name", sortable: true },
    { key: "taxType", label: "Type", sortable: true },
    {
      key: "rate",
      label: "Rate (%)",
      render: (value) => `${(value as number).toFixed(1)}%`,
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
      label: "Delete",
      color: colors.danger[600],
      onClick: (record) => console.log("Delete", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Tax Codes Found"
      message="There are no tax codes to display. Create your first tax code to get started."
      action={{
        label: "Create Tax Code",
        onClick: () => console.log("Create Tax Code"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export tax codes"),
    },
    {
      label: "Create Tax Code",
      variant: "primary",
      onClick: () => console.log("Create Tax Code"),
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
        title="Tax Codes"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Tax Codes"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by tax name..."
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
