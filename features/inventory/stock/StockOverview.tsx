"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  MetricCard,
  DataTable,
  StatusBadge,
  EmptyState,
  SearchInput,
} from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";
import type { StockBalanceView } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { formatCurrency } from "@/lib/utils/cn";
import { useSystemPreferences } from "@/lib/client/use-system-preferences";
import { History, Scale, Search, SquarePen, Trash2 } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

type Option = { label: string; value: string };

interface StockOverviewProps {
  initialData?: StockBalanceView[];
  locationOptions?: Option[];
  categoryOptions?: Option[];
  itemTypeOptions?: Option[];
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const STOCK_THRESHOLD = 100; // fallback when reorder point is not available

function getStockStatus(item: StockBalanceView): string {
  const threshold = item.lowStockAlertLevel ?? STOCK_THRESHOLD;
  if (item.available <= 0) return "out-of-stock";
  if (item.available <= threshold) return "low-stock";
  return "overstock";
}

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function StockOverview({
  initialData = [],
  locationOptions = [],
  categoryOptions = [],
}: StockOverviewProps) {
  const router = useRouter();
  const { currencyCode } = useSystemPreferences();
  const [data] = useState<StockBalanceView[]>(initialData);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const statusOptions = [
    { label: "All", value: "" },
    { label: "Low Stock", value: "low-stock" },
    { label: "Out of Stock", value: "out-of-stock" },
    { label: "Overstock", value: "overstock" },
  ];

  const handleClearFilters = () => {
    setSearch("");
    setLocationFilter("");
    setCategoryFilter("");
    setStatusFilter("");
  };

  const handleApplySearch = () => {
    setSearch((current) => current.trim());
  };

  // Compute metrics
  const totalItems = data.length;
  const totalStockValue = data.reduce(
    (sum, item) => sum + (item.totalValue ?? item.quantity * item.unitCost),
    0,
  );
  const lowStockCount = data.filter(
    (item) =>
      item.available > 0 &&
      item.available <= (item.lowStockAlertLevel ?? STOCK_THRESHOLD),
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

    if (locationFilter) {
      result = result.filter((item) => String(item.locationId ?? "") === locationFilter);
    }

    if (categoryFilter) {
      result = result.filter((item) => String(item.categoryId ?? "") === categoryFilter);
    }

    if (statusFilter) {
      result = result.filter((item) => getStockStatus(item) === statusFilter);
    }

    return result;
  }, [data, search, locationFilter, categoryFilter, statusFilter]);

