"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, Filter, Plus } from "lucide-react";

import { ActionButtons, PageHeader, SectionHeading } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { QCAddRowButton, QCRowActions } from "./QCRepeatableRows";
import {
  QCWideTable,
  qcInputStyle,
  qcTableStyle,
  qcTdStyle,
  qcThStyle,
} from "./QCWideTable";

type Option = { value: string; label: string };
type Spec = {
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
};
type ReadingRow = {
  timeValue: string;
  remark: string;
  values: Record<string, string>;
};

export const TREATMENT_POINTS = [
  "Ozone generator",
  "Ozone mixing tanker",
  "Ozonated water",
] as const;

export const FILTER_DURATION_FIELDS = [
  { key: "sandFilter", label: "Sand Filter" },
  { key: "activatedCarbon", label: "Activated Carbon" },
  { key: "softener", label: "Softener" },
  { key: "bWash", label: "B.Wash" },
  { key: "rinsing", label: "Rinsing" },
  { key: "ro", label: "RO" },
  { key: "rinseLine", label: "Rinse Line" },
] as const;

const READING_COLUMNS = [
  { code: "POINT", label: "Point" },
  { code: "CHLORINE_ADDED", label: "Cl added" },
  { code: "CHLORINE_PPM", label: "Cl (ppm)" },
  { code: "RATE", label: "Rate" },
  { code: "OZONE_CONC", label: "Ozone conc" },
  { code: "AIR_PRESSURE", label: "Air press" },
  { code: "TDS", label: "TDS" },
  { code: "PH", label: "pH" },
] as const;

const cardStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
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

function emptyReading(point = ""): ReadingRow {
  return { timeValue: "", remark: "", values: point ? { POINT: point } : {} };
}

function formatTime(value: string) {
  if (!value) return "—";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function displayStatus(status: string) {
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED" || status === "CANCELLED") return status;
  return "PENDING";
}

function TreatmentStatusBadge({ status }: { status: string }) {
  const label = displayStatus(status);
  const tone =
    label === "APPROVED"
      ? { bg: colors.success[600], text: "#fff" }
      : label === "REJECTED"
        ? { bg: colors.danger[600], text: "#fff" }
        : label === "CANCELLED"
          ? { bg: "#64748b", text: "#fff" }
          : { bg: colors.warning[600], text: "#fff" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
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
      <span
        className="qc-field-label"
        style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}
      >
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </div>
  );
}

function sectionTitle(text: string) {
  return <SectionHeading title={text} />;
}

function Dash({ value }: { value?: string | null }) {
  const text = String(value ?? "").trim();
  return <>{text || "—"}</>;
}

