"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Download, Eye, Filter, Pencil, Plus, Printer, RotateCcw, Save, Settings } from "lucide-react";

import { colors } from "@/components/ui/colors";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { resultLineForSpec } from "@/services/qc/qc-record-specs";
import { QCResultBadge, QCStatusBadge } from "./QCStatusBadge";
import { QCSamplePointSelect } from "./QCSamplePointSelect";
import {
  qcFieldLabelStyle,
  qcInputStyle,
  qcPageTitleStyle,
  qcTdStyle,
  qcThStyle,
  qcToolbarButtonStyle,
} from "./QCWideTable";

const BASE = "/qc/microbial";
const QUALITATIVE_OPTIONS = ["ABSENT", "PRESENT", "UNDETECTED", "DETECTED", "N/A", "Nil"];

type Option = { value: string; label: string };
type Spec = {
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
  methodReference?: string | null;
  technique?: string | null;
  incubation?: string | null;
  media?: string | null;
  acceptableLimit: string;
  configured?: boolean;
  qualitativeCriterion?: string | null;
  qualitativeOptions?: string | null;
};
type ResultValue = { textValue: string; remarks: string; colour: string; result?: string };

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

function resultsFromRecord(record: Record<string, unknown> | null | undefined, specs: Spec[], extra: Record<string, string>) {
  const map: Record<string, ResultValue> = {};
  for (const spec of specs) {
    const line = resultLineForSpec(record, spec);
    map[spec.parameterId] = {
      textValue: line?.textValue != null && String(line.textValue) !== "" ? String(line.textValue) : line?.numericValue != null ? String(line.numericValue) : "",
      remarks: String(line?.remarks ?? ""),
      colour: extra[`colour_${spec.parameterId}`] ?? "",
      result: line?.result ? String(line.result) : undefined,
    };
  }
  return map;
}

