"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleCheck, Clock3, ClipboardList, Eye, List, PackageOpen, Plus, Search, X } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { publicViewUrl } from "@/lib/routing/urls";

export type RequisitionListRow = {
  id: string;
  publicId: number;
  number: string;
  date: string;
  status: string;
  itemCount: number;
  requestTypeText: string;
  locationText: string;
  requestedByText: string;
};

type Props = {
  rows: RequisitionListRow[];
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
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "PARTIALLY_ISSUED":
      return "Issued";
    case "ISSUED":
      return "Issued";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return String(status);
  }
}

function statusVariant(status: string) {
  switch (String(status).toUpperCase()) {
    case "DRAFT":
      return "draft";
    case "SUBMITTED":
      return "pending";
    case "APPROVED":
      return "approved";
    case "PARTIALLY_ISSUED":
    case "ISSUED":
      return "completed";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
      return "voided";
    default:
      return "inactive";
  }
}

function requestTypeBadge(text: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 24,
        padding: "0 10px",
        borderRadius: 999,
        backgroundColor: "#e9f2ff",
        color: "#2563eb",
        border: "1px solid #cfe0ff",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
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

export default function RequisitionsListPage({ rows }: Props) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const statusOptions = useMemo(() => {
    const ordered = ["DRAFT", "SUBMITTED", "APPROVED", "ISSUED", "REJECTED", "CANCELLED"];
    const seen = new Set<string>();
    const canonical = ordered
      .filter((value) => rows.some((row) => String(row.status).toUpperCase() === value))
      .map((value) => {
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
    const pending = rows.filter((row) => String(row.status).toUpperCase() === "SUBMITTED").length;
    const approved = rows.filter((row) => String(row.status).toUpperCase() === "APPROVED").length;
    const issued = rows.filter((row) => ["ISSUED", "PARTIALLY_ISSUED"].includes(String(row.status).toUpperCase())).length;
    return { total: rows.length, pending, approved, issued };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (fromDate && new Date(row.date) < new Date(fromDate)) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(row.date) > end) return false;
      }
      if (status && String(row.status).toUpperCase() !== String(status).toUpperCase()) return false;
      if (!query) return true;
      return [row.number, row.requestTypeText, row.locationText, row.requestedByText, row.status]
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
            <ClipboardList size={30} strokeWidth={2.2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 27, lineHeight: 1.1, fontWeight: 700, color: colors.text.primary }}>Store Requisitions</h1>
            <p style={{ margin: "5px 0 0", color: colors.text.secondary, fontSize: 15.5 }}>Request materials from stores for production and departments</p>
          </div>
        </div>
        <Link
          href="/inventory/requisitions/create"
          style={{
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
          }}
        >
          <Plus size={16} />
          New Requisition
        </Link>
      </div>

      <div className="requisition-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 18 }}>
        {[
          { label: "Total Requisitions", value: summary.total, icon: summaryIcon("#e6faf7", "#0f8f81", <ClipboardList size={26} />) },
          { label: "Pending Approval", value: summary.pending, icon: summaryIcon("#fff3e6", "#ea6900", <Clock3 size={26} />) },
          { label: "Approved", value: summary.approved, icon: summaryIcon("#e7f7ea", "#20833d", <CircleCheck size={26} />) },
          { label: "Issued", value: summary.issued, icon: summaryIcon("#e8f6fb", "#0f9ba0", <PackageOpen size={26} />) },
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

      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 22,
        }}
      >
        <div
          className="requisition-filter-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 1fr 1fr 1fr auto auto",
            gap: 18,
            alignItems: "end",
          }}
        >
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>Search</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
              placeholder="Search requisition no, destination, requester..."
              style={filterInputStyle}
            />
          </div>
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={filterInputStyle} />
          </div>
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={filterInputStyle} />
          </div>
          <div style={filterFieldStyle}>
            <label style={filterLabelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
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
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "18px 22px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.text.primary, fontSize: 18 }}>
            <List size={16} color={colors.primary[700]} />
            Requisition List
          </div>
          <span
            style={{
              backgroundColor: colors.primary[600],
              color: colors.text.inverse,
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {filteredRows.length} records
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {rows.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={40} />}
                title="No Requisitions Found"
                message="Create your first store requisition to request materials."
                action={{ label: "+ New Requisition", onClick: () => router.push("/inventory/requisitions/create") }}
              />
            ) : (
              <EmptyState
                icon={<ClipboardList size={40} />}
                title="No requisitions match your filters"
                message="Try clearing the filters to see more requisition records."
                action={{ label: "Clear Filters", onClick: clearFilters }}
              />
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb" }}>
                    {[
                      ["Requisition No.", "left", 160],
                      ["Date", "left", 120],
                      ["Request Type", "left", 150],
                      ["Location", "left", 180],
                      ["Requested By", "left", 180],
                      ["Items", "center", 90],
                      ["Status", "center", 120],
                      ["Actions", "center", 90],
                    ].map(([label, align, width]) => (
                      <th
                        key={String(label)}
                        style={{
                          textAlign: String(align) as "left" | "center",
                          padding: "14px 16px",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text.secondary,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          width: Number(width),
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
                        <Link href={publicViewUrl("inventory.requisition", row.publicId)} style={documentLinkStyle}>
                          {row.number}
                        </Link>
                      </td>
                      <td style={cellStyle}>{formatDate(row.date)}</td>
                      <td style={cellStyle}>{requestTypeBadge(row.requestTypeText)}</td>
                      <td style={cellStyle}>{row.locationText}</td>
                      <td style={cellStyle}>{row.requestedByText}</td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <span style={itemCountBadgeStyle}>{row.itemCount}</span>
                      </td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <StatusBadge status={statusVariant(row.status) as never} label={statusLabel(row.status)} size="sm" />
                      </td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                          {String(row.status).toUpperCase() === "SUBMITTED" ? (
                            <Link
                              href={publicViewUrl("inventory.requisition", row.publicId)}
                              title="Review for approval"
                              aria-label="Review for approval"
                              style={approvalActionButtonStyle}
                            >
                              <CheckCircle2 size={18} strokeWidth={2.6} />
                            </Link>
                          ) : null}
                          <Link href={publicViewUrl("inventory.requisition", row.publicId)} title="View" aria-label="View" style={actionButtonStyle}>
                            <Eye size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderTop: `1px solid ${colors.border}`,
                  backgroundColor: "#f9fafb",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: colors.text.secondary, fontSize: 13 }}>
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={pagerButtonStyle(currentPage <= 1)}>
                    Previous
                  </button>
                  <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={pagerButtonStyle(currentPage >= totalPages)}>
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
          .requisition-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 14px !important;
          }

          .requisition-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .requisition-filter-grid > :first-child {
            grid-column: 1 / -1;
          }

          .requisition-filter-grid button {
            width: 100% !important;
          }
        }

        @media (max-width: 520px) {
          .requisition-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .requisition-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .requisition-filter-grid > :first-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}

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
  boxShadow: "0 8px 16px rgba(0, 137, 123, 0.12)",
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

const itemCountBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 28,
  height: 28,
  borderRadius: 999,
  backgroundColor: "#f3f4f6",
  color: "#4b5563",
  fontSize: 12,
  fontWeight: 700,
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

const approvalActionButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  border: "1px solid #b7ebc6",
  backgroundColor: "#effbf2",
  color: "#15803d",
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
