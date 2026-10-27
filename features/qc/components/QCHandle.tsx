"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, ClipboardCheck, Clock, Eye, Filter, Pencil, Plus, RotateCcw, Save } from "lucide-react";

import { colors } from "@/components/ui/colors";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { resultLineForSpec } from "@/services/qc/qc-record-specs";
import { QCResultBadge, QCStatusBadge } from "./QCStatusBadge";
import { QCSearchSelect } from "./QCSearchSelect";
import {
  qcFieldLabelStyle,
  qcInputStyle,
  qcPageTitleStyle,
  qcTdStyle,
  qcThStyle,
  qcToolbarButtonStyle,
} from "./QCWideTable";

const BASE = "/qc/handle";
const RESULT_OPTIONS = ["PASS", "FAIL", "N/A"];

type Option = { value: string; label: string };
type Spec = {
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
  acceptableLimit: string;
  configured?: boolean;
  qualitativeCriterion?: string | null;
};
type ResultValue = { textValue: string; remarks: string; result?: string };

const cardStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};
const greyButtonStyle: React.CSSProperties = { ...qcToolbarButtonStyle, width: "fit-content" };
const primaryButtonStyle: React.CSSProperties = { ...qcToolbarButtonStyle, width: "fit-content", background: colors.primary[600] };
const outlineButtonStyle: React.CSSProperties = {
  ...qcToolbarButtonStyle,
  width: "fit-content",
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
const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "inline-grid",
  placeItems: "center",
  border: `1px solid ${colors.primary[200]}`,
  borderRadius: 6,
  background: "white",
  color: colors.primary[700],
};

const HANDLE_CHECKS: Record<string, { title: string; description: string; section: "visual" | "functional" | "weight" }> = {
  CONTAMINATION: {
    title: "Contamination & Color",
    description: "Free from dirt, oil, foreign matter and colour variation.",
    section: "visual",
  },
  MOLDING_DEFECTS: {
    title: "Molding Defects",
    description: "No flash, short shot, warpage, sink marks or cracks.",
    section: "visual",
  },
  FITMENT: {
    title: "Fitment Test",
    description: "Handle seats firmly on the bottle without looseness.",
    section: "functional",
  },
  LOAD_STRESS: {
    title: "Load / Stress Test",
    description: "Withstands handling load without bending or breaking.",
    section: "functional",
  },
  ACTUAL_WEIGHT: {
    title: "Weight (g) tolerance +/- 0.5",
    description: "",
    section: "weight",
  },
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

function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`qc-field ${className ?? ""}`.trim()} style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <span className="qc-field-label" style={qcFieldLabelStyle}>
        {label}
        {required ? <span style={{ color: colors.danger[600] }}> *</span> : ""}
      </span>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
      <span style={qcFieldLabelStyle}>{label}</span>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary }}>{value || "—"}</div>
    </div>
  );
}

function displayInspectionResult(result: string) {
  if (result === "PASS" || result === "PASSED" || result === "WITHIN_SPEC") return "ACCEPTED";
  if (result === "FAIL" || result === "FAILED" || result === "OUT_OF_SPEC") return "REJECTED";
  return result || "PENDING";
}

function specCheck(spec: Spec) {
  if (HANDLE_CHECKS[spec.parameterCode]) return HANDLE_CHECKS[spec.parameterCode];
  const name = spec.parameterName.toLowerCase();
  if (name.includes("contaminat") || name.includes("color")) return HANDLE_CHECKS.CONTAMINATION;
  if (name.includes("mold")) return HANDLE_CHECKS.MOLDING_DEFECTS;
  if (name.includes("fitment")) return HANDLE_CHECKS.FITMENT;
  if (name.includes("load") || name.includes("stress")) return HANDLE_CHECKS.LOAD_STRESS;
  if (name.includes("weight")) return HANDLE_CHECKS.ACTUAL_WEIGHT;
  return null;
}

function resultsFromRecord(record: Record<string, unknown> | null | undefined, specs: Spec[]) {
  const map: Record<string, ResultValue> = {};
  for (const spec of specs) {
    const line = resultLineForSpec(record, spec);
    map[spec.parameterId] = {
      textValue: line?.textValue != null && String(line.textValue) !== "" ? String(line.textValue) : line?.numericValue != null ? String(line.numericValue) : "",
      remarks: String(line?.remarks ?? ""),
      result: line?.result ? String(line.result) : undefined,
    };
  }
  return map;
}

