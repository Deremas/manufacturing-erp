"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, Pencil, Save } from "lucide-react";

import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { resultLineForSpec } from "@/services/qc/qc-record-specs";
import { QCSearchSelect } from "./QCSearchSelect";
import {
  QsBanner,
  QsField,
  QsListPage,
  QsValue,
  blank,
  dateValue,
  nameOnly,
  qsAreaStyle,
  qsBackStyle,
  qsInputStyle,
  qsSaveStyle,
  StatusPill,
} from "./QCQualityKit";

const BASE = "/qc/packaging";
const RESULT_OPTIONS = ["PASS", "FAIL", "N/A"];
const DECISION_OPTIONS = ["ACCEPTED", "REJECTED"];

type Option = { value: string; label: string };
type Spec = { parameterId: string; parameterCode: string; parameterName: string; dataType: string; acceptableLimit: string };
type ResultValue = { textValue: string; remarks: string };

const PACK_CHECKS: Record<string, { title: string; specification: string }> = {
  BOTTLE_CONDITION: { title: "Bottle / Jar Condition", specification: "No dents, scratches or deformation" },
  CAP_CONDITION: { title: "Cap Condition", specification: "Properly fitted, no cracks" },
  HANDLE_CONDITION: { title: "Handle Condition", specification: "Firmly attached, no damage" },
  LABEL_ALIGN: { title: "Label Alignment", specification: "Straight, not skewed" },
  LABEL_ADHESION: { title: "Label Adhesion", specification: "Fully adhered, no peeling" },
  LABEL_PRINT: { title: "Label Print Quality", specification: "Clear and readable" },
  DATE_CODING: { title: "Date Coding", specification: "Correct and legible" },
  SEAL_INTEGRITY: { title: "Seal Integrity", specification: "Tight, no leaks" },
  SHRINK_QUALITY: { title: "Shrink Quality", specification: "Even shrink, no burns" },
  PACK_COUNT: { title: "Pack Count", specification: "Matches specification" },
  CARTON_CONDITION: { title: "Carton Condition", specification: "Intact and dry" },
  CLEANLINESS: { title: "Cleanliness", specification: "Free from dust and contamination" },
  VISIBLE_DEFECT: { title: "Visible Defect", specification: "No visible defect" },
};

function parseExtra(value: unknown): Record<string, string> {
  if (!value) return {};
  const raw = typeof value === "string" ? (() => { try { return JSON.parse(value) as unknown; } catch { return {}; } })() : value;
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([key, entry]) => [key, entry == null ? "" : String(entry)]));
}

function specMeta(spec: Spec) {
  return PACK_CHECKS[spec.parameterCode] ?? { title: spec.parameterName, specification: spec.acceptableLimit || "As per standard" };
}

function resultsFromRecord(record: Record<string, unknown> | null | undefined, specs: Spec[]) {
  const map: Record<string, ResultValue> = {};
  for (const spec of specs) {
    const line = resultLineForSpec(record, spec);
    map[spec.parameterId] = {
      textValue: line?.textValue != null && String(line.textValue) !== "" ? String(line.textValue) : line?.numericValue != null ? String(line.numericValue) : "",
      remarks: String(line?.remarks ?? ""),
    };
  }
  return map;
}

export function QCPackagingListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  const catalog = getQcCatalogEntry("packaging")!;
  const mapped = rows.map((row) => {
    const extra = parseExtra(row.extraFields);
    return {
      ...row,
      itemName: row.itemName ?? extra.itemName,
      decision: extra.overallResult || extra.finalDecision || "",
    };
  });
  return (
    <QsListPage
      title="Packaging Inspections"
      formCode={catalog.formCode}
      newLabel="New Inspection"
      createHref={`${BASE}/create`}
      viewBase={BASE}
      columns={[
        { key: "recordDate", label: "Date" },
        { key: "shiftCode", label: "Shift" },
        { key: "itemName", label: "Product" },
        { key: "batchNo", label: "Batch No" },
        { key: "decision", label: "Decision" },
        { key: "status", label: "Status" },
      ]}
      rows={mapped}
    />
  );
}

