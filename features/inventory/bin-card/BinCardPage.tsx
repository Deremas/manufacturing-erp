"use client";

import React, { useMemo, useState } from "react";
import { PageHeader, FilterCard, DataTable, EmptyState } from "@/components/shared";
import type { FilterField, Column } from "@/components/shared";
import type { StockMovementRow } from "@/services/inventory/stock-movement.service";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Barcode, Tag } from "lucide-react";

type Option = { label: string; value: string };

interface BinCardPageProps {
  initialData?: StockMovementRow[];
  selectedItem?: {
    itemCode: string;
    itemName: string;
    itemTypeName?: string | null;
    categoryName?: string | null;
    uomCode?: string | null;
  } | null;
  selectedLocation?: {
    locationName: string;
  } | null;
  locationOptions?: Option[];
}

function formatMovementDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getMovementReason(record: StockMovementRow): string {
  const source = `${record.referenceType ?? ""} ${record.sourceModule ?? ""}`.toLowerCase();

  if (source.includes("sales")) return "Sales";
  if (source.includes("loading")) return "Loading Order";
  if (source.includes("grn") || source.includes("goodsreceipt") || source.includes("goods receipt")) return "GRN";
  if (source.includes("issue")) return "Issue";
  if (source.includes("production")) return "Production";
  if (source.includes("transfer")) return "Transfer";
  if (source.includes("adjust")) return "Adjustment";
  if (source.includes("return")) return "Return";

  return record.referenceType ?? record.sourceModule ?? "Movement";
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default function BinCardPage({
  initialData = [],
  selectedItem = null,
  selectedLocation = null,
  locationOptions = [],
}: BinCardPageProps) {
  const [data] = useState(initialData);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const displayedData = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [data],
  );

  const filteredData = useMemo(() => {
    let result = [...displayedData];

    if (filters.location) {
      result = result.filter((row) => row.locationId === filters.location);
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((row) => new Date(row.date) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((row) => new Date(row.date) <= to);
    }

    return result;
  }, [displayedData, filters]);

  const locationSummaries = useMemo(() => {
    const byLocation = new Map<
      string,
      { locationId: string; locationName: string; balance: number; row: StockMovementRow }
    >();

    for (const row of filteredData) {
      if (byLocation.has(row.locationId)) continue;
      byLocation.set(row.locationId, {
        locationId: row.locationId,
        locationName: row.locationName,
        balance: row.balanceAfter,
        row,
      });
    }

    return Array.from(byLocation.values());
  }, [filteredData]);

  const totalAvailableQty = locationSummaries.reduce((sum, entry) => sum + entry.balance, 0);
  const uomLabel = selectedItem?.uomCode ?? "";
  const itemTitle = selectedItem?.itemName ?? "Stock Movements";
  const itemCode = selectedItem?.itemCode ?? "";
  const itemCategory = selectedItem?.categoryName ?? selectedItem?.itemTypeName ?? "";

  const columns: Column<StockMovementRow>[] = [
    {
      key: "date",
      label: "Date/Time",
      width: 170,
      render: (value) => formatMovementDate(String(value ?? "")),
    },
    {
      key: "movementType",
      label: "Type",
      width: 74,
      align: "center",
      render: (_, record) => {
        const isIn = record.qtyIn > 0;
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 28,
              padding: "2px 8px",
              borderRadius: 999,
              backgroundColor: isIn ? "#ecfdf3" : "#fef3f2",
              color: isIn ? "#027a48" : "#b42318",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            {isIn ? "IN" : "OUT"}
          </span>
        );
      },
    },
    {
      key: "movementNumber",
      label: "Document",
      width: 160,
      render: (_, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{record.movementNumber}</span>
          <span style={{ fontSize: 11, color: colors.primary[700], fontWeight: 600 }}>
            {getMovementReason(record)}
          </span>
          {record.referenceNo && !isUuidLike(record.referenceNo) ? (
            <span style={{ fontSize: 10, color: colors.text.secondary }}>
              {record.referenceNo}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: "locationName", label: "Location", width: 120, wrap: true },
    {
      key: "qtyIn",
      label: "IN",
      width: 92,
      align: "center",
      render: (value) => {
        const amount = Number(value ?? 0);
        return amount > 0 ? (
          <span style={{ color: "#027a48", fontWeight: 700 }}>
            +{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          "-"
        );
      },
    },
    {
      key: "qtyOut",
      label: "OUT",
      width: 92,
      align: "center",
      render: (value) => {
        const amount = Number(value ?? 0);
        return amount > 0 ? (
          <span style={{ color: "#b42318", fontWeight: 700 }}>
            -{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          "-"
        );
      },
    },
    {
      key: "createdByName",
      label: "User",
      width: 200,
      wrap: true,
      render: (value) => String(value ?? "-"),
    },
    {
      key: "remarks",
      label: "Remarks",
      width: 260,
      wrap: true,
      render: (value) => String(value ?? "-"),
    },
  ];

  const filterFields: FilterField[] = [
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: locationOptions,
    },
    { type: "date", key: "dateFrom", label: "From Date" },
    { type: "date", key: "dateTo", label: "To Date" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Stock Card / Bin Card"
        subtitle="Complete movement history for this item"
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "18px 20px",
          borderRadius: 14,
          background: `linear-gradient(90deg, ${colors.primary[700]}, ${colors.primary[600]})`,
          color: colors.surface,
          boxShadow: "0 8px 20px rgba(15, 118, 110, 0.18)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            <span style={{ color: "#111827" }}>{itemTitle}</span>
          </div>
          {itemCode ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: 0.9, marginBottom: 2 }}>
              <Barcode size={14} strokeWidth={2} />
              <span>{itemCode}</span>
            </div>
          ) : null}
          {itemCategory ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: 0.9 }}>
              <Tag size={14} strokeWidth={2} />
              <span>{itemCategory}</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
              {totalAvailableQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Total Stock{uomLabel ? ` (${uomLabel})` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 70 }}>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
              {locationSummaries.length}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Locations</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 16,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          backgroundColor: colors.surface,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
          Stock by Location
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {locationSummaries.map((entry) => (
            <div
              key={entry.locationId}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: "10px 12px",
                backgroundColor: "#fff",
                minWidth: 150,
                flex: "0 1 170px",
              }}
            >
              <div style={{ fontSize: 11, color: colors.text.secondary, marginBottom: 6 }}>
                {entry.locationName}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: colors.primary[700], lineHeight: 1.1 }}>
                {entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 10, color: colors.text.secondary, marginTop: 4 }}>
                {uomLabel || "Qty"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FilterCard
        title="Filters"
        fields={filterFields}
        onFilter={(values) => setFilters(values)}
        onReset={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        emptyState={<EmptyState title="No Bin Card Entries" message="Select an item to view its bin card." />}
        pageSize={15}
      />
    </div>
  );
}
