"use client";

import React, { useState } from "react";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  ActionButtons,
  PrintButton,
  ExportDropdown,
} from "@/components/shared";
import type {
  Breadcrumb,
  FilterField,
  Column,
  TableAction,
  Action,
  ExportFormat,
} from "@/components/shared";
import type { SRVRecord } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const srvRecords: SRVRecord[] = [];

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
export default function SRVCardPage() {
  const [data] = useState<SRVRecord[]>(srvRecords);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Supplier Return Voucher" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "date",
      key: "dateFrom",
      label: "From Date",
    },
    {
      type: "date",
      key: "dateTo",
      label: "To Date",
    },
    {
      type: "select",
      key: "supplier",
      label: "Supplier",
      placeholder: "All Suppliers",
      options: [
        { label: "ABC Chemicals Ltd", value: "ABC Chemicals Ltd" },
        { label: "Plastic Suppliers Ltd", value: "Plastic Suppliers Ltd" },
        { label: "Label Printers Ltd", value: "Label Printers Ltd" },
      ],
    },
    {
      type: "select",
      key: "item",
      label: "Item",
      placeholder: "All Items",
      options: [
        { label: "Preform 28mm Clear", value: "Preform 28mm Clear" },
        { label: "Chlorine 25kg Drum", value: "Chlorine 25kg Drum" },
        { label: "Label 500ml", value: "Label 500ml" },
      ],
    },
  ];

  const columns: Column<SRVRecord>[] = [
    {
      key: "returnNumber",
      label: "SRV No",
      sortable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    { key: "supplier", label: "Supplier" },
    { key: "item", label: "Item" },
    {
      key: "quantity",
      label: "Quantity",
      sortable: true,
      render: (value) => (value as number).toLocaleString(),
    },
    { key: "reason", label: "Reason" },
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
      onClick: (record) => console.log("View SRV", (record as SRVRecord).id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No SRV Records Found"
      message="There are no supplier return vouchers to display."
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export SRV data"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    console.log("Filters reset");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: ExportFormat) => {
    console.log("Export as", format);
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
        title="Suppliers Return Voucher (SRV)"
        subtitle="Track materials returned to suppliers"
        breadcrumbs={breadcrumbs}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <PrintButton onPrint={handlePrint} />
            <ExportDropdown onExport={handleExport} />
            <ActionButtons actions={pageActions} />
          </div>
        }
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
