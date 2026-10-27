"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Download, Filter, FlaskConical, Pencil, Plus, Printer, RotateCcw, Save, X } from "lucide-react";

import { colors } from "@/components/ui/colors";
import { getQcCatalogEntry, PHYSICO_RESULT_TYPES, physicoParameterSlug, physicoResultTypeId, QC_FORM_PARAMETERS } from "@/services/qc/qc-catalog";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { QCSamplePointSelect } from "./QCSamplePointSelect";
import { QCSearchSelect } from "./QCSearchSelect";
import { QCStatusBadge } from "./QCStatusBadge";
import {
  qcFieldLabelStyle,
  qcInputStyle,
  qcPageTitleStyle,
  qcTdStyle,
  qcThStyle,
  qcToolbarButtonStyle,
} from "./QCWideTable";

const BASE = "/qc/physicochemical";

type Option = { value: string; label: string };
type Spec = {
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
  unitName?: string | null;
  methodReference?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  qualitativeCriterion?: string | null;
  acceptableLimit: string;
  frequencyName?: string | null;
  configured?: boolean;
};
type ReadingRow = { timeValue: string; remark: string; values: Record<string, string> };

const cardStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};

const greyButtonStyle: React.CSSProperties = qcToolbarButtonStyle;
const primaryButtonStyle: React.CSSProperties = { ...qcToolbarButtonStyle, background: colors.primary[600] };
const outlineButtonStyle: React.CSSProperties = {
  ...qcToolbarButtonStyle,
  background: "white",
  color: colors.text.primary,
  border: `1px solid ${colors.border}`,
};

const headingStyle: React.CSSProperties = {
  ...qcThStyle,
  textAlign: "center",
  whiteSpace: "normal",
  verticalAlign: "bottom",
  fontWeight: 500,
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
  return rows.length ? rows : [emptyReading()];
}

