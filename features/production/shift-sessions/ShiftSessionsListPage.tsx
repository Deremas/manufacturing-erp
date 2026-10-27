"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Eye, Plus, Square, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

export type ShiftSessionListRow = {
  id: string;
  publicId: number;
  sessionNo: string;
  productionDate: string;
  shiftCode: string;
  locationName: string;
  status: string;
  startedByName: string | null;
  employeeCount: number;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function shiftLetter(code: string) {
  const match = String(code).toUpperCase().match(/([ABC])(?:[^A-Z]|$)/);
  return match?.[1] ?? String(code).slice(0, 1).toUpperCase();
}

function shiftColor(letter: string) {
  if (letter === "A") return "#0f9f6e";
  if (letter === "B") return "#2563eb";
  if (letter === "C") return "#d97706";
  return "#0f766e";
}

function isCompleted(status: string) {
  return ["COMPLETED", "POSTED"].includes(String(status).toUpperCase());
}

export default function ShiftSessionsListPage({ rows }: { rows: ShiftSessionListRow[] }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [shift, setShift] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [applied, setApplied] = useState({ fromDate: "", toDate: "", shift: "", status: "", location: "" });
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [pendingDelete, setPendingDelete] = useState<ShiftSessionListRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const shifts = useMemo(() => Array.from(new Set(rows.map((row) => row.shiftCode))).sort(), [rows]);
  const locations = useMemo(() => Array.from(new Set(rows.map((row) => row.locationName))).sort(), [rows]);
  const summary = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.status === "ACTIVE").length,
    completed: rows.filter((row) => isCompleted(row.status)).length,
  }), [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (applied.fromDate && new Date(row.productionDate) < new Date(applied.fromDate)) return false;
    if (applied.toDate) {
      const end = new Date(applied.toDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(row.productionDate) > end) return false;
    }
    if (applied.shift && row.shiftCode !== applied.shift) return false;
    if (applied.status === "ACTIVE" && row.status !== "ACTIVE") return false;
    if (applied.status === "COMPLETED" && !isCompleted(row.status)) return false;
    if (applied.location && row.locationName !== applied.location) return false;
    return true;
  }), [rows, applied]);

  useEffect(() => { setPage(1); }, [applied]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/shifts/sessions/${pendingDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to delete this shift");
      setPendingDelete(null);
      setDeleteReason("");
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete this shift");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 600, color: colors.text.primary }}>
          <Clock3 size={26} color={colors.primary[600]} />
          Shift Sessions
        </h1>
        <Link href="/production/shift-sessions/create" style={newButton}><Plus size={16} />New Shift</Link>
      </div>

      <div className="shift-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {[
          { label: "Total Sessions", value: summary.total, color: "#0f766e" },
          { label: "Active", value: summary.active, color: "#16a34a" },
          { label: "Completed", value: summary.completed, color: "#2563eb" },
        ].map((card) => (
          <div key={card.label} style={kpiCard}>
            <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ marginTop: 8, fontSize: 14, color: colors.text.secondary }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={panel}>
        <div className="shift-filter-grid" style={{ display: "grid", gridTemplateColumns: "minmax(150px, 1.25fr) minmax(150px, 1.25fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1.15fr) auto", gap: 10, alignItems: "end" }}>
          <Field label="From Date"><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} style={inputStyle} /></Field>
          <Field label="To Date"><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} style={inputStyle} /></Field>
          <Field label="Shift">
            <select value={shift} onChange={(event) => setShift(event.target.value)} style={inputStyle}>
              <option value="">All Shifts</option>
              {shifts.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </Field>
          <Field label="Location">
            <select value={location} onChange={(event) => setLocation(event.target.value)} style={inputStyle}>
              <option value="">All Locations</option>
              {locations.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setApplied({ fromDate, toDate, shift, status, location })} style={filterButton}>Filter</button>
            <button type="button" onClick={() => { setFromDate(""); setToDate(""); setShift(""); setStatus(""); setLocation(""); setApplied({ fromDate: "", toDate: "", shift: "", status: "", location: "" }); }} style={clearLink}>Clear</button>
          </div>
        </div>
      </div>

      <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
        {filteredRows.length === 0 ? (
          <div style={{ minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EmptyState icon={<Clock3 size={36} />} title="No shift sessions" message="Start a factory shift to record attendance, materials, and output." action={{ label: "New Shift", onClick: () => router.push("/production/shift-sessions/create") }} />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "28%" }} />
              </colgroup>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Date", "Shift", "Location", "Employees", "Started By", "Status", "Actions"].map((label) => (
                    <th key={label} style={{ textAlign: label === "Actions" || label === "Shift" ? "center" : "left", padding: "12px 10px", fontSize: 12, fontWeight: 600, color: colors.text.secondary, whiteSpace: "nowrap" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const letter = shiftLetter(row.shiftCode);
                  return (
                    <tr key={row.id}>
                      <td style={cell}>{formatDate(row.productionDate)}</td>
                      <td style={{ ...cell, textAlign: "center" }}>
                        <span title={row.shiftCode} style={{ width: 28, height: 28, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: shiftColor(letter), color: "white", fontSize: 13, fontWeight: 700 }}>{letter}</span>
                      </td>
                      <td style={{ ...cell, ...clipCell }} title={row.locationName}>{row.locationName}</td>
                      <td style={cell}>{row.employeeCount} employee{row.employeeCount === 1 ? "" : "s"}</td>
                      <td style={cell}>{row.startedByName || "—"}</td>
                      <td style={cell}><span style={statusPill(row.status)}>{row.status}</span></td>
                      <td style={{ ...cell, textAlign: "center", overflow: "visible" }}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <Link href={`/production/shift-sessions/${row.publicId}`} style={viewButton}><Eye size={15} strokeWidth={2.25} />View</Link>
                          {row.status === "ACTIVE" ? <Link href={`/production/shift-sessions/${row.publicId}/reconciliation`} style={endButton}><Square size={11} fill="currentColor" strokeWidth={2} />End</Link> : null}
                          <button type="button" onClick={() => { setPendingDelete(row); setDeleteReason(""); setDeleteError(""); }} style={deleteButton}><Trash2 size={15} strokeWidth={2.25} />Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 ? (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderTop: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: 13, color: colors.text.secondary }}>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)} style={clearLink}>Previous</button>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)} style={clearLink}>Next</button>
            </div>
          </div>
        ) : null}
      </div>

      {pendingDelete ? (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div style={{ width: "min(460px, 100%)", background: "white", borderRadius: 12, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Delete {pendingDelete.sessionNo}?</h2>
            <p style={{ color: colors.text.secondary, fontSize: 14 }}>This removes the shift only when it has no materials, output, downtime, or quality records.</p>
            <textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} rows={3} placeholder="Reason" style={{ ...inputStyle, height: "auto", padding: 10 }} />
            {deleteError ? <p style={{ color: "#b91c1c" }}>{deleteError}</p> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => setPendingDelete(null)} style={clearLink}>Cancel</button>
              <button type="button" disabled={deleting || !deleteReason.trim()} onClick={confirmDelete} style={{ ...filterButton, background: "#b91c1c" }}>{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @media (max-width: 760px) {
          .shift-kpi-grid { grid-template-columns: 1fr !important; }
          .shift-filter-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: colors.text.secondary }}>{label}</span>
      {children}
    </label>
  );
}

function statusPill(status: string): React.CSSProperties {
  const active = status === "ACTIVE";
  return {
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.03em",
    background: active ? "#dcfce7" : "#e0f2fe",
    color: active ? "#15803d" : "#1d4ed8",
  };
}

const panel: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 };
const kpiCard: React.CSSProperties = { ...panel, minHeight: 108, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };
const inputStyle: React.CSSProperties = { width: "100%", minWidth: 0, height: 42, padding: "0 8px", borderRadius: 8, border: `1px solid ${colors.inputBorder}`, background: colors.surface, color: colors.text.primary, fontFamily: typography.fontFamily, fontSize: 14, boxSizing: "border-box" };
const filterButton: React.CSSProperties = { height: 42, padding: "0 16px", border: 0, borderRadius: 8, background: colors.primary[600], color: "white", fontWeight: 700, cursor: "pointer" };
const clearLink: React.CSSProperties = { height: 42, padding: "0 12px", border: `1px solid ${colors.border}`, borderRadius: 8, background: "white", color: colors.text.secondary, fontWeight: 600, cursor: "pointer" };
const cell: React.CSSProperties = { padding: "12px 10px", borderTop: `1px solid ${colors.border}`, fontSize: 14, color: colors.text.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const clipCell: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const viewButton: React.CSSProperties = { height: 34, padding: "0 8px", display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 8, border: `1px solid ${colors.primary[600]}`, color: colors.primary[700], background: "white", textDecoration: "none", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" };
const endButton: React.CSSProperties = { height: 34, padding: "0 8px", display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 8, border: "1px solid #86efac", background: "#dcfce7", color: "#166534", textDecoration: "none", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };
const deleteButton: React.CSSProperties = { height: 34, padding: "0 8px", display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 8, border: "1px solid #fca5a5", background: "white", color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" };
const newButton: React.CSSProperties = { height: 40, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, background: colors.primary[600], color: "white", textDecoration: "none", fontWeight: 700 };