function InspectionRow({
  title,
  description,
  value,
  readOnly,
  onChange,
}: {
  title: string;
  description?: string;
  value: ResultValue;
  readOnly: boolean;
  onChange: (patch: Partial<ResultValue>) => void;
}) {
  return (
    <div className="qc-inspect-row">
      <div className="qc-inspect-copy">
        <span className="qc-field-label" style={qcFieldLabelStyle}>{title}</span>
        {description ? <p>{description}</p> : null}
      </div>
      {readOnly ? (
        <div style={{ fontSize: 13, fontWeight: 600 }}>{value.textValue || "—"}</div>
      ) : (
        <select
          className="qc-inspect-result"
          style={qcInputStyle}
          value={value.textValue}
          onChange={(event) => onChange({ textValue: event.target.value })}
        >
          <option value="">-</option>
          {RESULT_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}
      {readOnly ? (
        <div style={{ fontSize: 13 }}>{value.remarks || "—"}</div>
      ) : (
        <input
          className="qc-inspect-remarks"
          style={qcInputStyle}
          placeholder="Remarks"
          value={value.remarks}
          onChange={(event) => onChange({ remarks: event.target.value })}
        />
      )}
    </div>
  );
}

export function QCHandleListPage({
  rows,
  filterOptions,
}: {
  rows: Array<Record<string, unknown>>;
  filterOptions?: { items?: Option[]; suppliers?: Option[] };
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("handle")!;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [itemId, setItemId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "", itemId: "", supplierId: "", result: "", status: "" });

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const date = String(row.recordDate ?? "").slice(0, 10);
      if (applied.from && date < applied.from) return false;
      if (applied.to && date > applied.to) return false;
      if (applied.itemId && String(row.itemId ?? "") !== applied.itemId) return false;
      if (applied.supplierId && String(row.supplierId ?? "") !== applied.supplierId) return false;
      if (applied.result && displayInspectionResult(String(row.result ?? "")) !== applied.result && String(row.result) !== applied.result) return false;
      if (applied.status && String(row.status) !== applied.status) return false;
      return true;
    });
  }, [rows, applied]);

  function reset() {
    setFrom("");
    setTo("");
    setItemId("");
    setSupplierId("");
    setResult("");
    setStatus("");
    setApplied({ from: "", to: "", itemId: "", supplierId: "", result: "", status: "" });
  }

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
            <ClipboardCheck size={14} />
          </span>
          <div>
            <h1 style={qcPageTitleStyle}>Handle Inspection</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode}</p>
          </div>
        </div>
        <button type="button" className="no-print qc-add-row" style={primaryButtonStyle} onClick={() => router.push(`${BASE}/create`)}>
          <Plus size={14} /> New Inspection
        </button>
      </div>

      <div className="no-print qc-filter-bar" style={{ ...cardStyle, padding: 12 }}>
        <div className="qc-compact-grid">
          <Field label="From" className="qc-field-date">
            <input type="date" style={qcInputStyle} value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To" className="qc-field-date">
            <input type="date" style={qcInputStyle} value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Field label="Product / Material" className="qc-field-lg">
            <select style={qcInputStyle} value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">All Product / Material</option>
              {(filterOptions?.items ?? []).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Supplier" className="qc-field-lg">
            <select style={qcInputStyle} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">All Supplier</option>
              {(filterOptions?.suppliers ?? []).map((supplier) => (
                <option key={supplier.value} value={supplier.value}>{supplier.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Result" className="qc-field-md">
            <select style={qcInputStyle} value={result} onChange={(event) => setResult(event.target.value)}>
              <option value="">All Result</option>
              {["ACCEPTED", "REJECTED", "PENDING"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Status" className="qc-field-md">
            <select style={qcInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All Status</option>
              {["DRAFT", "SUBMITTED", "CHECKED", "APPROVED", "REJECTED"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </Field>
          <div className="qc-filter-actions">
            <button type="button" style={primaryButtonStyle} onClick={() => setApplied({ from, to, itemId, supplierId, result, status })}>
              <Filter size={14} /> Filter
            </button>
            <button type="button" style={outlineButtonStyle} onClick={reset}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 880, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Supplier", "Batch No", "Result", "Status", "Recorded By", ""].map((label) => (
                  <th key={label || "actions"} style={headingStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const extra = parseExtra(row.extraFields);
                return (
                  <tr key={String(row.id)}>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.recordDate ?? "").slice(0, 10)}</td>
                    <td style={qcTdStyle}>{String(row.supplierName ?? extra.supplierName ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.batchNo ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <QCResultBadge result={displayInspectionResult(extra.overallResult || String(row.result ?? "PENDING"))} />
                    </td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}><QCStatusBadge status={String(row.status)} /></td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.testedByName ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <Link href={`${BASE}/${row.id}`} aria-label="View" title="View" style={iconButtonStyle}><Eye size={14} /></Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 20, color: colors.text.muted, textAlign: "center" }}>No records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function QCHandleFormPage({
  mode,
  context,
  record,
}: {
  mode: "create" | "edit" | "view";
  context: {
    catalog: { name: string; formCode: string; formTitle: string };
    form: { id: string; code: string; title: string; frequencyName: string | null };
    specs: Spec[];
    items: Option[];
    locations: Option[];
    suppliers: Option[];
    itemSpecs: Array<{ itemId: string; kind: string; gramMin: number | null; gramMax: number | null; tolerance: number | null; label: string | null }>;
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("handle")!;
  const readOnly = mode === "view";
  const extra = parseExtra(record?.extraFields);
  const specs = context.specs ?? [];
  const visualSpecs = specs.filter((spec) => specCheck(spec)?.section === "visual");
  const functionalSpecs = specs.filter((spec) => specCheck(spec)?.section === "functional");
  const weightSpec = specs.find((spec) => specCheck(spec)?.section === "weight" || spec.parameterCode === "ACTUAL_WEIGHT");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(0, 10),
    itemId: String(record?.itemId ?? ""),
    supplierId: String(record?.supplierId ?? ""),
    supplierName: extra.supplierName ?? "",
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    remarks: String(record?.remarks ?? ""),
    overallResult: extra.overallResult ?? extra.weightResult ?? "",
    backdateReason: String(record?.backdateReason ?? ""),
  });
  const [results, setResults] = useState<Record<string, ResultValue>>(() => resultsFromRecord(record, specs));
  const goBack = () => router.push(BASE);
  const canApprove = ["SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(String(record?.status ?? ""));
  const supplierLabel = context.suppliers.find((supplier) => supplier.value === header.supplierId)?.label || String(record?.supplierName ?? header.supplierName ?? "—");
  const itemSpec = context.itemSpecs.find((row) => row.itemId === header.itemId && row.kind === "HANDLE") ?? context.itemSpecs.find((row) => row.itemId === header.itemId);
  const weightValue = weightSpec ? results[weightSpec.parameterId] ?? { textValue: "", remarks: "" } : { textValue: "", remarks: "" };
  const overallDisplay = displayInspectionResult(header.overallResult || String(record?.result ?? "PENDING"));
  const weightTolerance = itemSpec?.tolerance ?? 0.5;

  function patchResult(parameterId: string, current: ResultValue, patch: Partial<ResultValue>) {
    setResults((map) => ({ ...map, [parameterId]: { ...current, ...patch } }));
  }

  async function save() {
    setMessage("");
    if (!header.supplierId && !header.supplierName.trim()) return setMessage("Supplier is required");
    startTransition(async () => {
      const payload = {
        slug: "handle",
        controlledFormId: context.form.id,
        recordDate: header.recordDate,
        itemId: header.itemId || null,
        supplierId: header.supplierId || null,
        batchNo: header.batchNo || null,
        locationId: header.locationId || null,
        remarks: header.remarks,
        backdateReason: header.backdateReason,
        extraFields: {
          supplierName: header.supplierName,
          overallResult: header.overallResult,
          weightResult: header.overallResult,
        },
        readings: [],
        results: specs.map((spec) => ({
          parameterId: spec.parameterId,
          textValue: results[spec.parameterId]?.textValue || null,
          numericValue: spec.dataType === "NUMBER" && results[spec.parameterId]?.textValue ? Number(results[spec.parameterId].textValue) : null,
          remarks: results[spec.parameterId]?.remarks || null,
        })),
      };
      const url = mode === "edit" && record?.id ? `/api/qc/records/${record.id}` : "/api/qc/records";
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save inspection");
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

  const titleBlock = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
        <ClipboardCheck size={14} />
      </span>
      <div>
        <h1 style={qcPageTitleStyle}>Bottle Handle Inspection</h1>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>
          Form {catalog.formCode}{record?.recordNo ? ` — ${String(record.recordNo)}` : ""}
        </p>
      </div>
    </div>
  );

  if (readOnly) {
    return (
      <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1100, minWidth: 0 }}>
        <div className="qc-page-toolbar">
          {titleBlock}
          <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" style={greyButtonStyle} onClick={goBack}><ArrowLeft size={14} /> Back</button>
            {canSubmitDraft ? (
              <button type="button" style={greyButtonStyle} onClick={() => router.push(`${BASE}/${record?.id}/edit`)}>
                <Pencil size={14} /> Edit
              </button>
            ) : null}
            {canSubmitDraft ? <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("submit")}>Submit</button> : null}
            {canApprove ? <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("approve")}><Check size={14} /> Approve</button> : null}
          </div>
        </div>
        {message ? <p style={{ color: colors.danger[700], margin: 0, fontSize: 12 }}>{message}</p> : null}
        {canApprove || String(record?.status) === "SUBMITTED" ? (
          <div style={{ background: "#fff7ed", border: "1px solid #fdba74", color: "#c2410c", borderRadius: 8, padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={14} /> This inspection is pending approval.
          </div>
        ) : null}

        <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Inspection Details</div>
            <QCResultBadge result={overallDisplay} />
          </div>
          <div className="qc-handle-details">
            <Info label="Date" value={header.recordDate} />
            <Info label="Supplier" value={supplierLabel} />
            <Info label="Batch No" value={header.batchNo} />
            <Info label="Record No" value={String(record?.recordNo ?? "—")} />
            <Info label="Status" value={<QCStatusBadge status={String(record?.status ?? "")} />} />
            <Info label="Inspected By" value={String(record?.testedByName ?? "—")} />
          </div>
        </div>

        <div style={{ ...cardStyle, padding: "8px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, padding: "6px 0" }}>1. Visual Inspection</div>
          {visualSpecs.map((spec) => {
            const meta = specCheck(spec);
            const value = results[spec.parameterId] ?? { textValue: "", remarks: "" };
            return <InspectionRow key={spec.parameterId} title={meta?.title ?? spec.parameterName} description={meta?.description} value={value} readOnly onChange={() => undefined} />;
          })}
        </div>

        <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>2. Weight Test</div>
          <div className="qc-handle-weight">
            <Info label={`Weight (g) tolerance +/- ${weightTolerance}`} value={weightValue.textValue} />
            <Info label="Result" value={header.overallResult || "—"} />
          </div>
        </div>

        <div style={{ ...cardStyle, padding: "8px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, padding: "6px 0" }}>3. Functional Test</div>
          {functionalSpecs.map((spec) => {
            const meta = specCheck(spec);
            const value = results[spec.parameterId] ?? { textValue: "", remarks: "" };
            return <InspectionRow key={spec.parameterId} title={meta?.title ?? spec.parameterName} description={meta?.description} value={value} readOnly onChange={() => undefined} />;
          })}
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <Info label="Remark" value={header.remarks} />
        </div>
      </div>
    );
  }

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1100, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        {titleBlock}
        <button type="button" className="no-print" style={greyButtonStyle} onClick={goBack} disabled={pending}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      {message ? <p style={{ color: colors.danger[700], margin: 0, fontSize: 12 }}>{message}</p> : null}

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Inspection Details</div>
        <div className="qc-handle-details">
          <Field label="Date" required>
            <input type="date" style={qcInputStyle} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />
          </Field>
          <Field label="Supplier" required>
            <QCSearchSelect value={header.supplierId} required placeholder="- Select -" options={context.suppliers} onChange={(value) => setHeader((current) => ({ ...current, supplierId: value }))} />
          </Field>
          <Field label="Batch No">
            <input style={qcInputStyle} value={header.batchNo} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} />
          </Field>
        </div>
        {new Date(header.recordDate) < new Date(new Date().toDateString()) ? (
          <Field label="Backdate reason" required className="qc-field-lg">
            <input style={qcInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
          </Field>
        ) : null}
      </div>

      <div style={{ ...cardStyle, padding: "8px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, padding: "6px 0" }}>1. Visual Inspection</div>
        {visualSpecs.map((spec) => {
          const meta = specCheck(spec);
          const value = results[spec.parameterId] ?? { textValue: "", remarks: "" };
          return (
            <InspectionRow
              key={spec.parameterId}
              title={meta?.title ?? spec.parameterName}
              description={meta?.description}
              value={value}
              readOnly={false}
              onChange={(patch) => patchResult(spec.parameterId, value, patch)}
            />
          );
        })}
      </div>

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>2. Weight Test</div>
        <div className="qc-handle-weight">
          {weightSpec ? (
            <Field label={`Weight (g) tolerance +/- ${weightTolerance}`}>
              <input
                style={qcInputStyle}
                value={weightValue.textValue}
                onChange={(event) => patchResult(weightSpec.parameterId, weightValue, { textValue: event.target.value })}
              />
            </Field>
          ) : null}
          <Field label="Result">
            <select style={qcInputStyle} value={header.overallResult} onChange={(event) => setHeader((current) => ({ ...current, overallResult: event.target.value }))}>
              <option value="">-</option>
              {RESULT_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: "8px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, padding: "6px 0" }}>3. Functional Test</div>
        {functionalSpecs.map((spec) => {
          const meta = specCheck(spec);
          const value = results[spec.parameterId] ?? { textValue: "", remarks: "" };
          return (
            <InspectionRow
              key={spec.parameterId}
              title={meta?.title ?? spec.parameterName}
              description={meta?.description}
              value={value}
              readOnly={false}
              onChange={(patch) => patchResult(spec.parameterId, value, patch)}
            />
          );
        })}
      </div>

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 8 }}>
        <Field label="Remark">
          <textarea style={{ ...qcInputStyle, minHeight: 72, height: 72, width: "100%" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
        </Field>
        <div className="qc-save-row no-print">
          <button type="button" className="qc-add-row" style={primaryButtonStyle} onClick={save} disabled={pending}>
            <Save size={14} /> Save Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
