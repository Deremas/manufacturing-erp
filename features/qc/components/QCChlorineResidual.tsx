"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Filter, Pencil, Plus, Printer, X } from "lucide-react";

import { colors } from "@/components/ui/colors";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { qcInputStyle, qcPageTitleStyle, qcTdStyle, qcToolbarButtonStyle, qcFieldLabelStyle } from "./QCWideTable";
import { useAccess } from "@/lib/auth/use-access";

const BASE = "/qc/chlorine-residual";

type Option = { value: string; label: string };
type Spec = {
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
};
type ReadingRow = { timeValue: string; remark: string; values: Record<string, string> };

const cardStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};

const greyButtonStyle: React.CSSProperties = qcToolbarButtonStyle;
const primaryButtonStyle: React.CSSProperties = {
  ...qcToolbarButtonStyle,
  background: colors.primary[600],
};

const thStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "6px 8px",
  background: "transparent",
  fontSize: 11,
  fontWeight: 500,
  color: colors.text.secondary,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: "normal",
  verticalAlign: "bottom",
};

function parseExtra(value: unknown): Record<string, string> {
  if (!value) return {};
  const raw =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return {};
          }
        })()
      : value;
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, entry]) => [key, entry == null ? "" : String(entry)]),
  );
}

function emptyReading(): ReadingRow {
  return { timeValue: "", remark: "", values: {} };
}

function readingsFromRecord(record?: Record<string, unknown> | null, specs: Spec[] = []): ReadingRow[] {
  const existingLines = Array.isArray(record?.lines) ? (record.lines as Array<Record<string, unknown>>) : [];
  const grouped = new Map<number, ReadingRow>();
  for (const line of existingLines.filter((row) => row.lineType === "READING" || row.sectionCode === "READINGS")) {
    const index = Number(line.rowIndex ?? 0);
    const current = grouped.get(index) ?? emptyReading();
    current.timeValue = String(line.timeValue ?? current.timeValue);
    current.remark = String(line.remarks ?? current.remark);
    current.values = { ...current.values, ...parseExtra(line.extra) };
    const spec = specs.find((item) => item.parameterId === line.parameterId);
    const code = spec?.parameterCode || String(line.parameterCode ?? "");
    if (code) current.values[code] = String(line.textValue ?? line.numericValue ?? current.values[code] ?? "");
    grouped.set(index, current);
  }
  const rows = [...grouped.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1]);
  while (rows.length < 4) rows.push(emptyReading());
  return rows.length ? rows : [emptyReading(), emptyReading(), emptyReading(), emptyReading()];
}

function displayStatus(status: string) {
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED" || status === "CANCELLED") return status;
  return "PENDING";
}

function StatusBadge({ status }: { status: string }) {
  const label = displayStatus(status);
  const tone =
    label === "APPROVED"
      ? { bg: "#dcfce7", text: "#15803d" }
      : label === "REJECTED"
        ? { bg: "#fee2e2", text: "#b91c1c" }
        : { bg: "#ffedd5", text: "#c2410c" };
  return (
    <span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: tone.bg, color: tone.text, fontSize: 11, fontWeight: 800 }}>
      {label}
    </span>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="qc-field" style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <span className="qc-field-label" style={qcFieldLabelStyle}>
        {label}
        {required ? <span style={{ color: colors.danger[600] }}> *</span> : ""}
      </span>
      {children}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-GB");
}

