"use client";

import React, { useState, useMemo } from "react";
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
import type { StockBalanceView } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

const stockData: StockBalanceView[] = [];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const STOCK_THRESHOLD = 100; // items with available <= threshold are "low stock"

function getStockStatus(item: StockBalanceView): string {
  if (item.available <= 0) return "out-of-stock";
  if (item.available <= STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

function formatCurrency(value: number): string {
  return `KSh ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function StockOverview() {
  const [data] = useState<StockBalanceView[]>(stockData);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Inventory", href: "/inventory" },
    { label: "Stock Overview" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: [
        { label: "Main Warehouse", value: "Main Warehouse" },
        { label: "Store B", value: "Store B" },
        { label: "Chemicals Store", value: "Chemicals Store" },
      ],
    },
    {
      type: "select",
      key: "category",
      label: "Category",
      placeholder: "All Categories",
      options: [
        { label: "Preforms", value: "Preforms" },
        { label: "Caps", value: "Caps" },
        { label: "Labels", value: "Labels" },
        { label: "Chemicals", value: "Chemicals" },
        { label: "Bottles", value: "Bottles" },
      ],
    },
    {
      type: "text",
      key: "search",
      label: "Search Item",
      placeholder: "Search by code or name...",
    },
  ];

  // Compute metrics
  const totalItems = data.length;
  const totalStockValue = data.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  );
  const lowStockCount = data.filter(
    (item) => item.available > 0 && item.available <= STOCK_THRESHOLD,
  ).length;
  const outOfStockCount = data.filter((item) => item.available <= 0).length;

  // Filter logic
  const filteredData = useMemo(() => {
    let result = [...data];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q),
      );
    }

    return result;
  }, [data, search]);

  const columns: Column<StockBalanceView>[] = [
    { key: "itemCode", label: "Item Code", sortable: true },
    { key: "itemName", label: "Item Name", sortable: true },
    { key: "category", label: "Category" },
    { key: "location", label: "Location" },
    {
      key: "quantity",
      label: "On Hand",
      sortable: true,
      render: (value) => (value as number).toLocaleString(),
    },
    {
      key: "reserved",
      label: "Reserved",
      render: (value) => (value as number).toLocaleString(),
    },
    {
      key: "available",
      label: "Available",
      sortable: true,
      render: (value, record) => (
        <span
          style={{
            color:
              (record as StockBalanceView).available <= 0
                ? colors.danger[600]
                : (record as StockBalanceView).available <= STOCK_THRESHOLD
                  ? colors.warning[600]
                  : colors.text.primary,
            fontWeight:
              (record as StockBalanceView).available <= 0 ||
              (record as StockBalanceView).available <= STOCK_THRESHOLD
                ? 600
                : 400,
          }}
        >
          {(value as number).toLocaleString()}
        </span>
      ),
    },
    {
      key: "unitCost",
      label: "Unit Cost",
      render: (value) => formatCurrency(value as number),
    },
    {
      key: "lastMovementDate",
      label: "Last Movement",
      render: (value) => {
        if (!value) return "—";
        return new Date(value as string).toLocaleDateString("en-KE", {
          dateStyle: "medium",
        });
      },
    },
    {
      key: "status",
      label: "Status",
      render: (_, record) => {
        const status = getStockStatus(record as StockBalanceView);
        if (status === "out-of-stock") {
          return <StatusBadge status="voided" />;
        }
        if (status === "low-stock") {
          return <StatusBadge status="pending" />;
        }
        return <StatusBadge status="active" />;
      },
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      onClick: (record) =>
        console.log(
          "View stock detail for",
          (record as StockBalanceView).itemCode,
        ),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Stock Items Found"
      message="There are no stock items matching your criteria."
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export stock data"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    setSearch("");
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
        title="Stock Overview"
        subtitle="Real-time view of all inventory stock balances"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      {/* Search Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by item code or name..."
        />
      </div>

      <FilterCard
        title="Filters"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: `${spacing.card.gap}px`,
        }}
      >
        <MetricCard
          label="Total Items"
          value={totalItems}
          color={colors.primary[700]}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Total Stock Value"
          value={formatCurrency(totalStockValue)}
          color={colors.success[700]}
          borderColor={colors.success[500]}
        />
        <MetricCard
          label="Low Stock Items"
          value={lowStockCount}
          color={colors.warning[600]}
          borderColor={colors.warning[500]}
        />
        <MetricCard
          label="Out of Stock"
          value={outOfStockCount}
          color={colors.danger[600]}
          borderColor={colors.danger[500]}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        actions={tableActions}
        emptyState={emptyState}
        pageSize={15}
      />
    </div>
  );
}
