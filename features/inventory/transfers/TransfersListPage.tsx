"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, EmptyState, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { ArrowRightLeft, CircleCheck, Eye, FileText, List, Plus, Search, Truck, X } from "lucide-react";
import { publicViewUrl } from "@/lib/routing/urls";

export type TransferListRow = {
  id: string;
  publicId: number;
  number: string;
  date: string;
  status: string;
  itemCount: number;
  primaryText: string;
  secondaryText?: string;
  ownerText?: string;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status: string) {
  switch (String(status).toUpperCase()) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
    case "APPROVED":
      return "In Transit";
    case "POSTED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

function statusBadge(status: string) {
  switch (String(status).toUpperCase()) {
    case "DRAFT":
      return "draft";
    case "SUBMITTED":
    case "APPROVED":
      return "pending";
    case "POSTED":
      return "completed";
    case "CANCELLED":
    case "REJECTED":
      return "voided";
    default:
      return "inactive";
  }
}

function cardIconStyle(bg: string, fg: string): React.CSSProperties {
  return {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: bg,
    color: fg,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

export default function TransfersListPage({ rows }: { rows: TransferListRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .map((row) => row.status)
      .filter((value) => {
        const key = String(value).toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((value) => ({ value, label: statusLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const summary = useMemo(() => {
    const draft = rows.filter((row) => String(row.status).toUpperCase() === "DRAFT").length;
    const inTransit = rows.filter((row) => ["SUBMITTED", "APPROVED"].includes(String(row.status).toUpperCase())).length;
    const completed = rows.filter((row) => String(row.status).toUpperCase() === "POSTED").length;
    return { total: rows.length, draft, inTransit, completed };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (dateFrom && new Date(row.date) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(row.date) > to) return false;
      }
      if (status && String(row.status) !== status) return false;
      if (!q) return true;
      return [row.number, row.primaryText, row.secondaryText, row.ownerText, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, search, dateFrom, dateTo, status]);

  const columns: Column<TransferListRow>[] = [
    {
      key: "number",
      label: "Transfer No",
      width: 150,
      render: (value, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 700, color: colors.text.primary, whiteSpace: "nowrap" }}>{String(value)}</span>
          <span style={{ fontSize: 11, color: colors.text.secondary }}>{record.itemCount} items</span>
        </div>
      ),
    },
    { key: "date", label: "Date", width: 130, render: (value) => formatDate(String(value)) },
    {
      key: "primaryText",
      label: "From Location",
      width: 180,
      wrap: true,
      render: (_, record) => <span style={{ fontWeight: 600 }}>{record.primaryText}</span>,
    },
    {
      key: "secondaryText",
      label: "To Location",
      width: 180,
      wrap: true,
      render: (_, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{record.secondaryText ?? "-"}</span>
        </div>
      ),
    },
    {
      key: "itemCount",
      label: "Items",
      width: 84,
      align: "center",
      render: (value) => <strong>{Number(value ?? 0).toLocaleString()}</strong>,
    },
    { key: "ownerText", label: "Created By", width: 160, wrap: true },
    {
      key: "status",
      label: "Status",
      width: 104,
      align: "center",
      render: (value) => <StatusBadge status={statusBadge(String(value)) as never} label={statusLabel(String(value))} />,
    },
    {
      key: "__action",
      label: "Action",
      width: 96,
      align: "center",
      render: (_, record) => (
        <Link
          href={publicViewUrl("inventory.transfer", record.publicId)}
          title="View"
          aria-label="View"
          style={{
            width: 34,
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: `1px solid ${colors.primary[200]}`,
            color: colors.primary[700],
            textDecoration: "none",
            backgroundColor: colors.primary[50],
          }}
        >
          <Eye size={16} />
        </Link>
      ),
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatus("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: colors.primary[700] }}>
            <ArrowRightLeft size={28} strokeWidth={2.2} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: colors.text.primary }}>Stock Transfers</h1>
            <p style={{ margin: "4px 0 0", color: colors.text.secondary, fontSize: 15 }}>Transfer inventory between locations</p>
          </div>
        </div>
        <Link
          href="/inventory/transfers/create"
          style={{
            height: 46,
            minWidth: 170,
            padding: "0 18px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 10,
            backgroundColor: colors.primary[600],
            color: colors.text.inverse,
            textDecoration: "none",
            fontWeight: 700,
            boxShadow: "0 8px 18px rgba(0, 137, 123, 0.14)",
          }}
        >
          <Plus size={16} />
          New Transfer
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        {[
          { label: "Total Transfers", value: summary.total, icon: <ArrowRightLeft size={26} />, bg: "#e6faf7", fg: "#0f8f81" },
          { label: "Draft", value: summary.draft, icon: <FileText size={26} />, bg: "#fff3e6", fg: "#ea6900" },
          { label: "In Transit", value: summary.inTransit, icon: <Truck size={26} />, bg: "#e8f6fb", fg: "#0f9ba0" },
          { label: "Completed", value: summary.completed, icon: <CircleCheck size={26} />, bg: "#e7f7ea", fg: "#20833d" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              minHeight: 112,
              padding: 18,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={cardIconStyle(card.bg, card.fg)}>{card.icon}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: colors.text.primary }}>{card.value}</div>
              <div style={{ fontSize: 14, color: colors.text.secondary }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 18,
            alignItems: "end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: colors.text.secondary }}>From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={filterInputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: colors.text.secondary }}>To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={filterInputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: colors.text.secondary }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
              <option value="">All Status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 2" }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: colors.text.secondary }}>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transfer no, location, or status..."
              style={filterInputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
            <button
              type="button"
              onClick={() => {}}
              style={{
                ...filterButtonStyle,
                width: 126,
              }}
            >
              <Search size={16} />
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                ...clearButtonStyle,
                width: 112,
              }}
            >
              <X size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.text.primary }}>
            <List size={16} color={colors.primary[700]} />
            Transfer List
          </div>
          <span
            style={{
              backgroundColor: colors.primary[600],
              color: colors.text.inverse,
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {filteredRows.length} records
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {rows.length === 0 ? (
              <EmptyState
                icon={<ArrowRightLeft size={40} />}
                title="No Transfers Found"
                message="Create your first stock transfer to move inventory between locations."
                action={{ label: "+ Create Transfer", onClick: () => router.push("/inventory/transfers/create") }}
              />
            ) : (
              <EmptyState
                icon={<ArrowRightLeft size={40} />}
                title="No transfers match your filters"
                message="Try clearing the filters to see more transfer records."
                action={{ label: "Clear Filters", onClick: clearFilters }}
              />
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredRows}
            emptyState={<EmptyState title="No Transfers Found" message="No transfer records were returned." />}
            pageSize={15}
          />
        )}
      </div>
    </div>
  );
}

const filterInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 9,
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const filterButtonStyle: React.CSSProperties = {
  minHeight: 44,
  border: "none",
  borderRadius: 9,
  backgroundColor: colors.primary[600],
  color: colors.text.inverse,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: 700,
  cursor: "pointer",
};

const clearButtonStyle: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 9,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.text.secondary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: 700,
  cursor: "pointer",
};