export function QCTreatmentMonitoringListPage({
  rows,
}: {
  rows: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("treatment-monitoring")!;
  const [filtered, setFiltered] = useState(rows);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const base = "/qc/treatment-monitoring";

  function applyFilter() {
    setFiltered(
      rows.filter((row) => {
        const date = String(row.recordDate ?? "").slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      }),
    );
  }

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
      <PageHeader
        title={`Treatment Process Monitoring (${catalog.formCode})`}
        breadcrumbs={[{ label: "QC", href: "/qc" }, { label: catalog.name }]}
        actions={
          <ActionButtons
            actions={[
              {
                label: "New Record",
                icon: <Plus size={16} />,
                variant: "primary",
                onClick: () => router.push(`${base}/create`),
              },
            ]}
          />
        }
      />
      <div
        style={{
          ...cardStyle,
          padding: 18,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        <Field label="From">
          <input
            type="date"
            style={{ ...qcInputStyle, minWidth: 180 }}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            style={{ ...qcInputStyle, minWidth: 180 }}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <button
          type="button"
          onClick={applyFilter}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 16px",
            border: "none",
            borderRadius: 8,
            background: "#334155",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Filter size={15} /> Filter
        </button>
      </div>
      <div
        className="qc-wide-table-scroll"
        style={{
          overflowX: "auto",
          background: "white",
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Shift", "From", "To", "Recorded By", "Status", ""].map(
                (label) => (
                  <th
                    key={label || "actions"}
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
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const extra = parseExtra(row.extraFields);
              return (
                <tr key={String(row.id)}>
                  <td style={{ padding: "14px 16px" }}>
                    {String(row.recordDate ?? "").slice(0, 10)}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {String(row.shiftCode ?? "—")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {formatTime(extra.timeFrom)}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {formatTime(extra.timeTo)}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {String(row.testedByName ?? "—")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <TreatmentStatusBadge status={String(row.status)} />
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <Link
                      href={`${base}/${row.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: `1px solid ${colors.primary[600]}`,
                        color: colors.primary[700],
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: "none",
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
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

export function QCTreatmentMonitoringFormPage({
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
    shifts: Option[];
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry("treatment-monitoring")!;
  const readOnly = mode === "view";
  const extra = parseExtra(record?.extraFields);
  const specs = context.specs ?? [];
  const shifts = context.shifts ?? [];
  const locations = context.locations ?? [];
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(
      0,
      10,
    ),
    shiftCode: String(record?.shiftCode ?? ""),
    locationId: String(record?.locationId ?? locations[0]?.value ?? ""),
    remarks: String(record?.remarks ?? ""),
    backdateReason: String(record?.backdateReason ?? ""),
    timeFrom: extra.timeFrom ?? "",
    timeTo: extra.timeTo ?? "",
    sandFilter: extra.sandFilter ?? "",
    activatedCarbon: extra.activatedCarbon ?? "",
    softener: extra.softener ?? "",
    bWash: extra.bWash ?? "",
    rinsing: extra.rinsing ?? "",
    ro: extra.ro ?? "",
    rinseLine: extra.rinseLine ?? "",
  });
  const [readings, setReadings] = useState<ReadingRow[]>(() => {
    const existingLines = Array.isArray(record?.lines)
      ? (record.lines as Array<Record<string, unknown>>)
      : [];
    const grouped = new Map<number, ReadingRow>();
    for (const line of existingLines.filter(
      (row) => row.lineType === "READING",
    )) {
      const index = Number(line.rowIndex ?? 0);
      const current = grouped.get(index) ?? emptyReading();
      current.timeValue = String(line.timeValue ?? current.timeValue);
      current.remark = String(line.remarks ?? current.remark);
      const extraValues = parseExtra(line.extra);
      current.values = { ...current.values, ...extraValues };
      const spec = specs.find((item) => item.parameterId === line.parameterId);
      if (spec)
        current.values[spec.parameterCode] = String(
          line.textValue ??
            line.numericValue ??
            current.values[spec.parameterCode] ??
            "",
        );
      grouped.set(index, current);
    }
    const rows = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map((entry) => entry[1]);
    if (rows.length) return rows;
    return TREATMENT_POINTS.map((point) => emptyReading(point));
  });

  const columns = READING_COLUMNS;

  const goBack = () => router.push("/qc/treatment-monitoring");
  const canApprove = ["SUBMITTED", "CHECKED"].includes(
    String(record?.status ?? ""),
  );
  const canSubmitDraft = ["DRAFT", "REJECTED"].includes(
    String(record?.status ?? ""),
  );

  async function save(submit: boolean) {
    setMessage("");
    startTransition(async () => {
      const payload = {
        slug: "treatment-monitoring",
        controlledFormId: context.form.id,
        recordDate: header.recordDate,
        shiftCode: header.shiftCode || null,
        locationId: header.locationId || null,
        remarks: header.remarks,
        backdateReason: header.backdateReason,
        extraFields: {
          timeFrom: header.timeFrom,
          timeTo: header.timeTo,
          sandFilter: header.sandFilter,
          activatedCarbon: header.activatedCarbon,
          softener: header.softener,
          bWash: header.bWash,
          rinsing: header.rinsing,
          ro: header.ro,
          rinseLine: header.rinseLine,
        },
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
          router.push(`/qc/treatment-monitoring/${id}`);
          return;
        }
      }
      router.push(`/qc/treatment-monitoring/${id}`);
      router.refresh();
    });
  }

  async function workflow(path: string) {
    if (!record?.id) return;
    const remarks = path.endsWith("reject")
      ? window.prompt("Rejection reason") || ""
      : "";
    startTransition(async () => {
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
    });
  }

  if (readOnly) {
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
        <PageHeader
          title={`Treatment Process Monitoring (${catalog.formCode})`}
          breadcrumbs={[
            { label: "QC", href: "/qc" },
            { label: catalog.name, href: "/qc/treatment-monitoring" },
            { label: String(record?.recordNo ?? "Record") },
          ]}
          actions={
            <ActionButtons
              actions={[
                {
                  label: "Back",
                  icon: <ArrowLeft size={16} />,
                  variant: "secondary",
                  onClick: goBack,
                  disabled: pending,
                },
                ...(canSubmitDraft
                  ? [
                      {
                        label: "Submit",
                        variant: "primary" as const,
                        onClick: () => workflow("submit"),
                        disabled: pending,
                        loading: pending,
                      },
                    ]
                  : []),
                ...(canApprove
                  ? [
                      {
                        label: "Approve",
                        icon: <Check size={16} />,
                        variant: "success" as const,
                        onClick: () => workflow("approve"),
                        disabled: pending,
                        loading: pending,
                      },
                    ]
                  : []),
              ]}
            />
          }
        />
        {message ? (
          <p style={{ color: colors.danger[700], margin: 0 }}>{message}</p>
        ) : null}
        <section
          style={{
            ...cardStyle,
            padding: 22,
          }}
        >
          <SectionHeading title="Record Details" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
          {[
            {
              label: "Date",
              value: String(record?.recordDate ?? "").slice(0, 10),
            },
            { label: "Shift", value: String(record?.shiftCode ?? "—") },
            {
              label: "Time",
              value: `${formatTime(header.timeFrom)} – ${formatTime(header.timeTo)}`,
            },
            {
              label: "Status",
              value: <TreatmentStatusBadge status={String(record?.status)} />,
            },
            { label: "By", value: String(record?.testedByName ?? "—") },
          ].map((item) => (
            <div key={item.label}>
              <div
                style={{
                  fontSize: 12,
                  color: colors.text.muted,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
          </div>
        </section>
        <section style={cardStyle}>
          <div style={{ padding: "16px 20px 8px" }}>
            {sectionTitle("Filter Activity Durations (min)")}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}
          >
            {FILTER_DURATION_FIELDS.map((field) => (
              <div
                key={field.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "14px 20px",
                  borderTop: `1px solid ${colors.border}`,
                  borderRight: `1px solid ${colors.border}`,
                }}
              >
                <span style={{ color: colors.text.secondary }}>
                  {field.label}
                </span>
                <strong>
                  <Dash value={header[field.key]} />
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section style={{ ...cardStyle, padding: 14 }}>
          {sectionTitle("Disinfection Readings")}
          <QCWideTable
            minWidth={980}
            hint="Scroll to see hidden columns →"
            maxHeight={null}
          >
            <table style={qcTableStyle}>
              <thead>
                <tr>
                  <th style={qcThStyle}>Time</th>
                  {columns.map((column) => (
                    <th key={column.code} style={qcThStyle}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readings.map((row, index) => (
                  <tr key={index}>
                    <td style={qcTdStyle}>{formatTime(row.timeValue)}</td>
                    {columns.map((column) => (
                      <td key={column.code} style={qcTdStyle}>
                        <Dash value={row.values[column.code]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </QCWideTable>
          {header.remarks ? (
            <p style={{ margin: "16px 0 0", color: colors.text.secondary }}>
              <strong>Remark:</strong> {header.remarks}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = qcInputStyle;

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
      <PageHeader
        recordKind={mode === "create" ? undefined : "qc.record"}
        title={
          mode === "create"
            ? "New Treatment Monitoring"
            : String(record?.recordNo ?? catalog.name)
        }
        subtitle={catalog.formCode}
        breadcrumbs={[
          { label: "QC", href: "/qc" },
          { label: catalog.name, href: "/qc/treatment-monitoring" },
          {
            label:
              mode === "create"
                ? "Create"
                : String(record?.recordNo ?? "Record"),
          },
        ]}
        actions={
          <ActionButtons
            actions={[
              {
                label: "Back",
                icon: <ArrowLeft size={16} />,
                variant: "secondary",
                onClick: goBack,
                disabled: pending,
              },
            ]}
          />
        }
      />
      {message ? (
        <p style={{ color: colors.danger[700], margin: 0 }}>{message}</p>
      ) : null}
      <div style={{ ...cardStyle, overflow: "visible" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            padding: "8px 14px",
            background: colors.primary[700],
            color: "white",
            flexWrap: "wrap",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <strong>{catalog.formCode}</strong>
          <span>— {catalog.formTitle}</span>
        </div>
        <div style={{ padding: 14, display: "grid", gap: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <Field label="Date" required>
              <input
                type="date"
                style={inputStyle}
                value={header.recordDate}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    recordDate: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Shift" required>
              <select
                style={inputStyle}
                value={header.shiftCode}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    shiftCode: event.target.value,
                  }))
                }
              >
                <option value="">—</option>
                {shifts.map((shift) => (
                  <option key={shift.value} value={shift.value}>
                    {shift.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Time From">
              <input
                type="time"
                style={inputStyle}
                value={header.timeFrom}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    timeFrom: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Time To">
              <input
                type="time"
                style={inputStyle}
                value={header.timeTo}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    timeTo: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          {new Date(header.recordDate) < new Date(new Date().toDateString()) ? (
            <Field label="Backdate reason" required>
              <input
                style={inputStyle}
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

          <section>
            {sectionTitle("Filter Activities & Durations (minutes)")}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {FILTER_DURATION_FIELDS.map((field) => (
                <Field key={field.key} label={field.label}>
                  <input
                    style={inputStyle}
                    inputMode="decimal"
                    value={header[field.key]}
                    onChange={(event) =>
                      setHeader((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
          </section>

          <section style={{ minWidth: 0 }}>
            {sectionTitle("Disinfection (every 2 hours)")}
            <QCWideTable
              minWidth={980}
              hint="Scroll to see all hidden columns →"
              maxHeight={null}
            >
              <table style={qcTableStyle}>
                <thead>
                  <tr>
                    <th style={qcThStyle}>Time</th>
                    {columns.map((column) => (
                      <th key={column.code} style={qcThStyle}>
                        {column.label}
                      </th>
                    ))}
                    <th style={{ ...qcThStyle, minWidth: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((row, index) => (
                    <tr key={index}>
                      <td style={qcTdStyle}>
                        <input
                          type="time"
                          style={inputStyle}
                          value={row.timeValue}
                          onChange={(event) =>
                            setReadings((current) =>
                              current.map((item, rowIndex) =>
                                rowIndex === index
                                  ? { ...item, timeValue: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      {columns.map((column) => (
                        <td key={column.code} style={qcTdStyle}>
                          <input
                            style={inputStyle}
                            value={row.values[column.code] ?? ""}
                            onChange={(event) =>
                              setReadings((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...item,
                                        values: {
                                          ...item.values,
                                          [column.code]: event.target.value,
                                        },
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </td>
                      ))}
                      <td style={{ ...qcTdStyle, textAlign: "center" }}>
                        <QCRowActions
                          index={index}
                          count={readings.length}
                          onRemove={(removeIndex) =>
                            setReadings((current) => blankOrRemoveRow(current, removeIndex, emptyReading()))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </QCWideTable>
            <div style={{ marginTop: 12 }}>
              <QCAddRowButton
                onClick={() =>
                  setReadings((current) => [...current, emptyReading()])
                }
                label="Add reading"
              />
            </div>
          </section>

          <Field label="Remark">
            <textarea
              style={{ ...inputStyle, minHeight: 96 }}
              value={header.remarks}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
            />
          </Field>

          <div className="qc-save-row no-print">
            <ActionButtons
              actions={[
                {
                  label: "Cancel",
                  variant: "secondary",
                  onClick: goBack,
                  disabled: pending,
                },
                {
                  label: "Save",
                  variant: "primary",
                  onClick: () => save(false),
                  disabled: pending,
                  loading: pending,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
