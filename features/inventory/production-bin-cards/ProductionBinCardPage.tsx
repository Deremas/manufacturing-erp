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
import type { ProductionBinCardEntry } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const productionEntries: ProductionBinCardEntry[] = [];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function formatDateTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getMovementVariant(movementType: string): string {
  if (movementType === "PRODUCTION_OUTPUT") return "active";
  if (movementType === "PRODUCTION_ISSUE") return "voided";
  return "pending";
}

function getMovementLabel(movementType: string): string {
  const labels: Record<string, string> = {
    PRODUCTION_ISSUE: "Issue to Production",
    PRODUCTION_OUTPUT: "Production Output",
    WASTAGE: "Wastage",
  };
  return labels[movementType] ?? movementType;
}

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function ProductionBinCardPage() {
  const [data] = useState<ProductionBinCardEntry[]>(productionEntries);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Production Bin Cards" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "batch",
      label: "Batch / Lot No",
      placeholder: "Search batch number...",
    },
    {
      type: "select",
      key: "item",
      label: "Item",
      placeholder: "All Items",
      options: [
        { label: "Preform 28mm Clear", value: "Preform 28mm Clear" },
        { label: "Bottle 500ml Clear", value: "Bottle 500ml Clear" },
        { label: "Screw Cap 28mm White", value: "Screw Cap 28mm White" },
      ],
    },
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
  ];

  const columns: Column<ProductionBinCardEntry>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDateTime(value as string),
    },
    { key: "batchNo", label: "Batch No", sortable: true },
    { key: "item", label: "Item" },
    {
      key: "movementType",
      label: "Movement Type",
      render: (value) => (
        <StatusBadge status={getMovementVariant(value as string) as any} />
      ),
    },
    {
      key: "quantityIn",
      label: "In Qty",
      render: (value) =>
        (value as number) > 0 ? (
          <span style={{ color: colors.success[700], fontWeight: 600 }}>
            {(value as number).toLocaleString()}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "quantityOut",
      label: "Out Qty",
      render: (value) =>
        (value as number) > 0 ? (
          <span style={{ color: colors.danger[700], fontWeight: 600 }}>
            {(value as number).toLocaleString()}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      render: (value) => <strong>{(value as number).toLocaleString()}</strong>,
    },
    { key: "remarks", label: "Remarks" },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      onClick: (record) =>
        console.log("View entry", (record as ProductionBinCardEntry).batchNo),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Production Movements Found"
      message="No production-related stock movements found for the selected criteria."
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export production bin card"),
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
        title="Production Bin Cards"
        subtitle="Stock movements related to production batches and work orders"
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
