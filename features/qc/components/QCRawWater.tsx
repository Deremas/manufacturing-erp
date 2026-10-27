"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Droplets, Pencil, Plus, Printer } from "lucide-react";

import { ActionButtons } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import {
  qcInputStyle,
  qcTdStyle,
  qcPageTitleStyle,
  qcToolbarButtonStyle,
  qcFieldLabelStyle,
} from "./QCWideTable";

const BASE = "/qc/water/raw-water";
const HUB = "/qc/water";
const SHIFTS = ["A", "B", "C"] as const;

type Option = { value: string; label: string };
type Spec = {
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
  acceptableLimit?: string | null;
};
type ReadingRow = {
  timeValue: string;
  remark: string;
  values: Record<string, string>;
};

const RESULT_COLUMNS = [
  { code: "PH", label: "PH", fallbackLimit: "6.5 - 8.5" },
  { code: "CHLORINE_PPM", label: "Total Chlorine", fallbackLimit: "< 4.00" },
  { code: "TDS", label: "TDS", fallbackLimit: "≤ 1000 mg/l" },
  { code: "TURBIDITY", label: "Turbidity", fallbackLimit: "< 5" },
  { code: "HARDNESS", label: "Total Hardness", fallbackLimit: "≤ 500 mg/L" },
  { code: "ALKALINITY", label: "Total Alkalinity", fallbackLimit: "< 600" },
  {
    code: "SENSORY",
    label: "Sensory",
    fallbackLimit: "No Color & No Odor Off Taste",
  },
] as const;

const tableInputStyle: React.CSSProperties = {
  ...qcInputStyle,
  minWidth: 0,
  width: "100%",
};

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
    Object.entries(raw as Record<string, unknown>).map(([key, entry]) => [
      key,
      entry == null ? "" : String(entry),
    ]),
  );
}

function emptyShift(shift: string): ReadingRow {
  return { timeValue: "", remark: "", values: { SHIFT: shift } };
}

function readingsFromRecord(
  record?: Record<string, unknown> | null,
  specs: Spec[] = [],
): ReadingRow[] {
  const existingLines = Array.isArray(record?.lines)
    ? (record.lines as Array<Record<string, unknown>>)
    : [];
  const grouped = new Map<number, ReadingRow>();
  for (const line of existingLines.filter(
    (row) =>
      row.lineType === "READING" ||
      row.sectionCode === "READINGS" ||
      row.sectionCode === "RESULTS",
  )) {
    const index = Number(line.rowIndex ?? 0);
    const current = grouped.get(index) ?? emptyShift("");
    current.timeValue = String(line.timeValue ?? current.timeValue);
    current.remark = String(line.remarks ?? current.remark);
    const extraValues = parseExtra(line.extra);
    current.values = { ...current.values, ...extraValues };
    const spec = specs.find((item) => item.parameterId === line.parameterId);
    const code = spec?.parameterCode || String(line.parameterCode ?? "");
    if (code) {
      current.values[code] = String(
        line.textValue ?? line.numericValue ?? current.values[code] ?? "",
      );
    }
    grouped.set(index, current);
  }
  const rows = [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map((entry) => entry[1]);
  return SHIFTS.map((shift, index) => {
    const match =
      rows.find(
        (row) => String(row.values.SHIFT ?? "").toUpperCase() === shift,
      ) ?? rows[index];
    return {
      timeValue: match?.timeValue ?? "",
      remark: match?.remark ?? "",
      values: { ...(match?.values ?? {}), SHIFT: shift },
    };
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-GB");
}

function recordLabel(recordNo: string) {
  const match = String(recordNo).match(/(\d+)\s*$/);
  return match ? `#${Number(match[1])}` : recordNo;
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
    <span
      style={{
        display: "inline-flex",
        padding: "4px 10px",
        borderRadius: 999,
        background: tone.bg,
        color: tone.text,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.4,
      }}
    >
      {label}
    </span>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="qc-field" style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span className="qc-field-label" style={qcFieldLabelStyle}>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </div>
  );
}

function iconButtonStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 8,
    border: `1px solid ${color}`,
    color,
    background: "white",
    textDecoration: "none",
  };
}

