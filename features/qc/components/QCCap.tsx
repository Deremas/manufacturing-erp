"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, ClipboardCheck, Clock, Eye, Pencil, Plus, Save } from "lucide-react";

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

const BASE = "/qc/cap";
const RESULT_OPTIONS = ["PASS", "FAIL", "N/A"];
const DECISION_OPTIONS = ["ACCEPTED", "REJECTED"];

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

const CAP_CHECKS: Record<string, { title: string; specification: string; section: "visual" | "weight" }> = {
  CAP_COLOR: { title: "Cap color", specification: "As per approved sample", section: "visual" },
  CAP_TYPE: { title: "Cap type", specification: "Correct design & fit", section: "visual" },
  CLEANLINESS: { title: "Cleanliness", specification: "Free from dust, oil, or contamination", section: "visual" },
  DEFECTS: { title: "Defects", specification: "No cracks, deformation, or flashing", section: "visual" },
  PACKAGING: { title: "Packaging", specification: "Intact, properly sealed, labeled", section: "visual" },
  FOREIGN_ODOR: { title: "Odor", specification: "No foreign or chemical smell", section: "visual" },
  ACTUAL_WEIGHT: { title: "Cap Weight (g)", specification: "", section: "weight" },
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

function nameOnly(label: string) {
  const parts = label.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : label;
}

function formatDisplayDate(value: unknown) {
  const date = String(value ?? "").slice(0, 10);
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

function formatQuantity(value: unknown) {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
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
  return result || "";
}

function specCheck(spec: Spec) {
  if (CAP_CHECKS[spec.parameterCode]) return CAP_CHECKS[spec.parameterCode];
  const name = spec.parameterName.toLowerCase();
  if (name.includes("color") || name.includes("colour")) return CAP_CHECKS.CAP_COLOR;
  if (name.includes("type") || name.includes("design")) return CAP_CHECKS.CAP_TYPE;
  if (name.includes("clean")) return CAP_CHECKS.CLEANLINESS;
  if (name.includes("defect") || name.includes("crack")) return CAP_CHECKS.DEFECTS;
  if (name.includes("packag") || name.includes("seal") || name.includes("label")) return CAP_CHECKS.PACKAGING;
  if (name.includes("odor") || name.includes("odour") || name.includes("smell")) return CAP_CHECKS.FOREIGN_ODOR;
  if (name.includes("weight")) return CAP_CHECKS.ACTUAL_WEIGHT;
  return { title: spec.parameterName, specification: spec.acceptableLimit || spec.qualitativeCriterion || "", section: "visual" as const };
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

export function QCCapListPage({
  rows,
}: {
  rows: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("cap")!;

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
            <ClipboardCheck size={14} />
          </span>
          <div>
            <h1 style={qcPageTitleStyle}>Cap Quality Inspections</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode}</p>
          </div>
        </div>
        <button type="button" className="no-print qc-add-row" style={{ ...primaryButtonStyle, marginTop: 10 }} onClick={() => router.push(`${BASE}/create`)}>
          <Plus size={14} /> New Inspection
        </button>
      </div>

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 920, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Supplier", "Material", "Batch No", "Quantity", "Decision", "Status", ""].map((label) => (
                  <th key={label || "actions"} style={headingStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const extra = parseExtra(row.extraFields);
                const decision = displayInspectionResult(extra.overallResult || extra.finalDecision || "");
                return (
                  <tr key={String(row.id)}>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{formatDisplayDate(row.recordDate)}</td>
                    <td style={qcTdStyle}>{nameOnly(String(row.supplierName ?? extra.supplierName ?? "—"))}</td>
                    <td style={qcTdStyle}>{String(row.itemName ?? extra.itemName ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.batchNo ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{formatQuantity(row.quantity ?? extra.receivedQuantity)}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      {decision ? <QCResultBadge result={decision} /> : "—"}
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

export function QCCapFormPage({
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
  const catalog = getQcCatalogEntry("cap")!;
  const readOnly = mode === "view";
  const extra = parseExtra(record?.extraFields);
  const specs = context.specs ?? [];
  const visualSpecs = specs.filter((spec) => specCheck(spec).section === "visual");
  const weightSpec = specs.find((spec) => specCheck(spec).section === "weight" || spec.parameterCode === "ACTUAL_WEIGHT");
  const itemOptions = useMemo(() => context.items.map((item) => ({ ...item, label: nameOnly(item.label) })), [context.items]);
  const supplierOptions = useMemo(() => context.suppliers.map((supplier) => ({ ...supplier, label: nameOnly(supplier.label) })), [context.suppliers]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(0, 10),
    itemId: String(record?.itemId ?? ""),
    supplierId: String(record?.supplierId ?? ""),
    supplierName: extra.supplierName ?? "",
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    vehicleNo: extra.vehicleNo ?? extra.deliveryVehicleNo ?? "",
    quantity: record?.quantity == null ? extra.receivedQuantity ?? "" : String(record.quantity),
    deliveryDate: extra.deliveryDate ?? "",
    poNo: extra.poNo ?? extra.purchaseOrderNo ?? "",
    remarks: String(record?.remarks ?? ""),
    weightResult: extra.weightResult ?? "",
    overallResult: extra.overallResult ?? extra.finalDecision ?? "",
    backdateReason: String(record?.backdateReason ?? ""),
  });
  const [results, setResults] = useState<Record<string, ResultValue>>(() => resultsFromRecord(record, specs));
  const goBack = () => router.push(BASE);
  const canApprove = ["SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(String(record?.status ?? ""));
  const itemLabel = itemOptions.find((item) => item.value === header.itemId)?.label || String(record?.itemName ?? "—");
  const supplierLabel = supplierOptions.find((supplier) => supplier.value === header.supplierId)?.label || nameOnly(String(record?.supplierName ?? header.supplierName ?? "—"));
  const itemSpec = context.itemSpecs.find((row) => row.itemId === header.itemId && row.kind === "CAP") ?? context.itemSpecs.find((row) => row.itemId === header.itemId);
  const weightValue = weightSpec ? results[weightSpec.parameterId] ?? { textValue: "", remarks: "" } : { textValue: "", remarks: "" };
  const weightSpecText = itemSpec && (itemSpec.gramMin != null || itemSpec.gramMax != null)
    ? `${itemSpec.gramMin ?? "—"}${itemSpec.gramMax != null ? `-${itemSpec.gramMax}` : ""}g`
    : "";
  const overallDisplay = displayInspectionResult(header.overallResult || String(record?.result ?? ""));

  function patchResult(parameterId: string, current: ResultValue, patch: Partial<ResultValue>) {
    setResults((map) => ({ ...map, [parameterId]: { ...current, ...patch } }));
  }

  async function save() {
    setMessage("");
    if (!header.itemId) return setMessage("Material name is required");
    if (!header.supplierId && !header.supplierName.trim()) return setMessage("Supplier is required");
    startTransition(async () => {
      const payload = {
        slug: "cap",
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
          supplierName: header.supplierName,
          vehicleNo: header.vehicleNo,
          deliveryVehicleNo: header.vehicleNo,
          receivedQuantity: header.quantity,
          deliveryDate: header.deliveryDate,
          poNo: header.poNo,
          purchaseOrderNo: header.poNo,
          weightResult: header.weightResult,
          overallResult: header.overallResult,
          finalDecision: header.overallResult,
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
        <h1 style={qcPageTitleStyle}>Cap Quality Test</h1>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>
          Form {catalog.formCode}{record?.recordNo ? ` — ${String(record.recordNo)}` : ""}
        </p>
      </div>
    </div>
  );

  const visualTable = (
    <div className="qc-raw-water-grid">
      <table style={{ minWidth: 720, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Parameter", "Specification", "Observation", "Result"].map((label) => (
              <th key={label} style={headingStyle}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visualSpecs.map((spec) => {
            const meta = specCheck(spec);
            const value = results[spec.parameterId] ?? { textValue: "", remarks: "" };
            return (
              <tr key={spec.parameterId}>
                <td style={qcTdStyle}>{meta.title}</td>
                <td style={qcTdStyle}>{meta.specification || spec.acceptableLimit || "—"}</td>
                <td style={{ ...qcTdStyle, minWidth: 160 }}>
                  {readOnly ? (
                    value.remarks || "—"
                  ) : (
                    <input
                      style={qcInputStyle}
                      value={value.remarks}
                      onChange={(event) => patchResult(spec.parameterId, value, { remarks: event.target.value })}
                    />
                  )}
                </td>
                <td style={{ ...qcTdStyle, width: 110, minWidth: 92 }}>
                  {readOnly ? (
                    value.textValue || "—"
                  ) : (
                    <select
                      style={{ ...qcInputStyle, width: 92, minWidth: 92 }}
                      value={value.textValue}
                      onChange={(event) => patchResult(spec.parameterId, value, { textValue: event.target.value })}
                    >
                      <option value="">--</option>
                      {RESULT_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
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
            <div style={{ fontSize: 13, fontWeight: 700 }}>1. Supplier & Delivery Details</div>
            {overallDisplay ? <QCResultBadge result={overallDisplay} /> : null}
          </div>
          <div className="qc-cap-details">
            <Info label="Date" value={formatDisplayDate(header.recordDate)} />
            <Info label="Material Name" value={itemLabel} />
            <Info label="Supplier" value={supplierLabel} />
            <Info label="Batch/Lot Number" value={header.batchNo} />
            <Info label="Delivery Vehicle No" value={header.vehicleNo} />
            <Info label="Received Quantity" value={formatQuantity(header.quantity)} />
            <Info label="Delivery Date" value={header.deliveryDate ? formatDisplayDate(header.deliveryDate) : "—"} />
            <Info label="Purchase Order No" value={header.poNo} />
            <Info label="Prepared By" value={String(record?.testedByName ?? "—")} />
            <Info label="Status" value={<QCStatusBadge status={String(record?.status ?? "")} />} />
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>2. Visual & Physical Inspection</div>
          {visualTable}
        </div>

        <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>3. Lab Test & Final Decision</div>
          <div className="qc-cap-lab">
            <Info label={`Cap Weight (g)${weightSpecText ? ` Spec: ${weightSpecText}` : ""}`} value={weightValue.textValue} />
            <Info label="Weight Result" value={header.weightResult || "—"} />
            <Info label="Final Decision" value={overallDisplay || "—"} />
          </div>
          <Info label="Remarks" value={header.remarks} />
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>1. Supplier & Delivery Details</div>
        <div className="qc-cap-details">
          <Field label="Date" required>
            <input type="date" style={qcInputStyle} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />
          </Field>
          <Field label="Material Name" required>
            <QCSearchSelect value={header.itemId} required placeholder="- Select -" options={itemOptions} onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))} />
          </Field>
          <Field label="Supplier" required>
            <QCSearchSelect value={header.supplierId} required placeholder="- Select -" options={supplierOptions} onChange={(value) => setHeader((current) => ({ ...current, supplierId: value }))} />
          </Field>
          <Field label="Batch/Lot Number">
            <input style={qcInputStyle} value={header.batchNo} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} />
          </Field>
          <Field label="Delivery Vehicle No">
            <input style={qcInputStyle} value={header.vehicleNo} onChange={(event) => setHeader((current) => ({ ...current, vehicleNo: event.target.value }))} />
          </Field>
          <Field label="Received Quantity">
            <input style={qcInputStyle} value={header.quantity} onChange={(event) => setHeader((current) => ({ ...current, quantity: event.target.value }))} />
          </Field>
          <Field label="Delivery Date">
            <input type="date" style={qcInputStyle} value={header.deliveryDate} onChange={(event) => setHeader((current) => ({ ...current, deliveryDate: event.target.value }))} />
          </Field>
          <Field label="Purchase Order No">
            <input style={qcInputStyle} value={header.poNo} onChange={(event) => setHeader((current) => ({ ...current, poNo: event.target.value }))} />
          </Field>
        </div>
        {new Date(header.recordDate) < new Date(new Date().toDateString()) ? (
          <Field label="Backdate reason" required className="qc-field-lg">
            <input style={qcInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
          </Field>
        ) : null}
      </div>

      <div style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>2. Visual & Physical Inspection</div>
        {visualTable}
      </div>

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>3. Lab Test & Final Decision</div>
        <div className="qc-cap-lab">
          <Field label={`Cap Weight (g)${weightSpecText ? ` Spec: ${weightSpecText}` : ""}`}>
            {weightSpec ? (
              <input
                style={qcInputStyle}
                value={weightValue.textValue}
                onChange={(event) => patchResult(weightSpec.parameterId, weightValue, { textValue: event.target.value })}
              />
            ) : (
              <input style={qcInputStyle} disabled value="" />
            )}
          </Field>
          <Field label="Weight Result">
            <select style={qcInputStyle} value={header.weightResult} onChange={(event) => setHeader((current) => ({ ...current, weightResult: event.target.value }))}>
              <option value="">--</option>
              {RESULT_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Final Decision">
            <select style={qcInputStyle} value={header.overallResult} onChange={(event) => setHeader((current) => ({ ...current, overallResult: event.target.value }))}>
              <option value="">--</option>
              {DECISION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Remarks">
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