  const columns: Column<StockBalanceView>[] = [
    {
      key: "itemCode",
      label: "Item Code",
      sortable: true,
      width: 96,
      render: (value) => (
        <span title={String(value ?? "")} style={{ display: "block" }}>
          {String(value ?? "—")}
        </span>
      ),
    },
    {
      key: "itemName",
      label: "Item Name",
      sortable: true,
      width: 170,
      render: (value) => (
        <span title={String(value ?? "")} style={{ display: "block" }}>
          {String(value ?? "—")}
        </span>
      ),
    },
    { key: "category", label: "Category", width: 120 },
    {
      key: "location",
      label: "Location",
      width: 130,
      render: (value) => (
        <span title={String(value ?? "")} style={{ display: "block" }}>
          {String(value ?? "—")}
        </span>
      ),
    },
    {
      key: "quantity",
      label: "On Hand",
      sortable: true,
      width: 84,
      align: "center",
      render: (value) => (value as number).toLocaleString(),
    },
    {
      key: "reserved",
      label: "Reserved",
      width: 84,
      align: "center",
      render: (value) => (value as number).toLocaleString(),
    },
    {
      key: "available",
      label: "Available",
      sortable: true,
      width: 90,
      align: "center",
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
      key: "uom",
      label: "Unit",
      width: 72,
      render: (value) => (
        <span title={String(value ?? "")} style={{ display: "block" }}>
          {String(value ?? "—")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: 84,
      align: "center",
      render: (_, record) => {
        const status = getStockStatus(record as StockBalanceView);
        if (status === "out-of-stock") {
          return <StatusBadge status="out-of-stock" />;
        }
        if (status === "low-stock") {
          return <StatusBadge status="low-stock" />;
        }
        return <StatusBadge status="overstock" />;
      },
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "Bin Card",
      icon: <History size={15} strokeWidth={2} />,
      style: {
        width: 38,
        height: 38,
        border: `1px solid ${colors.primary[300]}`,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        color: colors.primary[700],
      },
      href: (record) => {
        const row = record as StockBalanceView;
        const publicId = row.itemPublicId ?? row.itemId ?? "";
        return `/public/inventory/stock/view/${encodeURIComponent(String(publicId))}`;
      },
    },
    {
      label: "Adjust",
      icon: <Scale size={15} />,
      style: {
        width: 34,
        height: 34,
        border: `1px solid ${colors.secondary[200]}`,
        borderRadius: 10,
        backgroundColor: colors.surface,
        color: colors.secondary[500],
      },
      href: (record) => {
        const row = record as StockBalanceView;
        const itemPublicId = row.itemPublicId ?? "";
        const locationPublicId = row.locationPublicId ?? "";
        return `/inventory/adjustments/create?itemPublicId=${encodeURIComponent(String(itemPublicId))}&locationPublicId=${encodeURIComponent(String(locationPublicId))}`;
      },
    },
    {
      label: "Edit Item",
      icon: <SquarePen size={15} />,
      style: {
        width: 34,
        height: 34,
        border: `1px solid ${colors.secondary[200]}`,
        borderRadius: 10,
        backgroundColor: colors.surface,
        color: colors.secondary[500],
      },
      href: (record) => {
        const row = record as StockBalanceView;
        return `/master-data/items/${encodeURIComponent(String(row.itemId ?? ""))}/edit`;
      },
    },
    {
      label: "Delete",
      icon: <Trash2 size={15} />,
      color: colors.danger[600],
      style: {
        width: 34,
        height: 34,
        border: `1px solid ${colors.danger[200]}`,
        borderRadius: 10,
        backgroundColor: colors.danger[50],
        color: colors.danger[600],
      },
      onClick: async (record) => {
        const itemId = String((record as StockBalanceView).itemId ?? "");
        if (!itemId) return;
        const deleted = await deleteRecord(`/api/records/master-data/items/${itemId}`, "item");
        if (deleted) router.refresh();
      },
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Stock Items Found"
      message="There are no stock items matching your criteria."
    />
  );

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
          value={formatCurrency(totalStockValue, currencyCode)}
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "16px",
          border: `1px solid ${colors.border}`,
          borderRadius: "16px",
          backgroundColor: colors.surface,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(210px, 1.05fr) minmax(160px, 0.75fr) minmax(160px, 0.75fr) minmax(140px, 0.7fr) 108px 96px",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.text.secondary,
              }}
            >
              Search
            </span>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Item code or name..."
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.text.secondary,
              }}
            >
              Location
            </span>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              style={{
                height: "40px",
                width: "100%",
                padding: "0 12px",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "12px",
                backgroundColor: colors.surface,
                color: colors.text.primary,
                fontFamily: "inherit",
              }}
            >
              <option value="">All Locations</option>
              {locationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.text.secondary,
              }}
            >
              Category
            </span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={{
                height: "40px",
                width: "100%",
                padding: "0 12px",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "12px",
                backgroundColor: colors.surface,
                color: colors.text.primary,
                fontFamily: "inherit",
              }}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.text.secondary,
              }}
            >
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                height: "40px",
                width: "100%",
                padding: "0 12px",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "12px",
                backgroundColor: colors.surface,
                color: colors.text.primary,
                fontFamily: "inherit",
              }}
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleApplySearch}
            style={{
              height: "40px",
              padding: "0 18px",
              border: `1px solid ${colors.primary[600]}`,
              borderRadius: "12px",
              backgroundColor: colors.primary[500],
              color: colors.text.inverse,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Search size={16} />
            Search
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            style={{
              height: "40px",
              padding: "0 16px",
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              backgroundColor: colors.surface,
              color: colors.text.secondary,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        actions={tableActions}
        emptyState={emptyState}
        pageSize={25}
      />
    </div>
  );
}