function exportCsv(rows: Array<Record<string, unknown>>) {
  const headers = ["Date", "Code", "Shift", "Sample Point", "Frequency", "Analyses", "Status", "Analyzed By"];
  const lines = rows.map((row) => {
    const extra = parseExtra(row.extraFields);
    return [String(row.recordDate ?? "").slice(0, 10), row.recordNo, row.shiftCode, row.samplePointName, extra.testingFrequency || row.formCode, row.readingCount, row.status, row.testedByName]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",");
  });
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "microbial-analysis.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function QCMicrobialListPage({
  rows,
  filterOptions,
}: {
  rows: Array<Record<string, unknown>>;
  filterOptions?: { shifts?: Option[]; samplePoints?: Array<{ id: string; name: string; groupName: string }> };
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("microbial")!;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [samplePointId, setSamplePointId] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "", shiftCode: "", samplePointId: "", status: "" });

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const date = String(row.recordDate ?? "").slice(0, 10);
      if (applied.from && date < applied.from) return false;
      if (applied.to && date > applied.to) return false;
      if (applied.shiftCode && String(row.shiftCode ?? "") !== applied.shiftCode) return false;
      if (applied.samplePointId) {
        const point = (filterOptions?.samplePoints ?? []).find((entry) => entry.id === applied.samplePointId);
        if (point && String(row.samplePointName ?? "") !== point.name) return false;
      }
      if (applied.status && String(row.status) !== applied.status) return false;
      return true;
    });
  }, [rows, applied, filterOptions]);

  function reset() {
    setFrom("");
    setTo("");
    setShiftCode("");
    setSamplePointId("");
    setStatus("");
    setApplied({ from: "", to: "", shiftCode: "", samplePointId: "", status: "" });
  }

  return (
    <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
            <Settings size={14} />
          </span>
          <div>
            <h1 style={qcPageTitleStyle}>Processing Water Micro Analysis</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode}</p>
          </div>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button type="button" style={outlineButtonStyle} onClick={() => exportCsv(filtered)}>
            <Download size={14} color="#16a34a" /> Export CSV
          </button>
          <button type="button" style={primaryButtonStyle} onClick={() => router.push(`${BASE}/create`)}>
            <Plus size={14} /> New Analysis
          </button>
        </div>
      </div>

      <div className="no-print qc-filter-bar" style={{ ...cardStyle, padding: 12 }}>
        <div className="qc-compact-grid">
          <Field label="From" className="qc-field-date">
            <input type="date" style={qcInputStyle} value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To" className="qc-field-date">
            <input type="date" style={qcInputStyle} value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Field label="Shift" className="qc-field-md">
            <select style={qcInputStyle} value={shiftCode} onChange={(event) => setShiftCode(event.target.value)}>
              <option value="">All</option>
              {(filterOptions?.shifts ?? []).map((shift) => (
                <option key={shift.value} value={shift.value}>{shift.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Sample Point" className="qc-field-lg">
            <select style={qcInputStyle} value={samplePointId} onChange={(event) => setSamplePointId(event.target.value)}>
              <option value="">All</option>
              {(filterOptions?.samplePoints ?? []).map((point) => (
                <option key={point.id} value={point.id}>{point.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status" className="qc-field-md">
            <select style={qcInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              {["DRAFT", "SUBMITTED", "CHECKED", "APPROVED", "REJECTED"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </Field>
          <div className="qc-filter-actions">
            <button type="button" style={primaryButtonStyle} onClick={() => setApplied({ from, to, shiftCode, samplePointId, status })}>
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
          <table style={{ minWidth: 980, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Code", "Shift", "Sample Point", "Frequency", "Analyses", "Status", "Analyzed By", ""].map((label) => (
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
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.recordNo ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.shiftCode ?? "—")}</td>
                    <td style={qcTdStyle}>{String(row.samplePointName ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{extra.testingFrequency || "Hourly"}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.readingCount ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}><QCStatusBadge status={String(row.status)} /></td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>{String(row.testedByName ?? "—")}</td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 6 }} onClick={(event) => event.stopPropagation()}>
                        <Link href={`${BASE}/${row.id}`} aria-label="View" title="View" style={iconButtonStyle}><Eye size={14} /></Link>
                        <Link href={`${BASE}/${row.id}/print`} aria-label="Print" title="Print" style={iconButtonStyle}><Printer size={14} /></Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

export function QCMicrobialFormPage({
  mode,
  context,
  record,
}: {
  mode: "create" | "edit" | "view";
  context: {
    catalog: { name: string; formCode: string; formTitle: string };
    form: { id: string; code: string; title: string; frequencyName: string | null };
    specs: Spec[];
    samplePoints: Array<{ id: string; name: string; groupName: string }>;
    locations: Option[];
    shifts: Option[];
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("microbial")!;
  const readOnly = mode === "view";
  const extra = parseExtra(record?.extraFields);
  const specs = context.specs ?? [];
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(0, 10),
    shiftCode: String(record?.shiftCode ?? context.shifts[0]?.value ?? ""),
    samplePointId: String(record?.samplePointId ?? ""),
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
    testingFrequency: extra.testingFrequency || context.form.frequencyName || "Hourly",
    collectedBy: extra.collectedBy ?? "",
    labRegistrationNo: extra.labRegistrationNo ?? "",
    volume: extra.volume ?? "",
    samplingTime: extra.samplingTime ?? "",
    samplingPd: extra.samplingPd ?? "",
    samplingBbf: extra.samplingBbf ?? "",
    analysisStarted: extra.analysisStarted ?? "",
    analysisStartedTime: extra.analysisStartedTime ?? "",
    finalResultDate: extra.finalResultDate ?? "",
    reportedDate: extra.reportedDate ?? "",
    remarks: String(record?.remarks ?? ""),
    backdateReason: String(record?.backdateReason ?? ""),
  });
  const [results, setResults] = useState<Record<string, ResultValue>>(() => resultsFromRecord(record, specs, extra));
  const goBack = () => router.push(BASE);
  const canApprove = ["SUBMITTED", "CHECKED"].includes(String(record?.status ?? ""));
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(String(record?.status ?? ""));
  const samplePointName = context.samplePoints.find((point) => point.id === header.samplePointId)?.name || String(record?.samplePointName ?? "—");

  async function save() {
    setMessage("");
    if (!header.samplePointId) return setMessage("Sample type / sampling point is required");
    if (!header.shiftCode) return setMessage("Shift is required");
    if (!header.collectedBy.trim()) return setMessage("Sample collected by is required");
    if (!header.samplingTime) return setMessage("Sampling time is required");
    if (!header.analysisStarted) return setMessage("Analysis started date is required");
    startTransition(async () => {
      const colours = Object.fromEntries(specs.map((spec) => [`colour_${spec.parameterId}`, results[spec.parameterId]?.colour ?? ""]));
      const payload = {
        slug: "microbial",
        controlledFormId: context.form.id,
        recordDate: header.recordDate,
        shiftCode: header.shiftCode,
        samplePointId: header.samplePointId,
        locationId: header.locationId || null,
        remarks: header.remarks,
        backdateReason: header.backdateReason,
        extraFields: {
          testingFrequency: header.testingFrequency,
          collectedBy: header.collectedBy,
          labRegistrationNo: header.labRegistrationNo,
          volume: header.volume,
          samplingTime: header.samplingTime,
          samplingPd: header.samplingPd,
          samplingBbf: header.samplingBbf,
          analysisStarted: header.analysisStarted,
          analysisStartedTime: header.analysisStartedTime,
          finalResultDate: header.finalResultDate,
          reportedDate: header.reportedDate,
          operationalStatus: "SAMPLE_COLLECTED",
          ...colours,
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
        setMessage(body.error ?? "Unable to save analysis");
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

  const resultsTable = (
    <div className="qc-raw-water-grid">
      <table style={{ minWidth: 1280, width: "max-content", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Parameter / Test", "Method Reference", "Technique", "Incubation / Test Condition", "Media", "Acceptable Limit", "Result", "Colour After Prep.", "Comment", ...(readOnly ? ["Compliance"] : [])].map((label) => (
              <th key={label} style={{ ...headingStyle, minWidth: label.startsWith("Parameter") ? 220 : 120 }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => {
            const value = results[spec.parameterId] ?? { textValue: "", remarks: "", colour: "" };
            return (
              <tr key={spec.parameterId}>
                <td style={qcTdStyle}>
                  <div>{spec.parameterName}</div>
                  {spec.parameterCode === "SHIGELLA" ? (
                    <div style={{ marginTop: 4, fontSize: 10, color: "#c2410c", lineHeight: 1.35 }}>
                      Detection follows AS 21567:2021. Result is stored exactly as entered.
                    </div>
                  ) : null}
                </td>
                <td style={qcTdStyle}>{spec.methodReference || "—"}</td>
                <td style={qcTdStyle}>{spec.technique || "—"}</td>
                <td style={qcTdStyle}>{spec.incubation || "—"}</td>
                <td style={qcTdStyle}>{spec.media || "—"}</td>
                <td style={{ ...qcTdStyle, textAlign: "center", color: spec.configured ? colors.text.primary : "#c2410c" }}>{spec.acceptableLimit}</td>
                <td style={qcTdStyle}>
                  {readOnly ? (
                    value.textValue || "—"
                  ) : spec.dataType === "NUMBER" ? (
                    <input style={qcInputStyle} placeholder="CFU/1ml" value={value.textValue} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, textValue: event.target.value } }))} />
                  ) : (
                    <select style={qcInputStyle} value={value.textValue} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, textValue: event.target.value } }))}>
                      <option value="">Select ...</option>
                      {(spec.qualitativeOptions?.split(",").map((option) => option.trim()).filter(Boolean) ?? QUALITATIVE_OPTIONS).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td style={qcTdStyle}>
                  {readOnly ? value.colour || "—" : (
                    <input style={qcInputStyle} value={value.colour} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, colour: event.target.value } }))} />
                  )}
                </td>
                <td style={qcTdStyle}>
                  {readOnly ? value.remarks || "—" : (
                    <input style={qcInputStyle} value={value.remarks} onChange={(event) => setResults((current) => ({ ...current, [spec.parameterId]: { ...value, remarks: event.target.value } }))} />
                  )}
                </td>
                {readOnly ? (
                  <td style={{ ...qcTdStyle, textAlign: "center" }}>{value.result ? <QCResultBadge result={value.result} /> : "—"}</td>
                ) : null}
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
              <Settings size={14} />
            </span>
            <div>
              <h1 style={qcPageTitleStyle}>Processing Water Micro Analysis</h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode} — {String(record?.recordNo ?? "")}</p>
            </div>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <button type="button" style={greyButtonStyle} onClick={goBack}><ArrowLeft size={14} /> Back</button>
            <button type="button" style={outlineButtonStyle} onClick={() => router.push(`${BASE}/${record?.id}/print`)}><Printer size={14} /> Print</button>
          </div>
        </div>
        {message ? <p style={{ color: colors.danger[700], margin: 0, fontSize: 12 }}>{message}</p> : null}

        <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Test Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <Info label="Date" value={header.recordDate} />
            <Info label="Code" value={String(record?.recordNo ?? "—")} />
            <Info label="Shift" value={header.shiftCode} />
            <Info label="Sample Type" value={samplePointName} />
            <Info label="Volume" value={header.volume} />
            <Info label="Tested By" value={String(record?.testedByName ?? "—")} />
            <Info label="Status" value={<QCStatusBadge status={String(record?.status ?? "")} />} />
            <Info label="Testing Frequency" value={header.testingFrequency} />
            <Info label="Sample Collected By" value={header.collectedBy} />
            <Info label="Lab Registration No." value={header.labRegistrationNo} />
            <Info label="Sampling Time" value={header.samplingTime} />
            <Info label="Sampling PD / BBF" value={[header.samplingPd, header.samplingBbf].filter(Boolean).join(" / ") || "—"} />
            <Info label="Analysis Started" value={[header.analysisStarted, header.analysisStartedTime].filter(Boolean).join(" ")} />
            <Info label="Final Result Date" value={header.finalResultDate} />
            <Info label="Reported Date" value={header.reportedDate} />
            <Info label="Approved By" value={String(record?.approvedByName ?? "—")} />
          </div>
          <Info label="Remark" value={header.remarks} />
        </div>

        <div style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Test Items</div>
          {resultsTable}
        </div>

        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canSubmitDraft ? <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("submit")}>Submit</button> : null}
          {canApprove ? <button type="button" style={primaryButtonStyle} disabled={pending} onClick={() => workflow("approve")}>Approve</button> : null}
          {canSubmitDraft ? (
            <button type="button" style={greyButtonStyle} onClick={() => router.push(`${BASE}/${record?.id}/edit`)}>
              <Pencil size={14} /> Edit
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary[50], color: colors.primary[700], display: "grid", placeItems: "center" }}>
            <Settings size={14} />
          </span>
          <div>
            <h1 style={qcPageTitleStyle}>Processing Water Micro Analysis</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>Form {catalog.formCode} — {specs.length} controlled analyses</p>
          </div>
        </div>
        <button type="button" className="no-print" style={greyButtonStyle} onClick={goBack} disabled={pending}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      {message ? <p style={{ color: colors.danger[700], margin: 0, fontSize: 12 }}>{message}</p> : null}

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 12, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Sampling Information</div>
        <div className="qc-sampling-grid">
          <Field label="Sample Type / Sampling Point" required className="qc-field-lg">
            <QCSamplePointSelect value={header.samplePointId} points={context.samplePoints} required onChange={(value) => setHeader((current) => ({ ...current, samplePointId: value, testingFrequency: current.testingFrequency || context.form.frequencyName || "Hourly" }))} />
          </Field>
          <Field label="Testing Frequency" className="qc-field-md">
            <input style={{ ...qcInputStyle, minWidth: 0 }} value={header.testingFrequency} onChange={(event) => setHeader((current) => ({ ...current, testingFrequency: event.target.value }))} placeholder="from sample point" />
          </Field>
          <Field label="Shift" required className="qc-field-md">
            <select style={{ ...qcInputStyle, minWidth: 0 }} value={header.shiftCode} onChange={(event) => setHeader((current) => ({ ...current, shiftCode: event.target.value }))}>
              <option value="">Select ...</option>
              {context.shifts.map((shift) => (
                <option key={shift.value} value={shift.value}>{shift.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" required className="qc-field-date">
            <input type="date" style={{ ...qcInputStyle, minWidth: 0 }} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />
          </Field>
          <Field label="Code" className="qc-field-md">
            <input style={{ ...qcInputStyle, minWidth: 0 }} value={String(record?.recordNo ?? "")} disabled placeholder="Assigned on save" />
          </Field>
          <Field label="Sample Collected By" required className="qc-field-lg">
            <input style={{ ...qcInputStyle, minWidth: 0 }} value={header.collectedBy} onChange={(event) => setHeader((current) => ({ ...current, collectedBy: event.target.value }))} />
          </Field>
          <Field label="Lab Registration No." className="qc-field-md">
            <input style={{ ...qcInputStyle, minWidth: 0 }} value={header.labRegistrationNo} onChange={(event) => setHeader((current) => ({ ...current, labRegistrationNo: event.target.value }))} />
          </Field>
          <Field label="Volume" className="qc-field-sm">
            <input style={{ ...qcInputStyle, minWidth: 0 }} placeholder="e.g. 20L" value={header.volume} onChange={(event) => setHeader((current) => ({ ...current, volume: event.target.value }))} />
          </Field>
          <Field label="Sampling Time" required className="qc-field-sm">
            <input type="time" style={{ ...qcInputStyle, minWidth: 0 }} value={header.samplingTime} onChange={(event) => setHeader((current) => ({ ...current, samplingTime: event.target.value }))} />
          </Field>
          <Field label="Sampling PD / BBF (where applicable)" className="qc-field-pair-wrap">
            <div className="qc-field-pair">
              <input type="date" style={{ ...qcInputStyle, minWidth: 0 }} value={header.samplingPd} onChange={(event) => setHeader((current) => ({ ...current, samplingPd: event.target.value }))} />
              <input type="date" style={{ ...qcInputStyle, minWidth: 0 }} value={header.samplingBbf} onChange={(event) => setHeader((current) => ({ ...current, samplingBbf: event.target.value }))} />
            </div>
          </Field>
          <Field label="Analysis Started" required className="qc-field-pair-wrap">
            <div className="qc-field-pair">
              <input type="date" style={{ ...qcInputStyle, minWidth: 0 }} value={header.analysisStarted} onChange={(event) => setHeader((current) => ({ ...current, analysisStarted: event.target.value }))} />
              <input type="time" style={{ ...qcInputStyle, minWidth: 0 }} value={header.analysisStartedTime} onChange={(event) => setHeader((current) => ({ ...current, analysisStartedTime: event.target.value }))} />
            </div>
          </Field>
          <Field label="Final Result Date" className="qc-field-date">
            <input type="date" style={{ ...qcInputStyle, minWidth: 0 }} value={header.finalResultDate} onChange={(event) => setHeader((current) => ({ ...current, finalResultDate: event.target.value }))} />
          </Field>
          <Field label="Reported Date" className="qc-field-date">
            <input type="date" style={{ ...qcInputStyle, minWidth: 0 }} value={header.reportedDate} onChange={(event) => setHeader((current) => ({ ...current, reportedDate: event.target.value }))} />
          </Field>
        </div>
        {new Date(header.recordDate) < new Date(new Date().toDateString()) ? (
          <Field label="Backdate reason" required>
            <input style={qcInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
          </Field>
        ) : null}
      </div>

      <div style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Analysis Results</div>
        {resultsTable}
        <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.text.muted, fontStyle: "italic" }}>
          Compliance is calculated from the acceptable limit after saving. The entered result is stored exactly as recorded and is never altered by that calculation.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 14, display: "grid", gap: 8 }}>
        <Field label="Remark">
          <textarea style={{ ...qcInputStyle, minHeight: 72, height: 72 }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
        </Field>
        <p style={{ margin: 0, fontSize: 11, color: colors.text.muted }}>Analysis Done By is recorded as the signed-in user. Approval is a separate step on the saved record.</p>
        <div className="qc-save-row no-print">
          <button type="button" className="qc-add-row" style={primaryButtonStyle} onClick={save} disabled={pending}>
            <Save size={14} /> Save Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
