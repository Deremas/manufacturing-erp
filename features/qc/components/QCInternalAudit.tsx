"use client";

import Link from "next/link";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { publicViewUrl } from "@/lib/routing";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, Pencil, Plus, Save, Search, X } from "lucide-react";

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

const BASE = "/qc/internal-audit";
const FORM_CODE = "OF/MM/QC/51";

type Finding = { nonconformity: string; rootCause: string; correction: string; effectiveness: string };

const emptyFinding = (): Finding => ({ nonconformity: "", rootCause: "", correction: "", effectiveness: "" });
const findingAreaStyle: React.CSSProperties = { ...qsAreaStyle, height: 72, minHeight: 72, width: "100%" };

function toFinding(row: Record<string, unknown>): Finding {
  return {
    nonconformity: String(row.nonconformity ?? ""),
    rootCause: String(row.rootCause ?? ""),
    correction: String(row.correction || row.correctiveAction || row.preventiveAction || ""),
    effectiveness: String(row.effectiveness ?? ""),
  };
}

function seedFindings(record: Record<string, unknown> | null | undefined, mode: "create" | "edit" | "view") {
  const rows = Array.isArray(record?.findings)
    ? (record.findings as Array<Record<string, unknown>>).map(toFinding)
    : [];
  return padRows(rows, emptyFinding, mode === "create" ? 2 : Math.max(rows.length, 1));
}

