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
import type { BinCardEntry } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const binCards: BinCardEntry[] = [];

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

function getMovementBadgeVariant(movementType: string): string {
  const incoming = [
    "PURCHASE_RECEIPT",
    "TRANSFER_IN",
    "ADJUSTMENT_IN",
    "SALES_RETURN",
    "PRODUCTION_OUTPUT",
  ];
  const outgoing = [
    "PRODUCTION_ISSUE",
    "TRANSFER_OUT",
    "ADJUSTMENT_OUT",
    "SALES_OUT",
    "WASTAGE",
    "DAMAGE",
  ];
  if (incoming.includes(movementType)) return "active";
  if (outgoing.includes(movementType)) return "voided";
  return "pending";
}

function getMovementLabel(movementType: string): string {
  const labels: Record<string, string> = {
    PURCHASE_RECEIPT: "Purchase Receipt",
    PRODUCTION_ISSUE: "Production Issue",
    TRANSFER_OUT: "Transfer Out",
    TRANSFER_IN: "Transfer In",
    ADJUSTMENT_IN: "Adjustment In",
    ADJUSTMENT_OUT: "Adjustment Out",
    SALES_OUT: "Sales Out",
    SALES_RETURN: "Sales Return",
    WASTAGE: "Wastage",
    DAMAGE: "Damage",
    OPENING: "Opening Balance",
    RESERVATION: "Reservation",
    RELEASE_RESERVATION: "Reservation Release",
  };
  return labels[movementType] ?? movementType;
}

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function BinCardsPage() {
  const [data] = useState<BinCardEntry[]>(binCards);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Bin Cards" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "select",
      key: "item",
      label: "Item",
      placeholder: "Select Item",
      options: [
        { label: "Preform 28mm Clear (PREF-001)", value: "PREF-001" },
        { label: "Screw Cap 28mm White (CAP-001)", value: "CAP-001" },
        { label: "Label 500ml (LAB-001)", value: "LAB-001" },
      ],
    },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "Select Location",
      options: [
        { label: "Main Warehouse", value: "Main Warehouse" },
        { label: "Store B", value: "Store B" },
        { label: "Chemicals Store", value: "Chemicals Store" },
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

  const columns: Column<BinCardEntry>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDateTime(value as string),
    },
    {
      key: "movementType",
      label: "Movement Type",
      render: (value) => (
        <StatusBadge status={getMovementBadgeVariant(value as string) as any} />
      ),
    },
    { key: "documentRef", label: "Document Ref" },
    {
      key: "in",
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
      key: "out",
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
      label: "View Document",
      onClick: (record) =>
        console.log("View document", (record as BinCardEntry).documentRef),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Bin Card Entries"
      message="No movements recorded for the selected item and location."
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export bin card data"),
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
        title="Bin Cards"
        subtitle="Item movement history and running balance"
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

      {/* Item Detail Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          padding: "16px",
          backgroundColor: colors.surface,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div>
          <span
            style={{
              fontSize: "12px",
              color: colors.text.secondary,
              fontWeight: 500,
            }}
          >
            Item Code
          </span>
          <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: "14px" }}>
            PREF-001
          </p>
        </div>
        <div>
          <span
            style={{
              fontSize: "12px",
              color: colors.text.secondary,
              fontWeight: 500,
            }}
          >
            Item Name
          </span>
          <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: "14px" }}>
            Preform 28mm Clear
          </p>
        </div>
        <div>
          <span
            style={{
              fontSize: "12px",
              color: colors.text.secondary,
              fontWeight: 500,
            }}
          >
            Category
          </span>
          <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: "14px" }}>
            Preforms
          </p>
        </div>
        <div>
          <span
            style={{
              fontSize: "12px",
              color: colors.text.secondary,
              fontWeight: 500,
            }}
          >
            Current Balance
          </span>
          <p
            style={{
              margin: "4px 0 0",
              fontWeight: 700,
              fontSize: "16px",
              color: colors.primary[700],
            }}
          >
            15,000
          </p>
        </div>
      </div>

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
