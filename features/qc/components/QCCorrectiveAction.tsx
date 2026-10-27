"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, FileText, Pencil, Plus, Save, X } from "lucide-react";

import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { publicViewUrl } from "@/lib/routing";

import {
  QsField,
  QsValue,
  StatusPill,
  dateValue,
  padRows,
  qsAddStyle,
  qsAreaStyle,
  qsBackStyle,
  qsInputStyle,
  qsSaveStyle,
  qsViewStyle,
} from "./QCQualityKit";

const BASE = "/qc/corrective-action";
const FORM_CODE = "QC-CAPLAN";

type CapaLine = {
  nonconformity: string;
  ncrNo: string;
  rootCause: string;
  actions: string;
  followUpDates: string;
  responsibility: string;
};

const emptyLine = (): CapaLine => ({
  nonconformity: "",
  ncrNo: "",
  rootCause: "",
  actions: "",
  followUpDates: "",
  responsibility: "",
});
const lineAreaStyle: React.CSSProperties = { ...qsAreaStyle, height: 64, minHeight: 64, width: "100%" };

function toLine(row: Record<string, unknown>): CapaLine {
  return {
    nonconformity: String(row.nonconformity ?? ""),
    ncrNo: String(row.ncrNo ?? ""),
    rootCause: String(row.rootCause ?? ""),
    actions: String(row.actions ?? ""),
    followUpDates: String(row.followUpDates ?? ""),
    responsibility: String(row.responsibility ?? ""),
  };
}

function seedLines(record: Record<string, unknown> | null | undefined, mode: "create" | "edit" | "view") {
  const rows = Array.isArray(record?.lines)
    ? (record.lines as Array<Record<string, unknown>>).map(toLine)
    : [];
  return padRows(rows, emptyLine, mode === "create" ? 3 : Math.max(rows.length, 1));
}

