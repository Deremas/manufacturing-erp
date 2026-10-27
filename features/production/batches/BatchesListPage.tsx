"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleCheck, Eye, Factory, Layers, List, Search, ShieldAlert, X } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { publicViewUrl } from "@/lib/routing/urls";
import { formatNumberDisplay } from "@/lib/utils/format-number";

export type ProductionBatchListRow = {
  id: string;
  publicId: number;
  batchNo: string;
  sessionPublicId: number;
  sessionNo: string;
  shiftCode: string;
  productionDate: string;
  locationName: string;
  finishedGoodCode: string;
  finishedGoodName: string;
  producedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  wastageQty: number;
  status: string;
  machineName: string | null;
};

const STATUS_ORDER = ["DRAFT", "ACTIVE", "PENDING_QC", "COMPLETED", "POSTED", "RELEASED", "REWORK", "REJECTED", "CANCELLED"];

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
    case "ACTIVE":
      return "Active";
    case "PENDING_QC":
      return "Pending QC";
    case "COMPLETED":
      return "Completed";
    case "POSTED":
      return "Posted";
    case "RELEASED":
      return "Released";
    case "REWORK":
      return "Rework";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function statusVariant(status: string): BadgeVariant {
  switch (String(status).toUpperCase()) {
    case "DRAFT":
      return "draft";
    case "ACTIVE":
      return "active";
    case "PENDING_QC":
    case "REWORK":
      return "pending";
    case "COMPLETED":
    case "RELEASED":
      return "completed";
    case "POSTED":
      return "posted";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
      return "voided";
    default:
      return "inactive";
  }
}

function qty(value: number) {
  return formatNumberDisplay(value, { maximumFractionDigits: 3 });
}

