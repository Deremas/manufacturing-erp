"use client";

import Link from "next/link";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { publicViewUrl } from "@/lib/routing";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, FileText, Pencil, Plus, Save, X } from "lucide-react";

import { colors } from "@/components/ui/colors";

const BASE = "/qc/management-review";
const FORM_CODE = "OF/MM/QC/49";
const DRAFT_AGENDA_SEED = "1.\n2.\n3.";

type Participant = { name: string; title: string; contribution: string };
type ResultRow = { agenda: string; resolution: string; responsible: string; timeFrame: string };

const emptyParticipant = (): Participant => ({ name: "", title: "", contribution: "" });
const emptyResult = (): ResultRow => ({ agenda: "", resolution: "", responsible: "", timeFrame: "" });

const inputStyle: React.CSSProperties = {
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
const areaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 92,
  minHeight: 92,
  resize: "vertical",
  lineHeight: "18px",
};
const backStyle: React.CSSProperties = {
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
const saveStyle: React.CSSProperties = { ...backStyle, background: colors.primary[700] };
const addStyle: React.CSSProperties = {
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
const viewStyle: React.CSSProperties = {
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
  REJECTED: { bg: "#dc2626", color: "#fff" },
};

function padRows<T>(rows: T[], seed: () => T, min = 3) {
  const next = rows.length ? [...rows] : [];
  while (next.length < min) next.push(seed());
  return next.length ? next : [seed()];
}

function asRows<T extends Record<string, string>>(value: unknown, keys: Array<keyof T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    return Object.fromEntries(keys.map((key) => [key, String(record[String(key)] ?? "")])) as T;
  });
}

function dateValue(value: unknown) {
  return String(value ?? "").slice(0, 10);
}

