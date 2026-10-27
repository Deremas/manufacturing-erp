"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, Clock, Eye, Pencil, Plus, Save, Search } from "lucide-react";

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

const BASE = "/qc/preform";
const VISUAL_OPTIONS = ["PASS", "FAIL", "N/A"];
const OVERALL_OPTIONS = ["ACCEPTED", "REJECTED", "PENDING"];

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

export function QCPreformListPage({
  rows,
}: {
  rows: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("preform")!;

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
            <Search size={14} />
          </span>
          <div>
            <h1 style={qcPageTitleStyle}>Raw Material (Preform) Inspections</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode}</p>
          </div>
        </div>
        <button type="button" className="no-print qc-add-row" style={primaryButtonStyle} onClick={() => router.push(`${BASE}/create`)}>
          <Plus size={14} /> New Inspection
        </button>
      </div>

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 980, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Supplier", "Preform Type", "Batch No", "Quantity", "Result", "Status", ""].map((label) => (
                  <th key={label || "actions"} style={headingStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const extra = parseExtra(row.extraFields);
                return (
                  <tr key={String(row.id)}>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.recordDate ?? "").slice(0, 10)}</td>
                    <td style={qcTdStyle}>{String(row.supplierName ?? extra.supplierName ?? "—")}</td>
                    <td style={qcTdStyle}>{String(row.itemName ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.batchNo ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{row.quantity == null ? "—" : String(row.quantity)}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <QCResultBadge result={displayInspectionResult(extra.overallResult || String(row.result ?? "PENDING"))} />
                    </td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}><QCStatusBadge status={String(row.status)} /></td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <Link href={`${BASE}/${row.id}`} aria-label="View" title="View" style={iconButtonStyle}><Eye size={14} /></Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 20, color: colors.text.muted, textAlign: "center" }}>No records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function QCPreformFormPage({
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
  const catalog = getQcCatalogEntry("preform")!;
  const readOnly = mode === "view";
  const extra = parseExtra(record?.extraFields);
  const specs = context.specs ?? [];
  const visualSpecs = specs.filter((spec) => spec.parameterCode !== "ACTUAL_WEIGHT");
  const weightSpec = specs.find((spec) => spec.parameterCode === "ACTUAL_WEIGHT");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(0, 10),
    inspectionTime: extra.inspectionTime ?? "",
    itemId: String(record?.itemId ?? ""),
    supplierId: String(record?.supplierId ?? ""),
    supplierName: extra.supplierName ?? "",
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    poNo: extra.poNo ?? "",
    quantity: record?.quantity == null ? "" : String(record.quantity),
    remarks: String(record?.remarks ?? ""),
    overallResult: extra.overallResult ?? "",
    backdateReason: String(record?.backdateReason ?? ""),
  });
  const [results, setResults] = useState<Record<string, ResultValue>>(() => resultsFromRecord(record, specs));
  const goBack = () => router.push(BASE);
  const canApprove = ["SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(String(record?.status ?? ""));
  const itemLabel = context.items.find((item) => item.value === header.itemId)?.label || String(record?.itemName ?? "—");
  const supplierLabel = context.suppliers.find((supplier) => supplier.value === header.supplierId)?.label || String(record?.supplierName ?? header.supplierName ?? "—");
  const itemSpec = context.itemSpecs.find((row) => row.itemId === header.itemId && row.kind === "PREFORM") ?? context.itemSpecs.find((row) => row.itemId === header.itemId);
  const weightRange = itemSpec && (itemSpec.gramMin != null || itemSpec.gramMax != null)
    ? `${itemSpec.gramMin ?? "—"} – ${itemSpec.gramMax ?? "—"}${itemSpec.tolerance != null ? ` ± ${itemSpec.tolerance}` : ""} g`
    : "";
  const weightValue = weightSpec ? results[weightSpec.parameterId] ?? { textValue: "", remarks: "" } : { textValue: "", remarks: "" };
  const overallDisplay = displayInspectionResult(header.overallResult || String(record?.result ?? "PENDING"));

  async function save() {
    setMessage("");
    if (!header.itemId) return setMessage("Preform type is required");
    if (!header.supplierId && !header.supplierName.trim()) return setMessage("Supplier is required");
    startTransition(async () => {
      const payload = {
        slug: "preform",
        controlledFormId: context.form.id,
        recordDate: header.recordDate,
        itemId: header.itemId || null,
        supplierId: header.supplierId || null,
        batchNo: header.batchNo || null,
        locationId: header.locationId || null,
        quantity: header.quantity ? Number(header.quantity) : null,
        remarks: header.remarks,
        backdateReason: header.backdateReason,
        extraFields: {
          inspectionTime: header.inspectionTime,
          supplierName: header.supplierName,
          poNo: header.poNo,
          overallResult: header.overallResult,
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

  const visualTable = (
    <div className="qc-raw-water-grid">
      <table style={{ minWidth: 720, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Check", "Acceptance Criteria", "Result", "Remarks"].map((label) => (
              <th key={label} style={headingStyle}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visualSpecs.map((spec) => {
            const value = results[spec.parameterId] ?? { textValue: "", remarks: "" };
            return (
              <tr key={spec.parameterId}>
                <td style={qcTdStyle}>{spec.parameterName}</td>
                <td style={qcTdStyle}>{spec.acceptableLimit}</td>
                <td style={{ ...qcTdStyle, minWidth: 120 }}>
                  {readOnly ? (
                    value.textValue || "—"
                  ) : (
                    <select style={qcInputStyle} value={value.textValue} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, textValue: event.target.value } }))}>
                      <option value="">--</option>
                      {VISUAL_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td style={qcTdStyle}>
                  {readOnly ? value.remarks || "—" : (
                    <input style={qcInputStyle} value={value.remarks} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, remarks: event.target.value } }))} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (readOnly) {
    return (
      <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
        <div className="qc-page-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
              <Search size={14} />
            </span>
            <div>
              <h1 style={qcPageTitleStyle}>Raw Material (Preform) Inspection</h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode}</p>
            </div>
          </div>
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
            <div style={{ fontSize: 13, fontWeight: 700 }}>1. General Information</div>
            <QCResultBadge result={overallDisplay} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <Info label="Date of Inspection" value={header.recordDate} />
            <Info label="Time" value={header.inspectionTime} />
            <Info label="Supplier" value={supplierLabel} />
            <Info label="Batch No" value={header.batchNo} />
            <Info label="PO No" value={header.poNo} />
            <Info label="Quantity Received" value={header.quantity} />
            <Info label="Preform Type" value={itemLabel} />
            <Info label="Inspected By" value={String(record?.testedByName ?? "—")} />
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>1.2 Visual Inspection</div>
          {visualTable}
        </div>

        <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>1.3 Weight Check</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
            <Info label="Actual Weight (g)" value={weightValue.textValue} />
            <Info label="Weight Result" value={weightValue.result ? <QCResultBadge result={weightValue.result === "PASS" ? "PASS" : displayInspectionResult(weightValue.result)} /> : "—"} />
          </div>
          {header.remarks ? <Info label="Inspector Comments / Observation" value={header.remarks} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
            <Search size={14} />
          </span>
          <div>
            <h1 style={qcPageTitleStyle}>Raw Material (Preform) Inspection</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode}</p>
          </div>
        </div>
        <button type="button" className="no-print" style={greyButtonStyle} onClick={goBack} disabled={pending}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      {message ? <p style={{ color: colors.danger[700], margin: 0, fontSize: 12 }}>{message}</p> : null}

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>1. General Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <Field label="Date of Inspection" required>
            <input type="date" style={qcInputStyle} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />
          </Field>
          <Field label="Time">
            <input type="time" style={qcInputStyle} value={header.inspectionTime} onChange={(event) => setHeader((current) => ({ ...current, inspectionTime: event.target.value }))} />
          </Field>
          <Field label="Supplier" required>
            <QCSearchSelect value={header.supplierId} required placeholder="Select ..." options={context.suppliers} onChange={(value) => setHeader((current) => ({ ...current, supplierId: value }))} />
          </Field>
          <Field label="Or Supplier Name">
            <input style={qcInputStyle} value={header.supplierName} onChange={(event) => setHeader((current) => ({ ...current, supplierName: event.target.value }))} />
          </Field>
          <Field label="Supplier Batch No">
            <input style={qcInputStyle} value={header.batchNo} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} />
          </Field>
          <Field label="Purchase Order No">
            <input style={qcInputStyle} value={header.poNo} onChange={(event) => setHeader((current) => ({ ...current, poNo: event.target.value }))} />
          </Field>
          <Field label="Quantity Received">
            <input style={qcInputStyle} value={header.quantity} onChange={(event) => setHeader((current) => ({ ...current, quantity: event.target.value }))} />
          </Field>
          <Field label="Preform Type" required>
            <QCSearchSelect value={header.itemId} required placeholder="Select ..." options={context.items} onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))} />
          </Field>
        </div>
        {!weightRange ? (
          <p style={{ margin: 0, fontSize: 11, color: "#c2410c" }}>
            Gram range is not configured for this preform type. Configure it in{" "}
            <Link href="/qc/master-data" style={{ color: "#c2410c", fontWeight: 700 }}>QC Master Data</Link>.
          </p>
        ) : null}
        {new Date(header.recordDate) < new Date(new Date().toDateString()) ? (
          <Field label="Backdate reason" required>
            <input style={qcInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
          </Field>
        ) : null}
      </div>

      <div style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>1.2 Visual Inspection</div>
        {visualTable}
      </div>

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>1.3 Weight Check</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {weightSpec ? (
            <Field label="Actual Weight (g)">
              <input
                style={qcInputStyle}
                value={weightValue.textValue}
                onChange={(event) => setResults((current) => ({ ...current, [weightSpec.parameterId]: { ...weightValue, textValue: event.target.value } }))}
              />
            </Field>
          ) : null}
          <Field label="Overall Result">
            <select style={qcInputStyle} value={header.overallResult} onChange={(event) => setHeader((current) => ({ ...current, overallResult: event.target.value }))}>
              <option value="">Select ...</option>
              {OVERALL_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>
        {weightRange ? <p style={{ margin: 0, fontSize: 11, color: colors.text.muted }}>Configured range: {weightRange}</p> : null}
        <Field label="Inspector Comments / Observation">
          <textarea style={{ ...qcInputStyle, minHeight: 72, height: 72 }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
        </Field>
        <div className="qc-save-row no-print">
          <button type="button" style={outlineButtonStyle} onClick={goBack} disabled={pending}>Cancel</button>
          <button type="button" className="qc-add-row" style={primaryButtonStyle} onClick={save} disabled={pending}>
            <Save size={14} /> Save Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