function summaryIcon(bg: string, fg: string, children: ReactNode) {
  return (
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 14,
        backgroundColor: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export default function BatchesListPage({ rows }: { rows: ProductionBatchListRow[] }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    const canonical = STATUS_ORDER.filter((value) => rows.some((row) => String(row.status).toUpperCase() === value)).map((value) => {
      seen.add(value);
      return { value, label: statusLabel(value) };
    });
    const extras = rows
      .map((row) => String(row.status).toUpperCase())
      .filter((value) => value && !seen.has(value))
      .filter((value, index, array) => array.indexOf(value) === index)
      .map((value) => ({ value, label: statusLabel(value) }));
    return [...canonical, ...extras];
  }, [rows]);

  const summary = useMemo(() => {
    const open = rows.filter((row) => ["DRAFT", "ACTIVE"].includes(String(row.status).toUpperCase())).length;
    const pendingQc = rows.filter((row) => String(row.status).toUpperCase() === "PENDING_QC").length;
    const released = rows.filter((row) => ["POSTED", "RELEASED", "COMPLETED"].includes(String(row.status).toUpperCase())).length;
    return { total: rows.length, open, pendingQc, released };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (fromDate && new Date(row.productionDate) < new Date(fromDate)) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(row.productionDate) > end) return false;
      }
      if (status && String(row.status).toUpperCase() !== String(status).toUpperCase()) return false;
      if (!query) return true;
      return [row.batchNo, row.sessionNo, row.shiftCode, row.locationName, row.finishedGoodCode, row.finishedGoodName, row.machineName, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [rows, fromDate, toDate, status, appliedSearch]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, status, appliedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setStatus("");
    setSearchText("");
    setAppliedSearch("");
    setPage(1);
  };

  const applySearch = () => {
    setAppliedSearch(searchText.trim());
    setPage(1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ color: colors.primary[600], display: "inline-flex", alignItems: "center" }}>
            <Factory size={30} strokeWidth={2.2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.1, fontWeight: 600, color: colors.text.primary }}>Log Production</h1>
            <p style={{ margin: "5px 0 0", color: colors.text.secondary, fontSize: 14 }}>
              Finished output recorded on a shift. Recording output does not increase finished-goods stock.
            </p>
          </div>
        </div>
        <Link href="/production/shift-sessions" style={primaryLinkStyle}>
          <CalendarClock size={16} />
          Open Shift Sessions
        </Link>
      </div>

      <div className="batch-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 18 }}>
        {[
          { label: "Total Batches", value: summary.total, icon: summaryIcon("#e6faf7", "#0f8f81", <Layers size={26} />) },
          { label: "Open", value: summary.open, icon: summaryIcon("#fff3e6", "#ea6900", <Factory size={26} />) },
          { label: "Pending QC", value: summary.pendingQc, icon: summaryIcon("#fff7e6", "#b45309", <ShieldAlert size={26} />) },
          { label: "Completed", value: summary.released, icon: summaryIcon("#e7f7ea", "#20833d", <CircleCheck size={26} />) },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              minHeight: 120,
              padding: 18,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {card.icon}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 32, lineHeight: 1, fontWeight: 700, color: colors.text.primary }}>{card.value}</div>
              <div style={{ fontSize: 14, color: colors.text.secondary }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 22 }}>
        <div className="batch-filter-grid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 1fr 1fr auto auto", gap: 18, alignItems: "end" }}>
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>Search</label>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Search batch, product, shift, machine..."
              style={filterInputStyle}
            />
          </div>
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>From Date</label>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} style={filterInputStyle} />
          </div>
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>To Date</label>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} style={filterInputStyle} />
          </div>
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={filterInputStyle}>
              <option value="">All Status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={applySearch} style={{ ...searchButtonStyle, width: 135 }}>
            <Search size={16} />
            Search
          </button>
          <button type="button" onClick={clearFilters} style={{ ...clearButtonStyle, width: 120 }}>
            <X size={16} />
            Clear
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.text.primary, fontSize: 18 }}>
            <List size={16} color={colors.primary[700]} />
            Batch List
          </div>
          <span style={{ backgroundColor: colors.primary[600], color: colors.text.inverse, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
            {filteredRows.length} records
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {rows.length === 0 ? (
              <EmptyState
                icon={<Factory size={40} />}
                title="No Production Batches"
                message="Record finished output from an active shift session. Those batches will appear here."
                action={{ label: "Open Shift Sessions", onClick: () => router.push("/production/shift-sessions") }}
              />
            ) : (
              <EmptyState
                icon={<Factory size={40} />}
                title="No batches match your filters"
                message="Clear the filters to see the full production batch register."
                action={{ label: "Clear Filters", onClick: clearFilters }}
              />
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb" }}>
                    {[
                      ["Batch No.", "left"],
                      ["Date", "left"],
                      ["Shift", "left"],
                      ["Product", "left"],
                      ["Location", "left"],
                      ["Machine", "left"],
                      ["Produced", "right"],
                      ["Accepted", "right"],
                      ["Status", "center"],
                      ["Actions", "center"],
                    ].map(([label, align]) => (
                      <th
                        key={label}
                        style={{
                          textAlign: align as "left" | "center" | "right",
                          padding: "14px 16px",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text.secondary,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td style={cellStyle}>
                        <Link href={publicViewUrl("production.batch", row.publicId)} style={documentLinkStyle}>
                          {row.batchNo}
                        </Link>
                      </td>
                      <td style={cellStyle}>{formatDate(row.productionDate)}</td>
                      <td style={cellStyle}>
                        <Link href={publicViewUrl("shifts.session", row.sessionPublicId)} style={documentLinkStyle}>
                          {row.sessionNo}
                        </Link>
                        <div style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>{row.shiftCode}</div>
                      </td>
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600 }}>{row.finishedGoodName}</div>
                        <div style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>{row.finishedGoodCode}</div>
                      </td>
                      <td style={cellStyle}>{row.locationName}</td>
                      <td style={cellStyle}>{row.machineName || "—"}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{qty(row.producedQty)}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{qty(row.acceptedQty)}</td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <StatusBadge status={statusVariant(row.status)} label={statusLabel(row.status)} size="sm" />
                      </td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <Link href={publicViewUrl("production.batch", row.publicId)} title="View batch" aria-label="View batch" style={actionButtonStyle}>
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: `1px solid ${colors.border}`, backgroundColor: "#f9fafb", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: colors.text.secondary, fontSize: 13 }}>
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1} style={pagerButtonStyle(currentPage <= 1)}>
                    Previous
                  </button>
                  <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage >= totalPages} style={pagerButtonStyle(currentPage >= totalPages)}>
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .batch-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 14px !important;
          }
          .batch-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          .batch-filter-grid > :first-child {
            grid-column: 1 / -1;
          }
          .batch-filter-grid button {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

const primaryLinkStyle: React.CSSProperties = {
  height: 48,
  minWidth: 205,
  padding: "0 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 9,
  backgroundColor: colors.primary[600],
  color: colors.text.inverse,
  textDecoration: "none",
  fontWeight: 700,
  boxShadow: "0 8px 18px rgba(0, 137, 123, 0.14)",
  whiteSpace: "nowrap",
};

const filterFieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1,
  fontWeight: 700,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const filterInputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  padding: "0 12px",
  borderRadius: 9,
  border: `1px solid ${colors.inputBorder}`,
  backgroundColor: colors.surface,
  color: colors.text.primary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  boxSizing: "border-box",
};

const searchButtonStyle: React.CSSProperties = {
  height: 46,
  borderRadius: 9,
  border: "none",
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
  height: 46,
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

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${colors.border}`,
  color: colors.text.primary,
  fontSize: typography.sizes.body.fontSize,
  verticalAlign: "middle",
};

const documentLinkStyle: React.CSSProperties = {
  color: colors.primary[700],
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const actionButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.text.secondary,
  textDecoration: "none",
};

const pagerButtonStyle = (disabled: boolean): React.CSSProperties => ({
  height: 36,
  padding: "0 14px",
  borderRadius: 9,
  border: `1px solid ${colors.border}`,
  backgroundColor: disabled ? colors.secondary[50] : colors.surface,
  color: disabled ? colors.text.muted : colors.text.primary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
});