function blank(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function StatusPill({ status }: { status: string }) {
  const tone = STATUS_PILL[status] ?? { bg: "#64748b", color: "#fff" };
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: tone.bg, color: tone.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
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

function FormBanner() {
  return (
    <div className="qc-mr-banner">
      <span>{FORM_CODE}</span>
      <span>- Management Review Minute</span>
    </div>
  );
}

function RemoveButton({ disabled = false, onClick, label }: { disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="qc-mr-x" style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <X size={13} />
    </button>
  );
}

export function QCManagementReviewListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  const router = useRouter();

  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <FileText size={18} color="#0f172a" />
          <h1>Management Review Minutes ({FORM_CODE})</h1>
        </div>
        <div className="qc-mr-actions no-print">
          <button type="button" style={saveStyle} onClick={() => router.push(`${BASE}/create`)}>
            <Plus size={14} /> New Minute
          </button>
        </div>
      </div>

      <div className="qc-mr-card">
        <table className="qc-mr-list-table">
          <thead>
            <tr>
              {["Date", "Minute No", "Place", "Prepared By", "Status", ""].map((label) => (
                <th key={label || "view"}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{dateValue(row.reviewDate)}</td>
                <td>{blank(row.minuteNo)}</td>
                <td>{blank(row.place)}</td>
                <td>{blank(row.preparedByName)}</td>
                <td><StatusPill status={String(row.status ?? "")} /></td>
                <td><Link href={row.publicId != null ? publicViewUrl("qc.mgmt-review", Number(row.publicId)) : `${BASE}/${row.id}`} style={viewStyle}>View</Link></td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="qc-mr-empty">No minutes yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QCManagementReviewFormPage({
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
    reviewDate: dateValue(record?.reviewDate) || new Date().toISOString().slice(0, 10),
    minuteNo: String(record?.minuteNo ?? ""),
    duration: String(record?.duration ?? ""),
    place: String(record?.place ?? ""),
    draftAgenda: String(record?.draftAgenda ?? (mode === "create" ? DRAFT_AGENDA_SEED : "")),
    approvedAgenda: String(record?.approvedAgenda ?? ""),
    rejectReason: String(record?.rejectReason ?? ""),
    gmRemark: String(record?.gmRemark ?? ""),
  });
  const [participants, setParticipants] = useState<Participant[]>(() =>
    padRows(asRows<Participant>(record?.participants, ["name", "title", "contribution"]), emptyParticipant),
  );
  const [results, setResults] = useState<ResultRow[]>(() =>
    padRows(asRows<ResultRow>(record?.results, ["agenda", "resolution", "responsible", "timeFrame"]), emptyResult),
  );
  const goBack = () => router.push(BASE);
  const canEdit = ["DRAFT", "REJECTED"].includes(String(record?.status ?? "DRAFT"));
  const canApprove = ["DRAFT", "SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));

  function patchParticipant(index: number, patch: Partial<Participant>) {
    setParticipants((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }
  function patchResult(index: number, patch: Partial<ResultRow>) {
    setResults((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function save() {
    setMessage("");
    if (!header.reviewDate) return setMessage("Date is required");
    startTransition(async () => {
      const url = mode === "edit" && record?.id ? `/api/qc/management-reviews/${record.id}` : "/api/qc/management-reviews";
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...header, participants, results }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save minute");
        return;
      }
      router.push(`${BASE}/${body.id ?? record?.id}`);
      router.refresh();
    });
  }

  async function approve() {
    if (!record?.id) return;
    startTransition(async () => {
      const response = await fetch(`/api/qc/management-reviews/${record.id}/approve`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) setMessage(body.error ?? "Unable to approve minute");
      else router.refresh();
    });
  }

  const actions = (
    <div className="no-print qc-mr-actions">
      <button type="button" style={backStyle} onClick={goBack} disabled={pending}><ArrowLeft size={14} /> Back</button>
      {readOnly && canEdit ? (
        <button type="button" style={backStyle} onClick={() => router.push(`${BASE}/${record?.id}/edit`)}>
          <Pencil size={14} /> Edit
        </button>
      ) : null}
      {readOnly && canApprove ? (
        <button type="button" style={{ ...saveStyle, background: "#16a34a" }} disabled={pending} onClick={approve}>
          <Check size={14} /> Approve
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <FileText size={18} color="#0f172a" />
          <h1>Management Review Minute</h1>
        </div>
        {actions}
      </div>
      {message ? <p className="qc-mr-error">{message}</p> : null}

      <div className="qc-mr-card">
        <FormBanner />
        <div className="qc-mr-body">
          <div className="qc-mr-fields">
            <Field label="Date" required>
              {readOnly ? <div className="qc-mr-value">{header.reviewDate || "-"}</div> : (
                <input type="date" style={inputStyle} value={header.reviewDate} onChange={(event) => setHeader((current) => ({ ...current, reviewDate: event.target.value }))} />
              )}
            </Field>
            <Field label="Minute No">
              {readOnly ? <div className="qc-mr-value">{header.minuteNo || "-"}</div> : (
                <input style={inputStyle} value={header.minuteNo} onChange={(event) => setHeader((current) => ({ ...current, minuteNo: event.target.value }))} />
              )}
            </Field>
            <Field label="Duration">
              {readOnly ? <div className="qc-mr-value">{header.duration || "-"}</div> : (
                <input style={inputStyle} placeholder="e.g., 2 hrs" value={header.duration} onChange={(event) => setHeader((current) => ({ ...current, duration: event.target.value }))} />
              )}
            </Field>
            <Field label="Place">
              {readOnly ? <div className="qc-mr-value">{header.place || "-"}</div> : (
                <input style={inputStyle} value={header.place} onChange={(event) => setHeader((current) => ({ ...current, place: event.target.value }))} />
              )}
            </Field>
          </div>

          <table className="qc-mr-form-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Contributions</th>
                <th style={{ width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {participants.map((row, index) => (
                <tr key={index}>
                  <td>{readOnly ? row.name : <input style={inputStyle} value={row.name} onChange={(event) => patchParticipant(index, { name: event.target.value })} />}</td>
                  <td>{readOnly ? row.title : <input style={inputStyle} value={row.title} onChange={(event) => patchParticipant(index, { title: event.target.value })} />}</td>
                  <td>{readOnly ? row.contribution : <input style={inputStyle} value={row.contribution} onChange={(event) => patchParticipant(index, { contribution: event.target.value })} />}</td>
                  <td>
                    {readOnly ? null : (
                      <RemoveButton label={index === 0 ? "Clear participant" : "Remove participant"} onClick={() => setParticipants((rows) => blankOrRemoveRow(rows, index, emptyParticipant()))} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {readOnly ? null : (
            <button type="button" className="qc-add-row" style={addStyle} onClick={() => setParticipants((rows) => [...rows, emptyParticipant()])}>
              <Plus size={13} /> Add participant
            </button>
          )}

          <div className="qc-mr-agenda">
            <Field label="Draft Agenda">
              {readOnly ? <div className="qc-mr-value">{header.draftAgenda || "-"}</div> : (
                <textarea style={areaStyle} value={header.draftAgenda} onChange={(event) => setHeader((current) => ({ ...current, draftAgenda: event.target.value }))} />
              )}
            </Field>
            <Field label="Approved Agenda">
              {readOnly ? <div className="qc-mr-value">{header.approvedAgenda || "-"}</div> : (
                <textarea style={areaStyle} value={header.approvedAgenda} onChange={(event) => setHeader((current) => ({ ...current, approvedAgenda: event.target.value }))} />
              )}
            </Field>
            <Field label="Reason for rejecting draft (if any)">
              {readOnly ? <div className="qc-mr-value">{header.rejectReason || "-"}</div> : (
                <textarea style={areaStyle} value={header.rejectReason} onChange={(event) => setHeader((current) => ({ ...current, rejectReason: event.target.value }))} />
              )}
            </Field>
          </div>

          <div className="qc-mr-label" style={{ marginTop: 4 }}>Review Results (Corrective / Preventive / Improvement actions)</div>
          <div className="qc-mr-results-scroll">
            <table className="qc-mr-form-table">
              <thead>
                <tr>
                  <th>Agenda</th>
                  <th>Resolution</th>
                  <th>Responsible</th>
                  <th>Time Frame</th>
                  <th style={{ width: 28 }} />
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={index}>
                    <td>{readOnly ? row.agenda : <input style={inputStyle} value={row.agenda} onChange={(event) => patchResult(index, { agenda: event.target.value })} />}</td>
                    <td>{readOnly ? row.resolution : <input style={inputStyle} value={row.resolution} onChange={(event) => patchResult(index, { resolution: event.target.value })} />}</td>
                    <td>{readOnly ? row.responsible : <input style={inputStyle} value={row.responsible} onChange={(event) => patchResult(index, { responsible: event.target.value })} />}</td>
                    <td>{readOnly ? row.timeFrame : <input style={inputStyle} value={row.timeFrame} onChange={(event) => patchResult(index, { timeFrame: event.target.value })} />}</td>
                    <td>
                      {readOnly ? null : (
                        <RemoveButton label={index === 0 ? "Clear result" : "Remove result"} onClick={() => setResults((rows) => blankOrRemoveRow(rows, index, emptyResult()))} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {readOnly ? null : (
            <button type="button" className="qc-add-row" style={addStyle} onClick={() => setResults((rows) => [...rows, emptyResult()])}>
              <Plus size={13} /> Add result
            </button>
          )}

          <Field label="GM Remark">
            {readOnly ? <div className="qc-mr-value">{header.gmRemark || "-"}</div> : (
              <textarea className="qc-mr-gm" style={{ ...areaStyle, height: 80, minHeight: 80, width: "100%" }} value={header.gmRemark} onChange={(event) => setHeader((current) => ({ ...current, gmRemark: event.target.value }))} />
            )}
          </Field>

          {readOnly ? null : (
            <div className="qc-save-row no-print">
              <button type="button" style={saveStyle} onClick={save} disabled={pending}>
                <Save size={14} /> Save Minute
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
