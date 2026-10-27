"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, X } from "lucide-react";

import { colors } from "@/components/ui/colors";
import { publicViewUrl, type PublicRouteKey } from "@/lib/routing";

export const qsInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 32,
  padding: "4px 8px",
  border: "1px solid #94a3b8",
  borderRadius: 6,
  fontSize: 12,
  background: "white",
  boxSizing: "border-box",
};
export const qsAreaStyle: React.CSSProperties = {
  ...qsInputStyle,
  height: 72,
  minHeight: 72,
  resize: "vertical",
  lineHeight: "18px",
};
export const qsBackStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  border: "none",
  borderRadius: 6,
  background: "#334155",
  color: "white",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  width: "fit-content",
};
export const qsSaveStyle: React.CSSProperties = { ...qsBackStyle, background: colors.primary[700] };
export const qsAddStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  border: "none",
  borderRadius: 6,
  background: colors.primary[600],
  color: "white",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  width: "fit-content",
};
export const qsViewStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  padding: "0 12px",
  border: `1px solid ${colors.primary[600]}`,
  borderRadius: 6,
  background: "white",
  color: colors.primary[700],
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "#ea580c", color: "#fff" },
  APPROVED: { bg: "#16a34a", color: "#fff" },
  SUBMITTED: { bg: "#ea580c", color: "#fff" },
  CHECKED: { bg: "#2563eb", color: "#fff" },
  VERIFIED: { bg: "#2563eb", color: "#fff" },
  REJECTED: { bg: "#dc2626", color: "#fff" },
  STORED: { bg: "#2563eb", color: "#fff" },
  DUE: { bg: "#ea580c", color: "#fff" },
  HOLD: { bg: "#ea580c", color: "#fff" },
  RELEASE: { bg: "#16a34a", color: "#fff" },
  REWORK: { bg: "#2563eb", color: "#fff" },
  OPEN: { bg: "#ea580c", color: "#fff" },
  CLOSED: { bg: "#16a34a", color: "#fff" },
};

export function dateValue(value: unknown) {
  return String(value ?? "").slice(0, 10);
}

export function blank(value: unknown) {
  return String(value ?? "").trim();
}

export function nameOnly(label: string) {
  const parts = label.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : label;
}

export function padRows<T>(rows: T[], seed: () => T, min = 3) {
  const next = rows.length ? [...rows] : [];
  while (next.length < min) next.push(seed());
  return next.length ? next : [seed()];
}

export function asRows<T extends Record<string, string>>(value: unknown, keys: Array<keyof T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    return Object.fromEntries(keys.map((key) => [key, String(record[String(key)] ?? "")])) as T;
  });
}

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_PILL[status] ?? { bg: "#64748b", color: "#fff" };
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: tone.bg, color: tone.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function QsField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="qc-mr-field">
      <span className="qc-mr-label">
        {label}
        {required ? <span style={{ color: "#dc2626" }}> *</span> : null}
      </span>
      {children}
    </div>
  );
}

export function QsValue({ children }: { children: React.ReactNode }) {
  return <div className="qc-mr-value">{children || "-"}</div>;
}

export function QsBanner({ code, title }: { code: string; title: string }) {
  return (
    <div className="qc-mr-banner">
      <span>{code}</span>
      <span>- {title}</span>
    </div>
  );
}

export function QsRemoveButton({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="qc-mr-x" style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <X size={13} />
    </button>
  );
}

export function QsListPage({
  title,
  formCode,
  newLabel,
  createHref,
  viewBase,
  routeKey,
  columns,
  rows,
}: {
  title: string;
  formCode: string;
  newLabel: string;
  createHref: string;
  viewBase: string;
  routeKey?: PublicRouteKey;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <FileText size={18} color="#0f172a" />
          <h1>{title} ({formCode})</h1>
        </div>
        <div className="qc-mr-actions no-print">
          <button type="button" style={qsSaveStyle} onClick={() => router.push(createHref)}>
            <Plus size={14} /> {newLabel}
          </button>
        </div>
      </div>
      <div className="qc-mr-card">
        <div className="qc-mr-results-scroll">
          <table className="qc-mr-list-table">
            <thead>
              <tr>
                {[...columns.map((col) => col.label), ""].map((label) => (
                  <th key={label || "view"}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.key === "status" || (col.key === "decision" && blank(row[col.key]))
                        ? <StatusPill status={String(row[col.key] ?? "")} />
                        : col.key.toLowerCase().includes("date")
                          ? dateValue(row[col.key])
                          : blank(row[col.key])}
                    </td>
                  ))}
                  <td>
                    <Link
                      href={routeKey && row.publicId != null ? publicViewUrl(routeKey, Number(row.publicId)) : `${viewBase}/${row.id}`}
                      style={qsViewStyle}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="qc-mr-empty">No records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