export function QCChlorineResidualListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  const router = useRouter();
  const { canAction, canPath } = useAccess();
  const catalog = getQcCatalogEntry("chlorine-residual")!;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const date = String(row.recordDate ?? "").slice(0, 10);
      if (applied.from && date < applied.from) return false;
      if (applied.to && date > applied.to) return false;
      return true;
    });
  }, [rows, applied]);

  async function approve(id: string, status: string) {
    startTransition(async () => {
      if (status === "DRAFT" || status === "REJECTED") {
        await fetch(`/api/qc/records/${id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      }
      await fetch(`/api/qc/records/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <h1 style={qcPageTitleStyle}>
          Chlorine Residual Check List ({catalog.formCode})
        </h1>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          {canAction("Print") ? (
          <button type="button" style={{ ...greyButtonStyle, background: "white", color: colors.text.primary, border: `1px solid ${colors.border}` }} onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          ) : null}
          {canPath(`${BASE}/create`) ? (
          <button type="button" style={primaryButtonStyle} onClick={() => router.push(`${BASE}/create`)}>
            <Plus size={16} /> New Checklist
          </button>
          ) : null}
        </div>
      </div>

      <div className="no-print" style={{ ...cardStyle, padding: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="From">
          <input type="date" style={{ ...qcInputStyle, minWidth: 180 }} value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" style={{ ...qcInputStyle, minWidth: 180 }} value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <button type="button" style={greyButtonStyle} onClick={() => setApplied({ from, to })}>
          <Filter size={15} /> Filter
        </button>
      </div>

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 980, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Shift", "Treatment", "Time", "Chlorine Residual (ppm)", "Remark", "Recorded By", "Status", ""].map((label) => {
                  const heading = label.match(/^(.*?)\s*\((.*)\)\s*$/);
                  return (
                    <th key={label || "actions"} style={thStyle}>
                      {heading ? (
                        <>
                          <span style={{ display: "block", fontWeight: 700 }}>{heading[1]}</span>
                          <span style={{ display: "block", marginTop: 4, fontSize: 11 }}>({heading[2]})</span>
                        </>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const extra = parseExtra(row.extraFields);
                const status = String(row.status);
                const canApprove = ["DRAFT", "REJECTED", "SUBMITTED", "CHECKED"].includes(status) && canAction("Approve");
                return (
                  <tr key={String(row.id)}>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{formatDate(String(row.recordDate ?? ""))}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.shiftCode ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{extra.treatmentNo || "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{extra.firstTime || "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{extra.firstPpm || "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{extra.firstRemark || "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.testedByName ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <StatusBadge status={status} />
                    </td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      {canApprove ? (
                        <button type="button" style={{ ...primaryButtonStyle, height: 34, background: "#e2e8f0", color: colors.text.primary }} disabled={pending} onClick={() => approve(String(row.id), status)}>
                          Approve
                        </button>
                      ) : (
                        <Link href={`${BASE}/${row.id}`} style={{ color: colors.primary[700], fontWeight: 700, textDecoration: "none" }}>
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 24, color: colors.text.muted, textAlign: "center" }}>
                    No records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function QCChlorineResidualFormPage({
  mode,
  context,
  record,
}: {
  mode: "create" | "edit" | "view";
  context: {
    catalog: { name: string; formCode: string; formTitle: string };
    form: { id: string; code: string; title: string; frequencyName: string | null };
    specs: Spec[];
    locations: Option[];
    shifts: Option[];
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const { canAction } = useAccess();
  const catalog = getQcCatalogEntry("chlorine-residual")!;
  const readOnly = mode === "view";
  const extra = parseExtra(record?.extraFields);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(0, 10),
    shiftCode: String(record?.shiftCode ?? context.shifts[0]?.value ?? ""),
    treatmentNo: extra.treatmentNo ?? "",
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
    backdateReason: String(record?.backdateReason ?? ""),
  });
  const [readings, setReadings] = useState<ReadingRow[]>(() => readingsFromRecord(record, context.specs ?? []));

  const goBack = () => router.push(BASE);
  const canApprove = ["SUBMITTED", "CHECKED"].includes(String(record?.status ?? "")) && canAction("Approve");
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(String(record?.status ?? "")) && canAction("Submit");
  const canEditRecord = ["DRAFT", "REJECTED"].includes(String(record?.status ?? "")) && canAction("Edit");

  async function save() {
    setMessage("");
    startTransition(async () => {
      const first = readings.find((row) => row.timeValue || row.values.CHLORINE_PPM || row.remark) ?? readings[0];
      const payload = {
        slug: "chlorine-residual",
        controlledFormId: context.form.id,
        recordDate: header.recordDate,
        shiftCode: header.shiftCode || null,
        locationId: header.locationId || null,
        backdateReason: header.backdateReason,
        extraFields: {
          treatmentNo: header.treatmentNo,
          firstTime: first?.timeValue ?? "",
          firstPpm: first?.values.CHLORINE_PPM ?? "",
          firstRemark: first?.remark ?? "",
        },
        readings,
        results: [],
      };
      const url = mode === "edit" && record?.id ? `/api/qc/records/${record.id}` : "/api/qc/records";
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save checklist");
        return;
      }
      router.push(`${BASE}/${body.id ?? record?.id}`);
      router.refresh();
    });
  }

  async function workflow(path: string) {
    if (!record?.id) return;
    startTransition(async () => {
      const response = await fetch(`/api/qc/records/${record.id}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json();
      if (!response.ok) setMessage(body.error ?? "Workflow action failed");
      else router.refresh();
    });
  }

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <h1 style={qcPageTitleStyle}>Chlorine Residual Check List</h1>
        <button type="button" className="no-print" style={greyButtonStyle} onClick={goBack} disabled={pending}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      {message ? <p style={{ color: colors.danger[700], margin: 0, fontSize: 12 }}>{message}</p> : null}

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div style={{ padding: "8px 14px", background: colors.primary[700], color: "white", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12, fontWeight: 600 }}>
          <span>{context.form.code || catalog.formCode} — {context.form.title || catalog.formTitle}</span>
          <span style={{ marginLeft: "auto", fontWeight: 500 }}>{context.form.frequencyName || "Every 30 minutes"}</span>
        </div>

        <div style={{ padding: "12px 14px", display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Field label="Date" required>
              <input type="date" style={qcInputStyle} value={header.recordDate} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />
            </Field>
            <Field label="Shift" required>
              <select style={qcInputStyle} value={header.shiftCode} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, shiftCode: event.target.value }))}>
                <option value="">Select ...</option>
                {context.shifts.map((shift) => (
                  <option key={shift.value} value={shift.value}>{shift.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Treatment No.">
              <input style={qcInputStyle} placeholder="e.g., T-01" value={header.treatmentNo} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, treatmentNo: event.target.value }))} />
            </Field>
          </div>
          {new Date(header.recordDate) < new Date(new Date().toDateString()) && !readOnly ? (
            <Field label="Backdate reason" required>
              <input style={qcInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
            </Field>
          ) : null}
        </div>

        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 720, width: "100%" }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>
                  <span style={{ display: "block" }}>Chlorine Residual</span>
                  <span style={{ display: "block", marginTop: 2, fontSize: 10 }}>(ppm)</span>
                </th>
                <th style={thStyle}>Remark</th>
                {!readOnly ? <th style={{ ...thStyle, width: 40 }}></th> : null}
              </tr>
            </thead>
            <tbody>
              {readings.map((row, index) => (
                <tr key={index}>
                  <td style={{ ...qcTdStyle, textAlign: "center", color: colors.text.secondary }}>{index + 1}</td>
                  <td style={qcTdStyle}>
                    <input type="time" style={qcInputStyle} value={row.timeValue} disabled={readOnly} onChange={(event) => setReadings((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, timeValue: event.target.value } : item))} />
                  </td>
                  <td style={qcTdStyle}>
                    <input style={qcInputStyle} inputMode="decimal" value={row.values.CHLORINE_PPM ?? ""} disabled={readOnly} onChange={(event) => setReadings((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, values: { ...item.values, CHLORINE_PPM: event.target.value } } : item))} />
                  </td>
                  <td style={qcTdStyle}>
                    <input style={qcInputStyle} value={row.remark} disabled={readOnly} onChange={(event) => setReadings((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, remark: event.target.value } : item))} />
                  </td>
                  {!readOnly ? (
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <button
                        type="button"
                        aria-label={index === 0 ? "Clear row" : "Remove row"}
                        onClick={() => setReadings((current) => blankOrRemoveRow(current, index, emptyReading()))}
                        style={{
                          width: 22,
                          height: 22,
                          padding: 0,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 4,
                          background: "#f8fafc",
                          color: colors.text.secondary,
                          cursor: "pointer",
                          display: "inline-grid",
                          placeItems: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!readOnly ? (
          <div style={{ padding: "8px 14px" }}>
            <button
              type="button"
              className="qc-add-row"
              onClick={() => setReadings((current) => [...current, emptyReading()])}
              style={primaryButtonStyle}
            >
              <Plus size={14} /> Add row
            </button>
          </div>
        ) : null}

        {mode === "view" ? (
          <div className="no-print" style={{ padding: "8px 14px 12px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {canSubmitDraft ? (
              <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("submit")}>Submit</button>
            ) : null}
            {canApprove ? (
              <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("approve")}>Approve</button>
            ) : null}
            {canEditRecord ? (
              <button type="button" style={greyButtonStyle} onClick={() => router.push(`${BASE}/${record?.id}/edit`)}>
                <Pencil size={14} /> Edit
              </button>
            ) : null}
          </div>
        ) : (
          <div className="no-print qc-save-row">
            <button type="button" style={greyButtonStyle} onClick={goBack} disabled={pending}>Cancel</button>
            {canAction(mode === "create" ? "Create" : "Edit") ? (
            <button type="button" style={primaryButtonStyle} onClick={save} disabled={pending}>Save Checklist</button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