function columnHeading(
  specByCode: Map<string, Spec>,
  column: (typeof RESULT_COLUMNS)[number],
) {
  const configured = String(
    specByCode.get(column.code)?.acceptableLimit ?? "",
  ).trim();
  const limit =
    !configured || configured.toLowerCase() === "not configured"
      ? column.fallbackLimit
      : configured;
  return { label: column.label, limit };
}

export function QCRawWaterListPage({
  rows,
}: {
  rows: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("raw-water")!;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const date = String(row.recordDate ?? "").slice(0, 10);
      if (applied.from && date < applied.from) return false;
      if (applied.to && date > applied.to) return false;
      return true;
    });
  }, [rows, applied]);

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        width: "100%",
        maxWidth: 1600,
        minWidth: 0,
      }}
    >
      <div className="qc-page-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: colors.primary[50],
              color: colors.primary[700],
              display: "grid",
              placeItems: "center",
            }}
          >
            <Droplets size={14} />
          </span>
          <div>
            <h1 style={qcPageTitleStyle}>
              Raw Water Test Recording ({catalog.formCode})
            </h1>
          </div>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={greyButtonStyle}
            onClick={() => router.push(HUB)}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => router.push(`${BASE}/create`)}
          >
            <Plus size={16} /> New Record
          </button>
        </div>
      </div>

      <div
        className="no-print"
        style={{
          ...cardStyle,
          padding: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <Field label="Date From">
          <input
            type="date"
            style={{ ...qcInputStyle, minWidth: 180 }}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="Date To">
          <input
            type="date"
            style={{ ...qcInputStyle, minWidth: 180 }}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <button
          type="button"
          onClick={() => setApplied({ from, to })}
          style={primaryButtonStyle}
        >
          Filter
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            ...greyButtonStyle,
            background: "transparent",
            color: colors.primary[700],
            height: 36,
          }}
        >
          <Printer size={16} /> Print Month
        </button>
      </div>

      <div style={cardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                "Record",
                "Date",
                "Shifts Entered",
                "Reported By",
                "Checked By",
                "Approved By",
                "Status",
                "Actions",
              ].map((label) => (
                <th
                  key={label}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    background: "#f8fafc",
                    fontSize: 12,
                    color: colors.text.secondary,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const entered = Math.min(Number(row.readingCount ?? 0), 3);
              const canEdit = ["DRAFT", "REJECTED"].includes(
                String(row.status),
              );
              return (
                <tr key={String(row.id)}>
                  <td style={{ padding: "14px 16px" }}>
                    <Link
                      href={`${BASE}/${row.id}`}
                      style={{
                        color: "inherit",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      {recordLabel(String(row.recordNo ?? ""))}
                    </Link>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {formatDate(String(row.recordDate ?? ""))}
                  </td>
                  <td style={{ padding: "14px 16px" }}>{entered} / 3</td>
                  <td style={{ padding: "14px 16px" }}>
                    {String(row.testedByName ?? "—")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {String(row.checkedByName ?? "—")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {String(row.approvedByName ?? "—")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <StatusBadge status={String(row.status)} />
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={
                          canEdit
                            ? `${BASE}/${row.id}/edit`
                            : `${BASE}/${row.id}`
                        }
                        aria-label="Edit"
                        title="Edit"
                        style={iconButtonStyle(colors.primary[600])}
                      >
                        <Pencil size={15} />
                      </Link>
                      <Link
                        href={`${BASE}/${row.id}/print`}
                        aria-label="Print"
                        title="Print"
                        style={iconButtonStyle("#64748b")}
                      >
                        <Printer size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: 24, color: colors.text.muted }}
                >
                  No records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QCRawWaterFormPage({
  mode,
  context,
  record,
}: {
  mode: "create" | "edit" | "view";
  context: {
    catalog: {
      name: string;
      formCode: string;
      formTitle: string;
      minTableWidth: number;
    };
    form: {
      id: string;
      code: string;
      title: string;
      frequencyName: string | null;
    };
    specs: Spec[];
    locations: Option[];
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("raw-water")!;
  const readOnly = mode === "view";
  const specs = context.specs ?? [];
  const specByCode = useMemo(
    () => new Map(specs.map((spec) => [spec.parameterCode, spec])),
    [specs],
  );
  const [pending, startTransition] = useTransition();
  const [workflowAction, setWorkflowAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(
      0,
      10,
    ),
    remarks: String(record?.remarks ?? ""),
    backdateReason: String(record?.backdateReason ?? ""),
    locationId: String(record?.locationId ?? context.locations[0]?.value ?? ""),
  });
  const [readings, setReadings] = useState<ReadingRow[]>(() =>
    readingsFromRecord(record, specs),
  );

  const goBack = () => router.push(BASE);
  const canApprove = ["SUBMITTED", "CHECKED"].includes(
    String(record?.status ?? ""),
  );
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(
    String(record?.status ?? ""),
  );
  const canEdit = canSubmitDraft && mode === "view";

  function updateReading(
    index: number,
    patch: Partial<ReadingRow> | { values: Record<string, string> },
  ) {
    setReadings((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...patch,
              values: {
                ...row.values,
                ...("values" in patch ? patch.values : {}),
              },
            }
          : row,
      ),
    );
  }

  async function save(submit: boolean) {
    setMessage("");
    startTransition(async () => {
      const payload = {
        slug: "raw-water",
        controlledFormId: context.form.id,
        recordDate: header.recordDate,
        locationId: header.locationId || null,
        remarks: header.remarks,
        backdateReason: header.backdateReason,
        extraFields: {},
        readings,
        results: [],
      };
      const url =
        mode === "edit" && record?.id
          ? `/api/qc/records/${record.id}`
          : "/api/qc/records";
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save QC record");
        return;
      }
      const id = body.id ?? record?.id;
      if (submit && id) {
        const submitted = await fetch(`/api/qc/records/${id}/submit`, {
          method: "POST",
        });
        const submitBody = await submitted.json();
        if (!submitted.ok) {
          setMessage(submitBody.error ?? "Saved, but submit failed");
          router.push(`${BASE}/${id}`);
          return;
        }
      }
      router.push(`${BASE}/${id}`);
      router.refresh();
    });
  }

  async function workflow(path: string) {
    if (!record?.id) return;
    const remarks = path.endsWith("reject")
      ? window.prompt("Rejection reason") || ""
      : "";
    setWorkflowAction(path);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/qc/records/${record.id}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remarks }),
        });
        const body = await response.json();
        if (!response.ok) {
          setMessage(body.error ?? "Workflow action failed");
          return;
        }
        router.refresh();
      } finally {
        setWorkflowAction(null);
      }
    });
  }

  const title =
    mode === "create"
      ? "Raw Water Test Recording Form"
      : `Raw Water Test Recording (${catalog.formCode})`;

  return (
    <div
      className="qc-raw-water-page"
      style={{
        display: "grid",
        gap: 12,
        width: "100%",
        maxWidth: 1600,
        minWidth: 0,
      }}
    >
      <div className="qc-page-toolbar">
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: colors.primary[50],
              color: colors.primary[700],
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Droplets size={14} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={qcPageTitleStyle}>{title}</h1>
            <p
              style={{
                margin: "2px 0 0",
                color: colors.text.secondary,
                fontSize: 12,
              }}
            >
              Form {catalog.formCode} – Shift A, B, and C (multiple records per
              day allowed)
            </p>
          </div>
        </div>
        <div
          className="no-print"
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button
            type="button"
            style={greyButtonStyle}
            onClick={goBack}
            disabled={pending}
          >
            <ArrowLeft size={16} /> Back
          </button>
          {canEdit ? (
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => router.push(`${BASE}/${record?.id}/edit`)}
            >
              <Pencil size={16} /> Edit
            </button>
          ) : null}
          {mode === "view" ? (
            <ActionButtons
              actions={[
                ...(canSubmitDraft
                  ? [
                      {
                        label: "Submit",
                        variant: "primary" as const,
                        onClick: () => workflow("submit"),
                        disabled: pending || workflowAction != null,
                        loading: workflowAction === "submit",
                      },
                    ]
                  : []),
                ...(canApprove
                  ? [
                      {
                        label: "Approve",
                        variant: "success" as const,
                        onClick: () => workflow("approve"),
                        disabled: pending || workflowAction != null,
                        loading: workflowAction === "approve",
                      },
                    ]
                  : []),
              ]}
            />
          ) : null}
        </div>
      </div>

      {message ? (
        <p style={{ color: colors.danger[700], margin: 0 }}>{message}</p>
      ) : null}

      <div
        style={{
          ...cardStyle,
          padding: 14,
          display: "grid",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr)",
            gap: 16,
          }}
        >
          <Field label="Date" required>
            <input
              type="date"
              style={qcInputStyle}
              value={header.recordDate}
              disabled={readOnly}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  recordDate: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Remark">
            <input
              style={qcInputStyle}
              placeholder="Optional remarks for this record"
              value={header.remarks}
              disabled={readOnly}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
            />
          </Field>
        </div>
        {new Date(header.recordDate) < new Date(new Date().toDateString()) &&
        !readOnly ? (
          <Field label="Backdate reason" required>
            <input
              style={qcInputStyle}
              value={header.backdateReason}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  backdateReason: event.target.value,
                }))
              }
            />
          </Field>
        ) : null}
      </div>

      <div style={{ ...cardStyle, minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 16px",
            background: "#15803d",
            color: "white",
            fontWeight: 800,
          }}
        >
          Test Results by Shift
        </div>
        <div className="qc-raw-water-grid">
          <table>
            <thead>
              <tr>
                <th style={{ ...greenTh, minWidth: 70 }}>Shift</th>
                <th style={{ ...greenTh, minWidth: 140 }}>Sampling Time</th>
                {RESULT_COLUMNS.map((column) => {
                  const heading = columnHeading(specByCode, column);
                  return (
                    <th
                      key={column.code}
                      style={{
                        ...greenTh,
                        minWidth: column.code === "SENSORY" ? 160 : 108,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontWeight: 800,
                          lineHeight: 1.2,
                        }}
                      >
                        {heading.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          lineHeight: 1.25,
                          whiteSpace: "normal",
                          opacity: 0.95,
                        }}
                      >
                        ({heading.limit})
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {readings.map((row, index) => (
                <tr key={row.values.SHIFT || index}>
                  <td style={{ ...qcTdStyle, fontWeight: 800 }}>
                    {row.values.SHIFT}
                  </td>
                  <td style={qcTdStyle}>
                    <input
                      type="time"
                      style={tableInputStyle}
                      value={row.timeValue}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateReading(index, { timeValue: event.target.value })
                      }
                    />
                  </td>
                  {RESULT_COLUMNS.map((column) => (
                    <td key={column.code} style={qcTdStyle}>
                      {column.code === "SENSORY" ? (
                        <select
                          style={tableInputStyle}
                          value={row.values[column.code] ?? ""}
                          disabled={readOnly}
                          onChange={(event) =>
                            updateReading(index, {
                              values: { [column.code]: event.target.value },
                            })
                          }
                        >
                          <option value="">Select ...</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                          <option value="No Color & No Odor">
                            No Color & No Odor
                          </option>
                          <option value="Off Taste">Off Taste</option>
                        </select>
                      ) : (
                        <input
                          style={tableInputStyle}
                          inputMode="decimal"
                          placeholder={
                            column.code === "HARDNESS" ||
                            column.code === "ALKALINITY"
                              ? "e.g. 250 or >250"
                              : ""
                          }
                          value={row.values[column.code] ?? ""}
                          disabled={readOnly}
                          onChange={(event) =>
                            updateReading(index, {
                              values: { [column.code]: event.target.value },
                            })
                          }
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          ...cardStyle,
          padding: 14,
          display: "grid",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            color: colors.text.secondary,
            fontSize: 13,
          }}
        >
          <div>
            <strong>Reported By</strong>
            <div>
              {String(
                record?.testedByName ??
                  (mode === "create" ? "Will be set on save" : "—"),
              )}
            </div>
          </div>
          <div>
            <strong>Checked By</strong>
            <div>{String(record?.checkedByName ?? "—")}</div>
          </div>
          <div>
            <strong>Approved By</strong>
            <div>{String(record?.approvedByName ?? "—")}</div>
          </div>
        </div>
        {!readOnly ? (
          <div className="no-print qc-save-row">
            <button
              type="button"
              style={greyButtonStyle}
              onClick={goBack}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => save(false)}
              disabled={pending}
            >
              Save Record
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const greenTh: React.CSSProperties = {
  textAlign: "center",
  padding: "10px 10px 12px",
  background: "#15803d",
  color: "white",
  fontSize: 13,
  fontWeight: 700,
  verticalAlign: "bottom",
  whiteSpace: "normal",
};
