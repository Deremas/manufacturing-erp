"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import type { StockBalanceRow } from "@/services/inventory/stock-balance.service";
import { ArrowLeftRight, Clock3, ClipboardList, History, Info, Search, X } from "lucide-react";

type Option = { label: string; value: string };

type BinCardRow = StockBalanceRow & { movementCount: number };

type BinCardGroup = {
  row: BinCardRow;
  quantity: number;
  totalValue: number;
  movementCount: number;
  lastMovementDate: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function BinCardsDashboardPage({
  initialData,
  locationOptions = [],
  categoryOptions = [],
}: {
  initialData: BinCardRow[];
  locationOptions?: Option[];
  categoryOptions?: Option[];
}) {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const totals = useMemo(() => {
    const totalMovements = initialData.reduce((sum, row) => sum + Number(row.movementCount ?? 0), 0);
    return {
      totalItems: new Set(initialData.map((row) => row.itemId)).size,
      totalMovements,
    };
  }, [initialData]);

  const groupedCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredRows = initialData.filter((row) => {
      if (locationFilter && String(row.locationId) !== locationFilter) return false;
      if (categoryFilter && String(row.categoryId ?? "") !== categoryFilter) return false;
      if (!q) return true;
      return [row.itemCode, row.itemName, row.categoryName, row.locationName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
    const groups = new Map<string, BinCardGroup>();
    for (const row of filteredRows) {
      const current = groups.get(row.itemId);
      if (!current) {
        groups.set(row.itemId, {
          row,
          quantity: Number(row.quantity ?? 0),
          totalValue: Number(row.totalValue ?? row.quantity * row.averageCost),
          movementCount: Number(row.movementCount ?? 0),
          lastMovementDate: row.lastMovementDate,
        });
        continue;
      }

      current.quantity += Number(row.quantity ?? 0);
      current.totalValue += Number(row.totalValue ?? row.quantity * row.averageCost);
      current.movementCount += Number(row.movementCount ?? 0);
      if (!current.lastMovementDate || (row.lastMovementDate && new Date(row.lastMovementDate) > new Date(current.lastMovementDate))) {
        current.lastMovementDate = row.lastMovementDate;
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.row.itemName.localeCompare(b.row.itemName));
  }, [initialData, search, locationFilter, categoryFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClipboardList size={24} strokeWidth={2.1} color={colors.primary[700]} />
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.1,
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            Digital Bin Cards
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 15, color: colors.text.secondary }}>
          Complete movement history for all inventory items
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 20px",
          borderRadius: 14,
          background: "linear-gradient(90deg, #008F81, #006F61)",
          color: colors.surface,
        }}
      >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Info size={22} strokeWidth={2.2} />
              <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.1 }}>Bin Card System</div>
            </div>
            <div style={{ fontSize: 15, opacity: 0.95 }}>Track every item movement in and out of inventory</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 88 }}>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{totals.totalItems}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Active Items</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 112 }}>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{totals.totalMovements.toLocaleString()}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Total Movements</div>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.components.card,
          padding: `${spacing.card.padding}px`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1.6fr) minmax(160px, 0.95fr) minmax(160px, 0.95fr) auto auto",
            gap: 18,
            alignItems: "end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: typography.weights.medium,
                color: colors.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Search
            </label>
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Item code or name..."
              style={{
                width: "100%",
                minHeight: 46,
                padding: "10px 12px",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: radius.components.input,
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.body.fontSize,
                color: colors.text.primary,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: typography.weights.medium,
                color: colors.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={{
                width: "100%",
                minHeight: 46,
                padding: "10px 12px",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: radius.components.input,
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.body.fontSize,
                color: colors.text.primary,
                backgroundColor: colors.surface,
              }}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: typography.weights.medium,
                color: colors.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Location
            </label>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              style={{
                width: "100%",
                minHeight: 46,
                padding: "10px 12px",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: radius.components.input,
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.body.fontSize,
                color: colors.text.primary,
                backgroundColor: colors.surface,
              }}
            >
              <option value="">All Locations</option>
              {locationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setSearch(searchDraft.trim())}
            style={{
              width: 134,
              minHeight: 46,
              borderRadius: 9,
              border: `1px solid ${colors.primary[600]}`,
              backgroundColor: colors.primary[600],
              color: colors.text.inverse,
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.small.fontSize,
              fontWeight: typography.weights.semibold,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <Search size={16} />
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              setSearch("");
              setLocationFilter("");
              setCategoryFilter("");
            }}
            style={{
              width: 118,
              minHeight: 46,
              borderRadius: 9,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.text.secondary,
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.small.fontSize,
              fontWeight: typography.weights.semibold,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <X size={17} strokeWidth={2.2} />
            Clear
          </button>
        </div>
      </div>

      {groupedCards.length === 0 ? (
        <EmptyState title="No Bin Cards Found" message="No inventory items match the current filters." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
          className="bin-cards-grid"
        >
          {groupedCards.map((group) => {
            const row = group.row;
            const viewHref = `/inventory/bin-card?itemPublicId=${encodeURIComponent(String(row.itemPublicId))}${locationFilter ? `&locationId=${encodeURIComponent(locationFilter)}` : ""}`;
            return (
              <div
                key={row.itemId}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  minHeight: 207,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colors.text.primary, lineHeight: 1.2 }}>
                      {row.itemName}
                    </div>
                    <div style={{ fontSize: 12, color: colors.primary[700], marginTop: 4, fontWeight: 600 }}>{row.itemCode}</div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 132 }}>
                    <div style={{ textAlign: "right", fontWeight: 800, fontSize: 26, color: colors.text.primary, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {group.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2, textAlign: "right" }}>
                      {row.uomName ?? row.uomCode ?? "Qty"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignSelf: "flex-start",
                    padding: "4px 8px",
                    borderRadius: 8,
                    backgroundColor: "#f3f4f6",
                    color: colors.text.secondary,
                    fontSize: 11,
                    fontWeight: 700,
                    marginTop: 8,
                  }}
                >
                  {row.categoryName ?? "Uncategorized"}
                </div>

                <div style={{ height: 1, backgroundColor: "#e5e7eb", marginTop: 14, marginBottom: 16 }} />

                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, color: colors.text.secondary, fontSize: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <ArrowLeftRight size={15} strokeWidth={2} />
                      {group.movementCount} movements
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Clock3 size={15} strokeWidth={2} />
                      Last: {formatDate(group.lastMovementDate)}
                    </span>
                  </div>

                  <Link
                    href={viewHref}
                    style={{
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "center",
                      width: 128,
                      height: 42,
                      borderRadius: 9,
                      border: `1px solid ${colors.primary[600]}`,
                      backgroundColor: "#008F81",
                      color: colors.text.inverse,
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    View Card <History size={18} color="#ffffff" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style jsx global>{`
        @media (max-width: 1100px) {
          .bin-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .bin-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