export function QCCorrectiveActionListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  const router = useRouter();
  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <FileText size={18} color="#0f172a" />
          <h1>Corrective Action ({FORM_CODE})</h1>
        </div>
        <div className="qc-mr-actions no-print">
          <button type="button" style={qsSaveStyle} onClick={() => router.push(`${BASE}/create`)}>
            <Plus size={14} /> New Plan
          </button>
        </div>
      </div>
      <div className="qc-mr-card">
        <table className="qc-mr-list-table">
          <thead>
            <tr>
              {["Date", "Function / Planner", "Prepared By", "Status", ""].map((label) => (
                <th key={label || "view"}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.id)}
                className="qc-row-link"
                onClick={() => router.push(row.publicId != null ? publicViewUrl("qc.capa", Number(row.publicId)) : `${BASE}/${row.id}`)}
              >
                <td>{dateValue(row.planDate)}</td>
                <td>{String(row.functionName ?? "")}</td>
                <td>{String(row.preparedByName ?? "")}</td>
                <td><StatusPill status={String(row.status ?? "")} /></td>
                <td>
                  <Link href={row.publicId != null ? publicViewUrl("qc.capa", Number(row.publicId)) : `${BASE}/${row.id}`} style={qsViewStyle} onClick={(event) => event.stopPropagation()}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="qc-mr-empty">No records yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QCCorrectiveActionFormPage({
  mode,
  record,
}: {
  mode: "create" | "edit" | "view";
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const readOnly = mode === "view";
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    planDate: dateValue(record?.planDate) || new Date().toISOString().slice(0, 10),
    functionName: String(record?.functionName ?? ""),
    sourceType: String(record?.sourceType ?? ""),
    sourceId: String(record?.sourceId ?? ""),
    remarks: String(record?.remarks ?? ""),
  });
  const [lines, setLines] = useState<CapaLine[]>(() => seedLines(record, mode));
  const canEdit = ["DRAFT", "REJECTED"].includes(String(record?.status ?? "DRAFT"));
  const canApprove = ["DRAFT", "SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));

  function patchLine(index: number, patch: Partial<CapaLine>) {
    setLines((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function save() {
    setMessage("");
    if (!header.planDate) return setMessage("Date is required");
    startTransition(async () => {
      const url = mode === "edit" && record?.id ? `/api/qc/corrective-actions/${record.id}` : "/api/qc/corrective-actions";
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...header, lines }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save plan");
        return;
      }
      router.push(`${BASE}/${body.id ?? record?.id}`);
      router.refresh();
    });
  }

  async function approve() {
    if (!record?.id) return;
    startTransition(async () => {
      const response = await fetch(`/api/qc/corrective-actions/${record.id}/approve`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(body.error ?? "Unable to approve");
      else router.refresh();
    });
  }

  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <FileText size={18} color="#0f172a" />
          <h1>Corrective Action Plan</h1>
        </div>
        <div className="qc-mr-actions no-print">
          <button type="button" style={qsBackStyle} onClick={() => router.push(BASE)} disabled={pending}>
            <ArrowLeft size={14} /> Back
          </button>
          {readOnly && canEdit ? (
            <button type="button" style={qsBackStyle} onClick={() => router.push(`${BASE}/${record?.id}/edit`)}>
              <Pencil size={14} /> Edit
            </button>
          ) : null}
          {readOnly && canApprove ? (
            <button type="button" style={{ ...qsSaveStyle, background: "#16a34a" }} disabled={pending} onClick={approve}>
              <Check size={14} /> Approve
            </button>
          ) : null}
        </div>
      </div>
      {message ? <p className="qc-mr-error">{message}</p> : null}

      <div className="qc-mr-card">
        <div className="qc-mr-banner">
          <span>{FORM_CODE}</span>
          <span>— Corrective Action Plan</span>
        </div>
        <div className="qc-mr-body">
          <div className={readOnly ? "qc-capa-top qc-capa-top-view" : "qc-capa-top"}>
            <QsField label="Date" required>
              {readOnly ? <QsValue>{header.planDate}</QsValue> : (
                <input type="date" style={qsInputStyle} value={header.planDate} onChange={(event) => setHeader((current) => ({ ...current, planDate: event.target.value }))} />
              )}
            </QsField>
            <QsField label="Name of Function / Planner">
              {readOnly ? <QsValue>{header.functionName}</QsValue> : (
                <input style={qsInputStyle} value={header.functionName} onChange={(event) => setHeader((current) => ({ ...current, functionName: event.target.value }))} />
              )}
            </QsField>
            {readOnly ? (
              <>
                <QsField label="Plan No"><QsValue>{String(record?.planNo ?? "-")}</QsValue></QsField>
                <QsField label="Prepared By"><QsValue>{String(record?.preparedByName ?? "-")}</QsValue></QsField>
                <QsField label="Status"><StatusPill status={String(record?.status ?? "")} /></QsField>
              </>
            ) : (
              <>
                <QsField label="Source Type">
                  <input style={qsInputStyle} value={header.sourceType} onChange={(event) => setHeader((current) => ({ ...current, sourceType: event.target.value }))} />
                </QsField>
                <QsField label="Source Id">
                  <input style={qsInputStyle} value={header.sourceId} onChange={(event) => setHeader((current) => ({ ...current, sourceId: event.target.value }))} />
                </QsField>
              </>
            )}
          </div>

          {readOnly ? (
            <div className="qc-capa-top">
              <QsField label="Source Type"><QsValue>{header.sourceType}</QsValue></QsField>
              <QsField label="Source Id"><QsValue>{header.sourceId}</QsValue></QsField>
            </div>
          ) : null}

          <div className="qc-mr-results-scroll">
            <table className="qc-mr-form-table qc-capa-lines">
              <thead>
                <tr>
                  <th>Actual / Potential Non-Conformities</th>
                  <th>NCR No.</th>
                  <th>Root Causes</th>
                  <th>Actions to Be Taken</th>
                  <th>Follow-Up Date(s)</th>
                  <th>Responsibility</th>
                  {readOnly ? null : <th style={{ width: 28 }} />}
                </tr>
              </thead>
              <tbody>
                {lines.map((row, index) => (
                  <tr key={index}>
                    <td>
                      {readOnly ? <div className="qc-mr-value">{row.nonconformity || "-"}</div> : (
                        <textarea style={lineAreaStyle} value={row.nonconformity} onChange={(event) => patchLine(index, { nonconformity: event.target.value })} />
                      )}
                    </td>
                    <td style={{ width: 110 }}>
                      {readOnly ? <div className="qc-mr-value">{row.ncrNo || "-"}</div> : (
                        <input style={qsInputStyle} value={row.ncrNo} onChange={(event) => patchLine(index, { ncrNo: event.target.value })} />
                      )}
                    </td>
                    <td>
                      {readOnly ? <div className="qc-mr-value">{row.rootCause || "-"}</div> : (
                        <textarea style={lineAreaStyle} value={row.rootCause} onChange={(event) => patchLine(index, { rootCause: event.target.value })} />
                      )}
                    </td>
                    <td>
                      {readOnly ? <div className="qc-mr-value">{row.actions || "-"}</div> : (
                        <textarea style={lineAreaStyle} value={row.actions} onChange={(event) => patchLine(index, { actions: event.target.value })} />
                      )}
                    </td>
                    <td style={{ width: 130 }}>
                      {readOnly ? <div className="qc-mr-value">{row.followUpDates || "-"}</div> : (
                        <input style={qsInputStyle} value={row.followUpDates} onChange={(event) => patchLine(index, { followUpDates: event.target.value })} />
                      )}
                    </td>
                    <td style={{ width: 150 }}>
                      {readOnly ? <div className="qc-mr-value">{row.responsibility || "-"}</div> : (
                        <input style={qsInputStyle} value={row.responsibility} onChange={(event) => patchLine(index, { responsibility: event.target.value })} />
                      )}
                    </td>
                    {readOnly ? null : (
                      <td>
                        <button
                          type="button"
                          aria-label="Remove action"
                          className="qc-mr-x"
                          onClick={() => setLines((rows) => blankOrRemoveRow(rows, index, emptyLine()))}
                          style={{ cursor: "pointer" }}
                        >
                          <X size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {readOnly ? null : (
            <button type="button" className="qc-add-row" style={qsAddStyle} onClick={() => setLines((rows) => [...rows, emptyLine()])}>
              <Plus size={13} /> Add action
            </button>
          )}

          <QsField label="Remarks">
            {readOnly ? <QsValue>{header.remarks}</QsValue> : (
              <textarea style={{ ...qsAreaStyle, width: "100%", height: 72, minHeight: 72 }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
            )}
          </QsField>

          {readOnly ? null : (
            <div className="qc-save-row no-print">
              <button type="button" style={qsSaveStyle} onClick={save} disabled={pending}>
                <Save size={14} /> Save Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