function wrapHeading(name: string) {
  const match = name.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (match) return { lines: [match[1], `(${match[2]})`] };
  if (name.length < 18) return { lines: [name] };
  const parts = name.split(" ");
  if (parts.length < 2) return { lines: [name] };
  const mid = Math.ceil(parts.length / 2);
  return { lines: [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")] };
}

function volumeFromItem(itemId: string, items: Option[], itemSpecs: Array<{ itemId: string; label: string | null }>) {
  const specLabel = itemSpecs.find((row) => row.itemId === itemId)?.label?.trim();
  if (specLabel) return specLabel;
  const item = items.find((row) => row.value === itemId);
  const match = item?.label.match(/(\d+\s*L\b)/i);
  if (match) return match[1].replace(/\s+/g, "");
  return item?.label.split("—").pop()?.trim() || "";
}

function exportCsv(rows: Array<Record<string, unknown>>) {
  const headers = ["Shift", "Form", "Product", "Sample Point", "Batch", "Readings", "Status", "Analyzed By", "Approved By"];
  const lines = rows.map((row) =>
    [
      row.shiftCode,
      row.formTitle,
      row.itemName,
      row.samplePointName,
      row.batchNo,
      row.readingCount,
      row.status,
      row.testedByName,
      row.approvedByName,
    ]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "physico-chemical-registers.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function QCPhysicoChemicalListPage({
  rows,
  filterOptions,
}: {
  rows: Array<Record<string, unknown>>;
  filterOptions?: {
    shifts?: Option[];
    items?: Option[];
    samplePoints?: Array<{ id: string; name: string; groupName: string }>;
    forms?: Array<{ id: string; code: string; title: string }>;
  };
}) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [itemId, setItemId] = useState("");
  const [samplePointId, setSamplePointId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "", shiftCode: "", itemId: "", samplePointId: "", formTitle: "", status: "" });

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const date = String(row.recordDate ?? "").slice(0, 10);
      if (applied.from && date < applied.from) return false;
      if (applied.to && date > applied.to) return false;
      if (applied.shiftCode && String(row.shiftCode ?? "") !== applied.shiftCode) return false;
      if (applied.itemId) {
        const item = (filterOptions?.items ?? []).find((entry) => entry.value === applied.itemId);
        const name = item?.label.split("—").pop()?.trim();
        if (item && String(row.itemName ?? "") !== item.label && String(row.itemName ?? "") !== name) return false;
      }
      if (applied.samplePointId) {
        const point = (filterOptions?.samplePoints ?? []).find((entry) => entry.id === applied.samplePointId);
        if (point && String(row.samplePointName ?? "") !== point.name) return false;
      }
      if (applied.formTitle && String(row.formTitle ?? "") !== applied.formTitle) return false;
      if (applied.status && String(row.status) !== applied.status) return false;
      return true;
    });
  }, [rows, applied, filterOptions]);

  function reset() {
    setFrom("");
    setTo("");
    setShiftCode("");
    setItemId("");
    setSamplePointId("");
    setFormTitle("");
    setStatus("");
    setApplied({ from: "", to: "", shiftCode: "", itemId: "", samplePointId: "", formTitle: "", status: "" });
  }

  return (
    <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
            <FlaskConical size={14} />
          </span>
          <h1 style={qcPageTitleStyle}>Physico-Chemical Registers</h1>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button type="button" style={greyButtonStyle} onClick={() => router.push("/qc")}>
            <ArrowLeft size={14} /> Back
          </button>
          <button type="button" style={primaryButtonStyle} onClick={() => router.push(`${BASE}/create`)}>
            <Plus size={14} /> New Register
          </button>
        </div>
      </div>

      <div className="no-print" style={{ ...cardStyle, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, alignItems: "end" }}>
          <Field label="From">
            <input type="date" style={qcInputStyle} value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" style={qcInputStyle} value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Field label="Shift">
            <select style={qcInputStyle} value={shiftCode} onChange={(event) => setShiftCode(event.target.value)}>
              <option value="">All</option>
              {(filterOptions?.shifts ?? []).map((shift) => (
                <option key={shift.value} value={shift.value}>{shift.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Product Volume">
            <select style={qcInputStyle} value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">All</option>
              {(filterOptions?.items ?? []).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Sample Point">
            <select style={qcInputStyle} value={samplePointId} onChange={(event) => setSamplePointId(event.target.value)}>
              <option value="">All</option>
              {(filterOptions?.samplePoints ?? []).map((point) => (
                <option key={point.id} value={point.id}>{point.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Form">
            <select style={qcInputStyle} value={formTitle} onChange={(event) => setFormTitle(event.target.value)}>
              <option value="">All</option>
              {(filterOptions?.forms ?? []).map((form) => (
                <option key={form.id} value={form.title}>{form.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select style={qcInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              {["DRAFT", "SUBMITTED", "CHECKED", "APPROVED", "REJECTED"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={primaryButtonStyle} onClick={() => setApplied({ from, to, shiftCode, itemId, samplePointId, formTitle, status })}>
            <Filter size={14} /> Filter
          </button>
          <button type="button" style={outlineButtonStyle} onClick={reset}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" style={outlineButtonStyle} onClick={() => exportCsv(filtered)}>
            <Download size={14} color="#16a34a" /> Export CSV
          </button>
          <button type="button" style={outlineButtonStyle} onClick={() => window.print()}>
            <Printer size={14} color={colors.primary[600]} /> Print
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 980, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Shift", "Form", "Product", "Sample Point", "Batch", "Readings", "Status", "Analyzed By", "Approved By"].map((label) => (
                  <th key={label} style={headingStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={String(row.id)}
                  onClick={() => router.push(`${BASE}/${row.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.shiftCode ?? "—")}</td>
                  <td style={qcTdStyle}>{String(row.formTitle ?? "—")}</td>
                  <td style={qcTdStyle}>{String(row.itemName ?? "—")}</td>
                  <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.samplePointName ?? "—")}</td>
                  <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.batchNo ?? "—")}</td>
                  <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.readingCount ?? "—")}</td>
                  <td style={{ ...qcTdStyle, textAlign: "center" }}><QCStatusBadge status={String(row.status)} /></td>
                  <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.testedByName ?? "—")}</td>
                  <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.approvedByName ?? "—")}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 20, color: colors.text.muted, textAlign: "center" }}>No records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function QCPhysicoChemicalFormPage({
  mode,
  context,
  record,
}: {
  mode: "create" | "edit" | "view";
  context: {
    catalog: { name: string; formCode: string; formTitle: string; minTableWidth: number };
    form: { id: string; code: string; title: string; frequencyName: string | null };
    specs: Spec[];
    forms: Array<{ id: string; code: string; title: string }>;
    samplePoints: Array<{ id: string; name: string; groupName: string }>;
    items: Option[];
    locations: Option[];
    shifts: Option[];
    itemSpecs: Array<{ itemId: string; kind: string; gramMin: number | null; gramMax: number | null; tolerance: number | null; label: string | null }>;
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("physicochemical")!;
  const readOnly = mode === "view";
  const allowed = QC_FORM_PARAMETERS.physicochemical ?? [];
  const specs = (context.specs ?? []).filter((spec) => spec.parameterCode !== "TIME" && allowed.includes(spec.parameterCode));
  const extra = parseExtra(record?.extraFields);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [formId, setFormId] = useState(String(record?.controlledFormId ?? context.form.id));
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(0, 10),
    shiftCode: String(record?.shiftCode ?? context.shifts[0]?.value ?? ""),
    itemId: String(record?.itemId ?? ""),
    samplePointId: String(record?.samplePointId ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
    remarks: String(record?.remarks ?? ""),
    backdateReason: String(record?.backdateReason ?? extra.backdateReason ?? ""),
  });
  const [readings, setReadings] = useState<ReadingRow[]>(() => readingsFromRecord(record, specs));
  const selectedForm = context.forms.find((form) => form.id === formId) ?? context.form;
  const volume = volumeFromItem(header.itemId, context.items, context.itemSpecs);
  const goBack = () => router.push(BASE);
  const canApprove = ["SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(String(record?.status ?? ""));

  async function save() {
    setMessage("");
    startTransition(async () => {
      const payload = {
        slug: "physicochemical",
        controlledFormId: formId,
        recordDate: header.recordDate,
        shiftCode: header.shiftCode || null,
        itemId: header.itemId || null,
        samplePointId: header.samplePointId || null,
        batchNo: header.batchNo || null,
        locationId: header.locationId || null,
        remarks: header.remarks,
        backdateReason: header.backdateReason,
        extraFields: { productVolume: volume },
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
        setMessage(body.error ?? "Unable to save register");
        return;
      }
      router.push(`${BASE}/${body.id ?? record?.id}`);
      router.refresh();
    });
  }

  async function workflow(path: string) {
    if (!record?.id) return;
    startTransition(async () => {
      const response = await fetch(`/api/qc/records/${record.id}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const body = await response.json();
      if (!response.ok) setMessage(body.error ?? "Workflow action failed");
      else router.refresh();
    });
  }

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center", flexShrink: 0 }}>
            <FlaskConical size={14} />
          </span>
          <h1 style={qcPageTitleStyle}>Purified Water Physico-Chemical Register</h1>
        </div>
        <button type="button" className="no-print" style={greyButtonStyle} onClick={goBack} disabled={pending}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      {message ? <p style={{ color: colors.danger[700], margin: 0, fontSize: 12 }}>{message}</p> : null}

      <div style={{ ...cardStyle, padding: 12 }}>
        <Field label="Controlled Form">
          <select style={qcInputStyle} value={formId} disabled={readOnly || Boolean(record?.id)} onChange={(event) => setFormId(event.target.value)}>
            {(context.forms.length ? context.forms : [{ id: context.form.id, code: context.form.code, title: context.form.title }]).map((form) => (
              <option key={form.id} value={form.id}>{form.code} — {form.title}</option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div style={{ padding: "8px 14px", background: colors.primary[700], color: "white", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12, fontWeight: 600 }}>
          <span>{selectedForm.code || catalog.formCode} — {selectedForm.title || catalog.formTitle}</span>
          <span style={{ marginLeft: "auto", fontWeight: 500 }}>{context.form.frequencyName || "Every Hour"}</span>
        </div>
        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <Field label="Test Date" required>
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
          <Field label="Product Volume">
            <QCSearchSelect
              value={header.itemId}
              disabled={readOnly}
              placeholder="Select ..."
              options={context.items}
              onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))}
            />
          </Field>
          <Field label="Sample Point">
            <QCSamplePointSelect value={header.samplePointId} points={context.samplePoints} disabled={readOnly} onChange={(value) => setHeader((current) => ({ ...current, samplePointId: value }))} />
          </Field>
          <Field label="Batch No">
            <input style={qcInputStyle} value={header.batchNo} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} />
          </Field>
        </div>
        {new Date(header.recordDate) < new Date(new Date().toDateString()) && !readOnly ? (
          <div style={{ padding: "0 12px 12px" }}>
            <Field label="Backdate reason" required>
              <input style={qcInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
            </Field>
          </div>
        ) : null}
      </div>

      <div style={{ ...cardStyle, padding: 12, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Controlled Specification</div>
          <a href="/qc/master-data" className="no-print" style={{ fontSize: 11, color: colors.primary[700] }}>Edit in QC Master Data</a>
        </div>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 1080, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Parameter / Test", "Method Reference / ISO", "Result Type", "Unit", "Min", "Max", "Acceptable Limit", "Qualitative Criterion", "Frequency"].map((label) => (
                  <th key={label} style={headingStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec) => {
                const resultType = PHYSICO_RESULT_TYPES.find((row) => row.id === physicoResultTypeId(spec.dataType))?.label ?? spec.dataType;
                return (
                  <tr key={spec.parameterId}>
                    <td style={qcTdStyle}>
                      <div>{spec.parameterName}</div>
                      <div style={{ marginTop: 2, fontSize: 10, color: colors.text.muted }}>{physicoParameterSlug(spec.parameterCode)}</div>
                    </td>
                    <td style={qcTdStyle}>{spec.methodReference || "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center", whiteSpace: "nowrap" }}>{resultType}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{spec.unitName || "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{spec.dataType === "NUMBER" && spec.minValue != null ? spec.minValue : "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{spec.dataType === "NUMBER" && spec.maxValue != null ? spec.maxValue : "—"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center", color: spec.configured ? colors.text.primary : "#c2410c" }}>
                      {spec.configured ? spec.acceptableLimit : spec.acceptableLimit || "Limit not configured"}
                    </td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{spec.qualitativeCriterion || "Absent / Undetectable"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{spec.frequencyName || context.form.frequencyName || "Every Hour"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.text.muted, fontStyle: "italic" }}>
          Hourly result cells follow this master: numeric parameters take a number, qualitative parameters take free text, and compliance uses the min/max or qualitative criterion saved above.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 12, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Hourly Results</div>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: Math.max(960, 220 + specs.length * 110), width: "max-content", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...headingStyle, minWidth: 110 }}>Time</th>
                <th style={{ ...headingStyle, minWidth: 70 }}>Vol</th>
                {specs.map((spec) => {
                  const heading = wrapHeading(spec.parameterName);
                  return (
                    <th key={spec.parameterCode} style={{ ...headingStyle, minWidth: 110 }}>
                      {heading.lines.map((line) => (
                        <span key={line} style={{ display: "block", lineHeight: 1.25 }}>{line}</span>
                      ))}
                      <span style={{ display: "block", marginTop: 2, fontSize: 10, fontWeight: 400, color: colors.text.muted }}>
                        {spec.dataType === "NUMBER" ? spec.unitName || "numeric" : "text"}
                      </span>
                    </th>
                  );
                })}
                {!readOnly ? <th style={{ ...headingStyle, width: 36 }}></th> : null}
              </tr>
            </thead>
            <tbody>
              {readings.map((row, index) => (
                <tr key={index}>
                  <td style={qcTdStyle}>
                    <input type="time" style={qcInputStyle} value={row.timeValue} disabled={readOnly} onChange={(event) => setReadings((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, timeValue: event.target.value } : item))} />
                  </td>
                  <td style={{ ...qcTdStyle, textAlign: "center", color: colors.text.secondary }}>{volume || "—"}</td>
                  {specs.map((spec) => (
                    <td key={spec.parameterCode} style={qcTdStyle}>
                      <input
                        style={qcInputStyle}
                        inputMode={spec.dataType === "NUMBER" ? "decimal" : "text"}
                        placeholder={spec.dataType === "NUMBER" ? (spec.unitName || "") : (spec.acceptableLimit || spec.qualitativeCriterion || "")}
                        value={row.values[spec.parameterCode] ?? ""}
                        disabled={readOnly}
                        onChange={(event) => setReadings((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, values: { ...item.values, [spec.parameterCode]: event.target.value } } : item))}
                      />
                    </td>
                  ))}
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
                          color: colors.danger[600],
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
          <div style={{ marginTop: 8, display: "grid", gap: 6, justifyItems: "start" }}>
            <button
              type="button"
              className="qc-add-row"
              onClick={() => setReadings((current) => [...current, emptyReading()])}
              style={{ ...primaryButtonStyle, width: "fit-content", maxWidth: "max-content", justifySelf: "start" }}
            >
              <Plus size={14} /> Add Reading
            </button>
            <p style={{ margin: 0, fontSize: 11, color: colors.text.muted }}>Empty rows are ignored. Readings are saved under one date, shift and product.</p>
          </div>
        ) : null}
      </div>

      <div style={{ ...cardStyle, padding: 12 }}>
        <Field label="Remark">
          <textarea style={{ ...qcInputStyle, minHeight: 72, height: 72 }} value={header.remarks} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
        </Field>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.text.muted }}>NOTE: after 24 hour taste</p>
      </div>

      {mode === "view" ? (
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {canSubmitDraft ? <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("submit")}>Submit</button> : null}
          {canApprove ? <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("approve")}>Approve</button> : null}
          {canSubmitDraft ? (
            <button type="button" style={greyButtonStyle} onClick={() => router.push(`${BASE}/${record?.id}/edit`)}>
              <Pencil size={14} /> Edit
            </button>
          ) : null}
        </div>
      ) : (
        <div className="no-print qc-save-row">
          <button type="button" style={primaryButtonStyle} onClick={save} disabled={pending}>
            <Save size={14} /> Save Register
          </button>
        </div>
      )}
    </div>
  );
}