export function QCPackagingFormPage({
  mode,
  context,
  record,
}: {
  mode: "create" | "edit" | "view";
  context: {
    form: { id: string };
    specs: Spec[];
    items: Option[];
    locations: Option[];
    shifts: Option[];
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("packaging")!;
  const readOnly = mode === "view";
  const extra = parseExtra(record?.extraFields);
  const specs = context.specs ?? [];
  const itemOptions = useMemo(() => context.items.map((item) => ({ ...item, label: nameOnly(item.label) })), [context.items]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: dateValue(record?.recordDate) || new Date().toISOString().slice(0, 10),
    shiftCode: String(record?.shiftCode ?? ""),
    itemId: String(record?.itemId ?? ""),
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    remarks: String(record?.remarks ?? ""),
    overallResult: extra.overallResult ?? extra.finalDecision ?? "",
    backdateReason: String(record?.backdateReason ?? ""),
  });
  const [results, setResults] = useState<Record<string, ResultValue>>(() => resultsFromRecord(record, specs));
  const itemLabel = itemOptions.find((item) => item.value === header.itemId)?.label || String(record?.itemName ?? "-");
  const shiftLabel = context.shifts.find((shift) => shift.value === header.shiftCode)?.label || header.shiftCode;
  const locationLabel = context.locations.find((location) => location.value === header.locationId)?.label || String(record?.locationName ?? "-");
  const canEdit = ["DRAFT", "REJECTED"].includes(String(record?.status ?? "DRAFT"));
  const canApprove = ["DRAFT", "SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));

  async function save() {
    setMessage("");
    if (!header.shiftCode) return setMessage("Shift is required");
    if (!header.itemId) return setMessage("Product is required");
    startTransition(async () => {
      const url = mode === "edit" && record?.id ? `/api/qc/records/${record.id}` : "/api/qc/records";
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "packaging",
          controlledFormId: context.form.id,
          recordDate: header.recordDate,
          shiftCode: header.shiftCode,
          itemId: header.itemId,
          locationId: header.locationId || null,
          batchNo: header.batchNo || null,
          remarks: header.remarks,
          backdateReason: header.backdateReason,
          extraFields: { overallResult: header.overallResult, finalDecision: header.overallResult },
          readings: [],
          results: specs.map((spec) => ({
            parameterId: spec.parameterId,
            textValue: results[spec.parameterId]?.textValue || null,
            remarks: results[spec.parameterId]?.remarks || null,
          })),
        }),
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
      if (!response.ok) setMessage(body.error ?? "Action failed");
      else router.refresh();
    });
  }

  const visualTable = (
    <div className="qc-mr-results-scroll">
      <table className="qc-mr-form-table" style={{ minWidth: 720 }}>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Specification</th>
            <th>Observation</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => {
            const meta = specMeta(spec);
            const value = results[spec.parameterId] ?? { textValue: "", remarks: "" };
            return (
              <tr key={spec.parameterId}>
                <td>{meta.title}</td>
                <td>{meta.specification}</td>
                <td>
                  {readOnly ? blank(value.remarks) || "-" : (
                    <input style={qsInputStyle} value={value.remarks} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, remarks: event.target.value } }))} />
                  )}
                </td>
                <td style={{ width: 110 }}>
                  {readOnly ? value.textValue || "-" : (
                    <select style={{ ...qsInputStyle, width: 92 }} value={value.textValue} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, textValue: event.target.value } }))}>
                      <option value="">--</option>
                      {RESULT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
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

  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <FileText size={18} color="#0f172a" />
          <h1>Packaging Inspection</h1>
        </div>
        <div className="qc-mr-actions no-print">
          <button type="button" style={qsBackStyle} onClick={() => router.push(BASE)}><ArrowLeft size={14} /> Back</button>
          {readOnly && canEdit ? <button type="button" style={qsBackStyle} onClick={() => router.push(`${BASE}/${record?.id}/edit`)}><Pencil size={14} /> Edit</button> : null}
          {readOnly && canEdit ? <button type="button" style={qsSaveStyle} disabled={pending} onClick={() => workflow("submit")}>Submit</button> : null}
          {readOnly && canApprove ? <button type="button" style={{ ...qsSaveStyle, background: "#16a34a" }} disabled={pending} onClick={() => workflow("approve")}><Check size={14} /> Approve</button> : null}
        </div>
      </div>
      {message ? <p className="qc-mr-error">{message}</p> : null}
      <div className="qc-mr-card">
        <QsBanner code={catalog.formCode} title="Packaging Inspection" />
        <div className="qc-mr-body">
          <div className="qc-mr-fields">
            <QsField label="Date" required>
              {readOnly ? <QsValue>{header.recordDate}</QsValue> : <input type="date" style={qsInputStyle} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />}
            </QsField>
            <QsField label="Shift" required>
              {readOnly ? <QsValue>{shiftLabel}</QsValue> : (
                <select style={qsInputStyle} value={header.shiftCode} onChange={(event) => setHeader((current) => ({ ...current, shiftCode: event.target.value }))}>
                  <option value="">- Select -</option>
                  {context.shifts.map((shift) => <option key={shift.value} value={shift.value}>{shift.label}</option>)}
                </select>
              )}
            </QsField>
            <QsField label="Product" required>
              {readOnly ? <QsValue>{itemLabel}</QsValue> : <QCSearchSelect value={header.itemId} required placeholder="- Select -" options={itemOptions} onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))} />}
            </QsField>
            <QsField label="Location">
              {readOnly ? <QsValue>{locationLabel}</QsValue> : <QCSearchSelect value={header.locationId} placeholder="- Select -" options={context.locations} onChange={(value) => setHeader((current) => ({ ...current, locationId: value }))} />}
            </QsField>
            <QsField label="Batch No">
              {readOnly ? <QsValue>{header.batchNo}</QsValue> : <input style={qsInputStyle} value={header.batchNo} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} />}
            </QsField>
            <QsField label="Final Decision">
              {readOnly ? <QsValue>{header.overallResult ? <StatusPill status={header.overallResult} /> : "-"}</QsValue> : (
                <select style={qsInputStyle} value={header.overallResult} onChange={(event) => setHeader((current) => ({ ...current, overallResult: event.target.value }))}>
                  <option value="">--</option>
                  {DECISION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              )}
            </QsField>
          </div>
          {new Date(header.recordDate) < new Date(new Date().toDateString()) && !readOnly ? (
            <QsField label="Backdate reason" required>
              <input style={qsInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
            </QsField>
          ) : null}
          <div className="qc-mr-label">Visual Inspection</div>
          {visualTable}
          <QsField label="Remark">
            {readOnly ? <QsValue>{header.remarks}</QsValue> : <textarea style={{ ...qsAreaStyle, width: "100%" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />}
          </QsField>
          {readOnly ? null : (
            <div className="qc-save-row no-print">
              <button type="button" style={qsSaveStyle} onClick={save} disabled={pending}><Save size={14} /> Save Inspection</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