export function QCInternalAuditListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  const router = useRouter();
  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <Search size={18} color="#0f172a" />
          <h1>Internal Audit Findings ({FORM_CODE})</h1>
        </div>
        <div className="qc-mr-actions no-print">
          <button type="button" style={qsSaveStyle} onClick={() => router.push(`${BASE}/create`)}>
            <Plus size={14} /> New Finding
          </button>
        </div>
      </div>
      <div className="qc-mr-card">
        <table className="qc-mr-list-table">
          <thead>
            <tr>
              {["Date", "Audit No", "Responsible", "Prepared By", "Status", ""].map((label) => (
                <th key={label || "view"}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.id)}
                className="qc-row-link"
                onClick={() => router.push(row.publicId != null ? publicViewUrl("qc.audit", Number(row.publicId)) : `${BASE}/${row.id}`)}
              >
                <td>{dateValue(row.auditDate)}</td>
                <td>{String(row.auditNo ?? "")}</td>
                <td>{String(row.auditee || row.leadAuditorName || "")}</td>
                <td>{String(row.preparedByName ?? "")}</td>
                <td><StatusPill status={String(row.status ?? "")} /></td>
                <td>
                  <Link href={row.publicId != null ? publicViewUrl("qc.audit", Number(row.publicId)) : `${BASE}/${row.id}`} style={qsViewStyle} onClick={(event) => event.stopPropagation()}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="qc-mr-empty">No findings yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QCInternalAuditFormPage({
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
    auditDate: dateValue(record?.auditDate) || new Date().toISOString().slice(0, 10),
    auditNo: String(record?.auditNo ?? ""),
    responsible: String(record?.auditee ?? ""),
    evaluatedBy: String(record?.remarks ?? ""),
  });
  const [findings, setFindings] = useState<Finding[]>(() => seedFindings(record, mode));
  const canEdit = ["DRAFT", "REJECTED"].includes(String(record?.status ?? "DRAFT"));
  const canApprove = ["DRAFT", "SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));

  function patchFinding(index: number, patch: Partial<Finding>) {
    setFindings((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function save() {
    setMessage("");
    if (!header.auditDate) return setMessage("Date is required");
    startTransition(async () => {
      const url = mode === "edit" && record?.id ? `/api/qc/internal-audits/${record.id}` : "/api/qc/internal-audits";
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditDate: header.auditDate,
          auditNo: header.auditNo,
          auditee: header.responsible,
          remarks: header.evaluatedBy,
          findings: findings.map((row) => ({
            ...row,
            correctiveAction: row.correction,
            preventiveAction: row.correction,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save finding");
        return;
      }
      router.push(`${BASE}/${body.id ?? record?.id}`);
      router.refresh();
    });
  }

  async function approve() {
    if (!record?.id) return;
    startTransition(async () => {
      const response = await fetch(`/api/qc/internal-audits/${record.id}/approve`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(body.error ?? "Unable to approve");
      else router.refresh();
    });
  }

  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <Search size={18} color="#0f172a" />
          <h1>Internal Audit Finding Clearance & Evaluation</h1>
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
          <span>— Internal Audit Finding Clearance and Evaluation Form</span>
        </div>
        <div className="qc-mr-body">
          <div className={readOnly ? "qc-audit-top qc-audit-top-view" : "qc-audit-top"}>
            <QsField label="Date" required>
              {readOnly ? <QsValue>{header.auditDate}</QsValue> : (
                <input type="date" style={qsInputStyle} value={header.auditDate} onChange={(event) => setHeader((current) => ({ ...current, auditDate: event.target.value }))} />
              )}
            </QsField>
            <QsField label="Based on Audit No.">
              {readOnly ? <QsValue>{header.auditNo}</QsValue> : (
                <input style={qsInputStyle} value={header.auditNo} onChange={(event) => setHeader((current) => ({ ...current, auditNo: event.target.value }))} />
              )}
            </QsField>
            {readOnly ? (
              <>
                <QsField label="Prepared By"><QsValue>{String(record?.preparedByName ?? "-")}</QsValue></QsField>
                <QsField label="Status"><StatusPill status={String(record?.status ?? "")} /></QsField>
              </>
            ) : null}
          </div>

          <div className="qc-mr-results-scroll">
            <table className="qc-mr-form-table qc-audit-findings">
              <thead>
                <tr>
                  <th>Non-Conformity (auditee)</th>
                  <th>Root Cause (auditee)</th>
                  <th>Correction / Corrective / Preventive Action (auditor)</th>
                  <th>Effectiveness</th>
                  {readOnly ? null : <th style={{ width: 28 }} />}
                </tr>
              </thead>
              <tbody>
                {findings.map((row, index) => (
                  <tr key={index}>
                    <td>
                      {readOnly ? <div className="qc-mr-value">{row.nonconformity || "-"}</div> : (
                        <textarea style={findingAreaStyle} value={row.nonconformity} onChange={(event) => patchFinding(index, { nonconformity: event.target.value })} />
                      )}
                    </td>
                    <td>
                      {readOnly ? <div className="qc-mr-value">{row.rootCause || "-"}</div> : (
                        <textarea style={findingAreaStyle} value={row.rootCause} onChange={(event) => patchFinding(index, { rootCause: event.target.value })} />
                      )}
                    </td>
                    <td>
                      {readOnly ? <div className="qc-mr-value">{row.correction || "-"}</div> : (
                        <textarea style={findingAreaStyle} value={row.correction} onChange={(event) => patchFinding(index, { correction: event.target.value })} />
                      )}
                    </td>
                    <td style={{ width: 140 }}>
                      {readOnly ? <div className="qc-mr-value">{row.effectiveness || "-"}</div> : (
                        <input style={qsInputStyle} value={row.effectiveness} onChange={(event) => patchFinding(index, { effectiveness: event.target.value })} />
                      )}
                    </td>
                    {readOnly ? null : (
                      <td>
                        <button
                          type="button"
                          aria-label="Remove finding"
                          className="qc-mr-x"
                          onClick={() => setFindings((rows) => blankOrRemoveRow(rows, index, emptyFinding()))}
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
            <button type="button" className="qc-add-row" style={qsAddStyle} onClick={() => setFindings((rows) => [...rows, emptyFinding()])}>
              <Plus size={13} /> Add finding
            </button>
          )}

          <div className="qc-audit-foot">
            <QsField label="Responsible for the actions">
              {readOnly ? <QsValue>{header.responsible}</QsValue> : (
                <input style={qsInputStyle} value={header.responsible} onChange={(event) => setHeader((current) => ({ ...current, responsible: event.target.value }))} />
              )}
            </QsField>
            <QsField label="Effectiveness evaluated by">
              {readOnly ? <QsValue>{header.evaluatedBy}</QsValue> : (
                <input style={qsInputStyle} value={header.evaluatedBy} onChange={(event) => setHeader((current) => ({ ...current, evaluatedBy: event.target.value }))} />
              )}
            </QsField>
          </div>

          {readOnly ? null : (
            <div className="qc-save-row no-print">
              <button type="button" style={qsSaveStyle} onClick={save} disabled={pending}>
                <Save size={14} /> Save Finding
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
