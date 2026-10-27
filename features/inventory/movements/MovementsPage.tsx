"use client";

import React, { useMemo, useState } from "react";
import {
  PageHeader,
  FilterCard,
  DataTable,
  EmptyState,
} from "@/components/shared";
import type { FilterField, Column } from "@/components/shared";
import type { StockMovementRow } from "@/services/inventory/stock-movement.service";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";

type Option = { label: string; value: string };

interface MovementsPageProps {
  initialData?: StockMovementRow[];
  itemOptions?: Option[];
  locationOptions?: Option[];
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function formatShortReference(value: string | null | undefined): string {
  if (!value) return "-";
  if (!isUuidLike(value) && value.length <= 28) return value;
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getMovementLabel(record: StockMovementRow): string {
  const raw = `${record.movementType ?? ""} ${record.sourceModule ?? ""} ${record.referenceType ?? ""}`.toLowerCase();

  if (raw.includes("opening")) return "Opening Stock";
  if (raw.includes("purchase") && (raw.includes("receipt") || raw.includes("grn"))) return "Purchase Receipt";
  if (raw.includes("production") && (raw.includes("receipt") || raw.includes("in"))) return "Production Receipt";
  if (raw.includes("sales") && (raw.includes("issue") || raw.includes("dispatch"))) return "Sales Dispatch";
  if (raw.includes("issue")) return "Stock Issue";
  if (raw.includes("transfer")) return "Stock Transfer";
  if (raw.includes("return")) return "Stock Return";
  if (raw.includes("adjust")) return "Stock Adjustment";
  if (raw.includes("receipt") || raw.includes("receive")) return "Receipt";
  return record.movementType || "Movement";
}

function getMovementTone(record: StockMovementRow): { background: string; color: string } {
  const label = getMovementLabel(record).toLowerCase();
  if (label.includes("receipt") || label.includes("opening")) return { background: "#ecfdf3", color: "#027a48" };
  if (label.includes("issue") || label.includes("dispatch")) return { background: "#fef3f2", color: "#b42318" };
  if (label.includes("transfer")) return { background: "#eff8ff", color: "#175cd3" };
  if (label.includes("adjust")) return { background: "#fff7ed", color: "#b54708" };
  return { background: "#f3f4f6", color: colors.text.secondary };
}

export default function MovementsPage({
  initialData = [],
  itemOptions = [],
  locationOptions = [],
}: MovementsPageProps) {
  const [data] = useState(initialData);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterFields: FilterField[] = [
    { type: "date", key: "dateFrom", label: "From Date" },
    { type: "date", key: "dateTo", label: "To Date" },
    {
      type: "select",
      key: "item",
      label: "Item",
      placeholder: "All Items",
      options: itemOptions,
    },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: locationOptions,
    },
    {
      type: "select",
      key: "movementType",
      label: "Movement Type",
      placeholder: "All Types",
      options: Array.from(
        new Map(
          data.map((row) => {
            const label = getMovementLabel(row);
            return [label, { label, value: label }];
          }),
        ).values(),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      type: "text",
      key: "reference",
      label: "Reference",
      placeholder: "Search ref, number, module...",
    },
  ];

  const filteredData = useMemo(() => {
    let result = [...data];

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((row) => new Date(row.date) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((row) => new Date(row.date) <= to);
    }

    if (filters.item) {
      result = result.filter((row) => row.itemId === filters.item);
    }

    if (filters.location) {
      result = result.filter((row) => row.locationId === filters.location);
    }

    if (filters.movementType) {
      result = result.filter((row) => getMovementLabel(row) === filters.movementType);
    }

    if (filters.reference) {
      const q = filters.reference.trim().toLowerCase();
      result = result.filter((row) =>
        [row.movementNumber, row.referenceNo, row.referenceType, row.sourceModule, row.sourceDocumentId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }

    return result;
  }, [data, filters]);

  const columns: Column<StockMovementRow>[] = [
    {
      key: "date",
      label: "Date",
      width: 168,
      render: (value) => formatDateTime(value as string),
    },
    {
      key: "movementNumber",
      label: "Reference",
      width: 168,
      wrap: true,
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: colors.text.primary }} title={record.movementNumber}>
          {record.movementNumber}
        </span>
      ),
    },
    {
      key: "itemCode",
      label: "Item",
      width: 220,
      wrap: true,
      render: (_, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span
            title={record.itemName}
            style={{
              fontWeight: 600,
              color: colors.text.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {record.itemName}
          </span>
          <span style={{ fontSize: 11, color: colors.primary[700], fontWeight: 600 }}>
            {record.itemCode}
          </span>
        </div>
      ),
    },
    {
      key: "movementType",
      label: "Movement",
      width: 148,
      wrap: true,
      render: (_, record) => {
        const label = getMovementLabel(record);
        const tone = getMovementTone(record);
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 999,
              backgroundColor: tone.background,
              color: tone.color,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </span>
        );
      },
    },
    {
      key: "locationName",
      label: "Location",
      width: 140,
      wrap: true,
      render: (_, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span title={record.locationName} style={{ fontWeight: 500, color: colors.text.primary }}>
            {record.locationName}
          </span>
          <span style={{ fontSize: 11, color: colors.text.secondary }}>{record.locationCode}</span>
        </div>
      ),
    },
    {
      key: "qtyIn",
      label: "Qty In",
      width: 84,
      align: "right",
      render: (value) => {
        const amount = Number(value ?? 0);
        return amount > 0 ? (
          <span style={{ color: "#027a48", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          "-"
        );
      },
    },
    {
      key: "qtyOut",
      label: "Qty Out",
      width: 92,
      align: "right",
      render: (value) => {
        const amount = Number(value ?? 0);
        return amount > 0 ? (
          <span style={{ color: "#b42318", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          "-"
        );
      },
    },
    {
      key: "balanceAfter",
      label: "Balance",
      width: 100,
      align: "right",
      render: (value) => (
        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
          {Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </strong>
      ),
    },
    {
      key: "createdByName",
      label: "User",
      width: 130,
      wrap: true,
      render: (value) => (
        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
          <span
            title={String(value ?? "-")}
            style={{
              display: "block",
              fontWeight: 600,
              color: colors.text.primary,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {String(value ?? "-")}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px`, minWidth: 0 }}>
      <PageHeader
        title="Stock Movements"
        subtitle="Inventory ledger across all modules"
      />

      <FilterCard
        title="Filters"
        fields={filterFields}
        onFilter={(values) => setFilters(values)}
        onReset={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        emptyState={<EmptyState title="No Movements Found" message="There are no stock movements to display." />}
        pageSize={15}
      />
    </div>
  );
}
