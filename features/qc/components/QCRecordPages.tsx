"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, History, Pencil, Plus, Printer } from "lucide-react";

import { ActionButtons, FilterCard, PageHeader, SectionHeading } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { QCApprovalPanel } from "./QCApprovalPanel";
import { QCControlledFormHeader } from "./QCControlledFormHeader";
import { QCHistoryPanel } from "./QCHistoryPanel";
import { QCParameterResultGrid } from "./QCParameterResultGrid";
import { QCReadingGrid } from "./QCReadingGrid";
import { QCRecordHeader } from "./QCRecordHeader";
import { QCResultBadge } from "./QCResultBadge";
import { QCSamplePointSelect } from "./QCSamplePointSelect";
import { QCSearchSelect } from "./QCSearchSelect";
import { QCStatusBadge } from "./QCStatusBadge";
import { QCCapFormPage, QCCapListPage } from "./QCCap";
import { QCPackagingFormPage, QCPackagingListPage } from "./QCPackaging";
import { QCChlorineResidualFormPage, QCChlorineResidualListPage } from "./QCChlorineResidual";
import { QCHandleFormPage, QCHandleListPage } from "./QCHandle";
import { QCMicrobialFormPage, QCMicrobialListPage } from "./QCMicrobial";
import { QCPhysicoChemicalFormPage, QCPhysicoChemicalListPage } from "./QCPhysicoChemical";
import { QCPreformFormPage, QCPreformListPage } from "./QCPreform";
import { QCRawWaterFormPage, QCRawWaterListPage } from "./QCRawWater";
import { QCTreatmentMonitoringFormPage, QCTreatmentMonitoringListPage } from "./QCTreatmentMonitoring";
import { QCField, qcInputStyle } from "./QCWideTable";

type Option = { value: string; label: string };
type Spec = {
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
  unitName?: string | null;
  methodReference?: string | null;
  technique?: string | null;
  incubation?: string | null;
  media?: string | null;
  acceptableLimit: string;
  frequencyName?: string | null;
  configured?: boolean;
  qualitativeCriterion?: string | null;
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: 14,
};

function Field(props: { label: string; children: React.ReactNode; required?: boolean }) {
  return <QCField {...props} />;
}

export function QCRecordListPage({
  slug,
  rows,
  filterOptions,
}: {
  slug: string;
  rows: Array<Record<string, unknown>>;
  filterOptions?: { shifts?: Option[]; items?: Option[]; samplePoints?: Array<{ id: string; name: string; groupName: string }>; suppliers?: Option[]; forms?: Array<{ id: string; code: string; title: string }> };
}) {
  if (slug === "treatment-monitoring") {
    return <QCTreatmentMonitoringListPage rows={rows} />;
  }
  if (slug === "raw-water") {
    return <QCRawWaterListPage rows={rows} />;
  }
  if (slug === "chlorine-residual") {
    return <QCChlorineResidualListPage rows={rows} />;
  }
  if (slug === "physicochemical") {
    return <QCPhysicoChemicalListPage rows={rows} filterOptions={filterOptions} />;
  }
  if (slug === "microbial") {
    return <QCMicrobialListPage rows={rows} filterOptions={filterOptions} />;
  }
  if (slug === "preform") {
    return <QCPreformListPage rows={rows} />;
  }
  if (slug === "handle") {
    return <QCHandleListPage rows={rows} filterOptions={{ items: filterOptions?.items, suppliers: filterOptions?.suppliers }} />;
  }
  if (slug === "cap") {
    return <QCCapListPage rows={rows} />;
  }
  if (slug === "packaging") {
    return <QCPackagingListPage rows={rows} />;
  }
  return <QCGenericRecordListPage slug={slug} rows={rows} filterOptions={filterOptions} />;
}

function QCGenericRecordListPage({
  slug,
  rows,
  filterOptions,
}: {
  slug: string;
  rows: Array<Record<string, unknown>>;
  filterOptions?: { shifts?: Option[]; items?: Option[]; samplePoints?: Array<{ id: string; name: string; groupName: string }>; suppliers?: Option[]; forms?: Array<{ id: string; code: string; title: string }> };
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry(slug)!;
  const [filtered, setFiltered] = useState(rows);
  const base = `/qc/${slug}`;
  const fields = [
    { type: "date" as const, key: "dateFrom", label: "From" },
    { type: "date" as const, key: "dateTo", label: "To" },
    ...(catalog.requiresShift ? [{ type: "select" as const, key: "shiftCode", label: "Shift", options: filterOptions?.shifts ?? [] }] : []),
    ...(catalog.requiresItem ? [{ type: "select" as const, key: "itemId", label: "Product / Material", options: filterOptions?.items ?? [] }] : []),
    ...(catalog.requiresSamplePoint ? [{ type: "select" as const, key: "samplePointId", label: "Sample Point", options: (filterOptions?.samplePoints ?? []).map((point) => ({ value: point.id, label: point.name })) }] : []),
    ...(catalog.requiresSupplier ? [{ type: "select" as const, key: "supplierId", label: "Supplier", options: filterOptions?.suppliers ?? [] }] : []),
    { type: "select" as const, key: "result", label: "Result", options: ["PASS", "FAIL", "PENDING", "NOT_EVALUATED", "INCOMPLETE"].map((value) => ({ value, label: value })) },
    { type: "select" as const, key: "status", label: "Status", options: ["DRAFT", "SUBMITTED", "CHECKED", "APPROVED", "REJECTED"].map((value) => ({ value, label: value })) },
  ];

  return (
    <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <PageHeader
        icon={<History size={18} />}
        title={catalog.name}
        subtitle={catalog.formCode}
        breadcrumbs={[{ label: "QC", href: "/qc" }, { label: catalog.name }]}
        actions={
          <ActionButtons
            actions={[
              { label: "Print", variant: "secondary", onClick: () => window.print() },
              { label: "New Record", icon: <Plus size={16} />, variant: "primary", onClick: () => router.push(`${base}/create`) },
            ]}
          />
        }
      />
      <FilterCard
        title="Filters"
        fields={fields}
        onReset={() => setFiltered(rows)}
        onFilter={(values) => {
          setFiltered(rows.filter((row) => {
            if (values.status && row.status !== values.status) return false;
            if (values.result && row.result !== values.result) return false;
            if (values.shiftCode && row.shiftCode !== values.shiftCode) return false;
            return true;
          }));
        }}
      />
      <div className="qc-wide-table-scroll" style={{ overflowX: "auto", overflowY: "auto", background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, minWidth: 0, maxWidth: "100%" }}>
        <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Shift", catalog.requiresSupplier ? "Supplier" : "Product / Material", "Sample Point", "Batch", "Readings", "Result", "Status", "Recorded By", "Approved By", "Actions"].map((label) => (
                <th key={label} style={{ textAlign: "left", padding: 12, background: "#f8fafc", fontSize: 12, color: colors.text.secondary, borderBottom: `1px solid ${colors.border}` }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={String(row.id)}>
                <td style={{ padding: 12 }}>{String(row.recordDate ?? "").slice(0, 10)}</td>
                <td style={{ padding: 12 }}>{String(row.shiftCode ?? "—")}</td>
                <td style={{ padding: 12 }}>{String(row.supplierName ?? row.itemName ?? "—")}</td>
                <td style={{ padding: 12 }}>{String(row.samplePointName ?? "—")}</td>
                <td style={{ padding: 12 }}>{String(row.batchNo ?? "—")}</td>
                <td style={{ padding: 12 }}>{String(row.readingCount ?? "—")}</td>
                <td style={{ padding: 12 }}><QCResultBadge result={String(row.result)} /></td>
                <td style={{ padding: 12 }}><QCStatusBadge status={String(row.status)} /></td>
                <td style={{ padding: 12 }}>{String(row.testedByName ?? "—")}</td>
                <td style={{ padding: 12 }}>{String(row.approvedByName ?? "—")}</td>
                <td style={{ padding: 12, display: "flex", gap: 8 }}>
                  <Link aria-label="View" title="View" href={publicViewUrl("qc.record", Number(row.publicId))}><Eye size={16} color={colors.primary[700]} /></Link>
                  {row.status === "DRAFT" || row.status === "REJECTED" ? (
                    <Link aria-label="Edit" title="Edit" href={publicEditUrl("qc.record", Number(row.publicId))}><Pencil size={16} color={colors.primary[700]} /></Link>
                  ) : null}
                  <Link aria-label="Print" title="Print" href={publicPrintUrl("qc.record", Number(row.publicId))}><Printer size={16} color={colors.primary[700]} /></Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 24, color: colors.text.muted }}>No records yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QCRecordFormPage({
  slug,
  mode,
  context,
  record,
}: {
  slug: string;
  mode: "create" | "edit" | "view";
  context: {
    catalog: { name: string; formCode: string; formTitle: string; minRows?: number; minTableWidth: number; requiresShift?: boolean; requiresItem?: boolean; requiresSupplier?: boolean; requiresSamplePoint?: boolean; requiresLocation?: boolean; allowsMultipleReadings?: boolean };
    form: { id: string; code: string; title: string; frequencyName: string | null; requiresShift: boolean; requiresItem: boolean; requiresSupplier: boolean; requiresSamplePoint: boolean; requiresLocation: boolean; allowsMultipleReadings: boolean };
    specs: Spec[];
    forms: Array<{ id: string; code: string; title: string }>;
    samplePoints: Array<{ id: string; name: string; groupName: string }>;
    items: Option[];
    locations: Option[];
    suppliers: Option[];
    shifts: Option[];
    users: Option[];
    itemSpecs: Array<{ itemId: string; kind: string; gramMin: number | null; gramMax: number | null; tolerance: number | null; label: string | null }>;
  };
  record?: Record<string, unknown> | null;
}) {
  if (slug === "treatment-monitoring") {
    return <QCTreatmentMonitoringFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "raw-water") {
    return <QCRawWaterFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "chlorine-residual") {
    return <QCChlorineResidualFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "physicochemical") {
    return <QCPhysicoChemicalFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "microbial") {
    return <QCMicrobialFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "preform") {
    return <QCPreformFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "handle") {
    return <QCHandleFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "cap") {
    return <QCCapFormPage mode={mode} context={context} record={record} />;
  }
  if (slug === "packaging") {
    return <QCPackagingFormPage mode={mode} context={context} record={record} />;
  }
  return <QCGenericRecordFormPage slug={slug} mode={mode} context={context} record={record} />;
}

function QCGenericRecordFormPage({
  slug,
  mode,
  context,
  record,
}: {
  slug: string;
  mode: "create" | "edit" | "view";
  context: {
    catalog: { name: string; formCode: string; formTitle: string; minRows?: number; minTableWidth: number; requiresShift?: boolean; requiresItem?: boolean; requiresSupplier?: boolean; requiresSamplePoint?: boolean; requiresLocation?: boolean; allowsMultipleReadings?: boolean };
    form: { id: string; code: string; title: string; frequencyName: string | null; requiresShift: boolean; requiresItem: boolean; requiresSupplier: boolean; requiresSamplePoint: boolean; requiresLocation: boolean; allowsMultipleReadings: boolean };
    specs: Spec[];
    forms: Array<{ id: string; code: string; title: string }>;
    samplePoints: Array<{ id: string; name: string; groupName: string }>;
    items: Option[];
    locations: Option[];
    suppliers: Option[];
    shifts: Option[];
    users: Option[];
    itemSpecs: Array<{ itemId: string; kind: string; gramMin: number | null; gramMax: number | null; tolerance: number | null; label: string | null }>;
  };
  record?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const catalog = getQcCatalogEntry(slug)!;
  const readOnly = mode === "view";
  const extra = (record?.extraFields ?? {}) as Record<string, unknown>;
  const [pending, startTransition] = useTransition();
  const [workflowAction, setWorkflowAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [formId, setFormId] = useState(String(record?.controlledFormId ?? context.form.id));
  const [header, setHeader] = useState({
    recordDate: String(record?.recordDate ?? new Date().toISOString()).slice(0, 10),
    shiftCode: String(record?.shiftCode ?? ""),
    itemId: String(record?.itemId ?? ""),
    supplierId: String(record?.supplierId ?? ""),
    samplePointId: String(record?.samplePointId ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    locationId: String(record?.locationId ?? ""),
    quantity: record?.quantity == null ? "" : String(record.quantity),
    remarks: String(record?.remarks ?? ""),
    backdateReason: String(record?.backdateReason ?? ""),
    treatmentNo: String(extra.treatmentNo ?? ""),
    timeFrom: String(extra.timeFrom ?? ""),
    timeTo: String(extra.timeTo ?? ""),
    supplierName: String(extra.supplierName ?? ""),
    poNo: String(extra.poNo ?? ""),
    inspectionTime: String(extra.inspectionTime ?? ""),
    vehicleNo: String(extra.vehicleNo ?? ""),
    sampleSize: String(extra.sampleSize ?? ""),
    collectedBy: String(extra.collectedBy ?? ""),
    labRegistrationNo: String(extra.labRegistrationNo ?? ""),
    samplingTime: String(extra.samplingTime ?? ""),
    analysisStarted: String(extra.analysisStarted ?? ""),
    finalResultDate: String(extra.finalResultDate ?? ""),
    reportedDate: String(extra.reportedDate ?? ""),
    operationalStatus: String(extra.operationalStatus ?? (slug === "microbial" ? "SAMPLE_COLLECTED" : "")),
  });
  const minRows = Math.max(1, catalog.minRows ?? 1);
  const existingLines = Array.isArray(record?.lines) ? record.lines as Array<Record<string, unknown>> : [];
  const [readings, setReadings] = useState(() => {
    const grouped = new Map<number, { timeValue: string; remark: string; values: Record<string, string> }>();
    for (const line of existingLines.filter((row) => row.lineType === "READING")) {
      const index = Number(line.rowIndex ?? 0);
      const current = grouped.get(index) ?? { timeValue: String(line.timeValue ?? ""), remark: String(line.remarks ?? ""), values: {} };
      const spec = context.specs.find((item) => item.parameterId === line.parameterId);
      if (spec) current.values[spec.parameterCode] = String(line.textValue ?? line.numericValue ?? "");
      grouped.set(index, current);
    }
    const rows = [...grouped.values()];
    while (rows.length < minRows) rows.push({ timeValue: "", remark: "", values: {} });
    return rows.length ? rows : [{ timeValue: "", remark: "", values: {} }];
  });
  const [results, setResults] = useState<Record<string, { textValue: string; remarks: string; result?: string }>>(() => {
    const map: Record<string, { textValue: string; remarks: string; result?: string }> = {};
    for (const spec of context.specs) {
      const line = existingLines.find((row) => row.parameterId === spec.parameterId && row.lineType !== "READING");
      map[spec.parameterId] = {
        textValue: String(line?.textValue ?? line?.numericValue ?? ""),
        remarks: String(line?.remarks ?? ""),
        result: line?.result ? String(line.result) : undefined,
      };
    }
    return map;
  });

  const itemSpec = context.itemSpecs.find((row) => row.itemId === header.itemId);
  const weightText = itemSpec && (itemSpec.gramMin != null || itemSpec.gramMax != null)
    ? `${itemSpec.gramMin ?? "—"} – ${itemSpec.gramMax ?? "—"}${itemSpec.tolerance != null ? ` ± ${itemSpec.tolerance}` : ""} g`
    : "Gram range not configured";

  async function save(submit: boolean) {
    setMessage("");
    startTransition(async () => {
      const payload = {
        slug,
        controlledFormId: formId,
        recordDate: header.recordDate,
        shiftCode: header.shiftCode || null,
        itemId: header.itemId || null,
        supplierId: header.supplierId || null,
        samplePointId: header.samplePointId || null,
        batchNo: header.batchNo || null,
        locationId: header.locationId || null,
        quantity: header.quantity ? Number(header.quantity) : null,
        remarks: header.remarks,
        backdateReason: header.backdateReason,
        extraFields: {
          treatmentNo: header.treatmentNo,
          timeFrom: header.timeFrom,
          timeTo: header.timeTo,
          supplierName: header.supplierName,
          poNo: header.poNo,
          inspectionTime: header.inspectionTime,
          vehicleNo: header.vehicleNo,
          sampleSize: header.sampleSize,
          collectedBy: header.collectedBy,
          labRegistrationNo: header.labRegistrationNo,
          samplingTime: header.samplingTime,
          analysisStarted: header.analysisStarted,
          finalResultDate: header.finalResultDate,
          reportedDate: header.reportedDate,
          operationalStatus: header.operationalStatus,
        },
        readings,
        results: context.specs.map((spec) => ({
          parameterId: spec.parameterId,
          textValue: results[spec.parameterId]?.textValue || null,
          numericValue: spec.dataType === "NUMBER" && results[spec.parameterId]?.textValue ? Number(results[spec.parameterId].textValue) : null,
          remarks: results[spec.parameterId]?.remarks || null,
        })),
      };
      const url = mode === "edit" && record?.id ? `/api/qc/records/${record.id}` : "/api/qc/records";
      const response = await fetch(url, { method: mode === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save QC record");
        return;
      }
      const id = body.id ?? record?.id;
      const nextPublicId = Number(body.publicId ?? record?.publicId ?? 0);
      if (submit && id) {
        const submitted = await fetch(`/api/qc/records/${id}/submit`, { method: "POST" });
        const submitBody = await submitted.json();
        if (!submitted.ok) {
          setMessage(submitBody.error ?? "Saved, but submit failed");
          router.push(nextPublicId ? publicViewUrl("qc.record", nextPublicId) : `/qc/${slug}/${id}`);
          return;
        }
      }
      router.push(nextPublicId ? publicViewUrl("qc.record", nextPublicId) : `/qc/${slug}/${id}`);
      router.refresh();
    });
  }

  async function workflow(path: string) {
    if (!record?.id) return;
    const remarks = path.endsWith("reject") ? window.prompt("Rejection reason") || "" : "";
    setWorkflowAction(path);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/qc/records/${record.id}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remarks }) });
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

  const goBack = () => router.push(`/qc/${slug}`);

  return (
    <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <PageHeader
        recordKind={mode === "create" ? undefined : "qc.record"}
        title={mode === "create" ? `New ${catalog.name}` : String(record?.recordNo ?? catalog.name)}
        subtitle={context.form.code}
        breadcrumbs={[{ label: "QC", href: "/qc" }, { label: catalog.name, href: `/qc/${slug}` }, { label: mode === "create" ? "Create" : String(record?.recordNo ?? "Record") }]}
        actions={<ActionButtons actions={[{ label: "Back", variant: "secondary", onClick: goBack, disabled: pending }]} />}
      />
      {message ? <p style={{ color: colors.danger[700], margin: 0 }}>{message}</p> : null}
      <div style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, minWidth: 0, overflow: "visible" }}>
        <QCControlledFormHeader code={context.form.code} title={context.form.title} frequency={context.form.frequencyName} />
        <div style={{ padding: 14, display: "grid", gap: 12, minWidth: 0, overflow: "visible" }}>
          {context.forms.length > 1 && !readOnly ? (
            <Field label="Controlled Form">
              <select style={qcInputStyle} value={formId} onChange={(event) => setFormId(event.target.value)}>
                {context.forms.map((form) => <option key={form.id} value={form.id}>{form.code} — {form.title}</option>)}
              </select>
            </Field>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, overflow: "visible" }}>
            <Field label="Date" required><input type="date" style={qcInputStyle} value={header.recordDate} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} /></Field>
            {context.form.requiresShift ? (
              <Field label="Shift" required>
                <select style={qcInputStyle} value={header.shiftCode} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, shiftCode: event.target.value }))}>
                  <option value="">Select ...</option>
                  {context.shifts.map((shift) => <option key={shift.value} value={shift.value}>{shift.label}</option>)}
                </select>
              </Field>
            ) : null}
            {context.form.requiresItem ? (
              <Field label="Product / Material" required>
                <QCSearchSelect
                  value={header.itemId}
                  disabled={readOnly}
                  required
                  placeholder="Select ..."
                  options={context.items}
                  onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))}
                />
              </Field>
            ) : null}
            {context.form.requiresSamplePoint ? (
              <Field label="Sample Point" required>
                <QCSamplePointSelect value={header.samplePointId} points={context.samplePoints} required disabled={readOnly} onChange={(value) => setHeader((current) => ({ ...current, samplePointId: value }))} />
              </Field>
            ) : null}
            {context.form.requiresSupplier ? (
              <Field label="Supplier" required>
                <QCSearchSelect
                  value={header.supplierId}
                  disabled={readOnly}
                  required
                  placeholder="Select ..."
                  options={context.suppliers}
                  onChange={(value) => setHeader((current) => ({ ...current, supplierId: value }))}
                />
              </Field>
            ) : null}
            {context.form.requiresLocation ? (
              <Field label="Location">
                <QCSearchSelect
                  value={header.locationId}
                  disabled={readOnly}
                  placeholder="Select ..."
                  options={context.locations}
                  onChange={(value) => setHeader((current) => ({ ...current, locationId: value }))}
                />
              </Field>
            ) : null}
            <Field label="Batch No"><input style={qcInputStyle} value={header.batchNo} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} /></Field>
            {["preform", "handle", "cap"].includes(slug) ? (
              <Field label="Quantity Received"><input style={qcInputStyle} value={header.quantity} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, quantity: event.target.value }))} /></Field>
            ) : null}
            {slug === "chlorine-residual" ? <Field label="Treatment No."><input style={qcInputStyle} value={header.treatmentNo} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, treatmentNo: event.target.value }))} /></Field> : null}
            {slug === "microbial" ? (
              <>
                <Field label="Sampling Time" required><input type="time" style={qcInputStyle} value={header.samplingTime} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, samplingTime: event.target.value }))} /></Field>
                <Field label="Lab Registration No."><input style={qcInputStyle} value={header.labRegistrationNo} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, labRegistrationNo: event.target.value }))} /></Field>
                <Field label="Operational Status">
                  <select style={qcInputStyle} value={header.operationalStatus} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, operationalStatus: event.target.value }))}>
                    {["SAMPLE_COLLECTED", "INCUBATING", "RESULT_ENTRY", "READY_FOR_REVIEW", "COMPLETED"].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
                  </select>
                </Field>
                <Field label="Final Result Date"><input type="date" style={qcInputStyle} value={header.finalResultDate} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, finalResultDate: event.target.value }))} /></Field>
              </>
            ) : null}
          </div>
          {new Date(header.recordDate) < new Date(new Date().toDateString()) && !readOnly ? (
            <Field label="Backdate reason" required>
              <input style={qcInputStyle} value={header.backdateReason} onChange={(event) => setHeader((current) => ({ ...current, backdateReason: event.target.value }))} />
            </Field>
          ) : null}

          {context.form.allowsMultipleReadings ? (
            <section style={{ minWidth: 0 }}>
              <SectionHeading title="Readings" />
              {readOnly ? (
                <QCReadingGrid minWidth={catalog.minTableWidth} parameters={context.specs} rows={readings} onChange={() => undefined} onAdd={() => undefined} onRemove={() => undefined} />
              ) : (
                <QCReadingGrid
                  minWidth={catalog.minTableWidth}
                  parameters={context.specs}
                  rows={readings}
                  onChange={(index, patch) => setReadings((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch, values: patch.values ?? row.values } : row))}
                  onAdd={() => setReadings((current) => [...current, { timeValue: "", remark: "", values: {} }])}
                  onRemove={(index) => setReadings((current) => blankOrRemoveRow(current, index, { timeValue: "", remark: "", values: {} }))}
                />
              )}
            </section>
          ) : (
            <section style={{ minWidth: 0 }}>
              <SectionHeading title="Results" />
              <QCParameterResultGrid
                minWidth={catalog.minTableWidth}
                specs={context.specs}
                values={results}
                readOnly={readOnly}
                onChange={(parameterId, patch) => setResults((current) => ({ ...current, [parameterId]: { ...current[parameterId], ...patch } }))}
              />
            </section>
          )}

          {["preform", "handle", "cap"].includes(slug) ? (
            <section style={cardStyle}>
              <SectionHeading title="Weight check" />
              <p style={{ color: colors.text.secondary }}>Configured range: {weightText}</p>
              <p>Missing numeric limits are never auto-passed. Configure gram ranges in QC Master Data.</p>
            </section>
          ) : null}

          <Field label="Remark">
            <textarea style={{ ...qcInputStyle, minHeight: 80 }} value={header.remarks} disabled={readOnly} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </Field>

          <div className="qc-save-row no-print">
            <ActionButtons
              actions={[
                { label: "Cancel", variant: "secondary", onClick: goBack, disabled: pending },
                ...(!readOnly
                  ? [{ label: "Save", variant: "primary" as const, onClick: () => save(false), disabled: pending, loading: pending }]
                  : []),
              ]}
            />
          </div>
        </div>
      </div>

      {mode === "view" && record ? (
        <>
          <QCRecordHeader
            fields={[
              { label: "Record No", value: String(record.recordNo ?? "") },
              { label: "Result", value: <QCResultBadge result={String(record.result)} /> },
              { label: "Status", value: <QCStatusBadge status={String(record.status)} /> },
            ]}
          />
          <QCApprovalPanel
            status={String(record.status)}
            testedByName={record.testedByName as string}
            submittedByName={record.submittedByName as string}
            checkedByName={record.checkedByName as string}
            approvedByName={record.approvedByName as string}
            submittedAt={record.submittedAt as string}
            checkedAt={record.checkedAt as string}
            approvedAt={record.approvedAt as string}
            busy={pending || workflowAction != null}
            pendingAction={workflowAction}
            onSubmit={() => workflow("submit")}
            onCheck={() => workflow("check")}
            onApprove={() => workflow("approve")}
            onReject={() => workflow("reject")}
            onCancel={() => workflow("cancel")}
          />
          <QCHistoryPanel rows={(record.history as Array<{ id: string; action: string; performedByName?: string | null; remarks?: string | null; createdAt: string }>) ?? []} />
        </>
      ) : null}
    </div>
  );
}

export function QCRecordPrintPage({
  record,
}: {
  record: Record<string, unknown>;
}) {
  const lines = Array.isArray(record.lines) ? record.lines as Array<Record<string, unknown>> : [];
  return (
    <div style={{ background: "white", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>{String(record.formTitleSnapshot)}</h1>
      <p>{String(record.formCodeSnapshot)} · {String(record.recordNo)} · {String(record.recordDate).slice(0, 10)}</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Parameter", "Limit", "Result", "Eval"].map((label) => (
              <th key={label} style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0", padding: 8 }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={String(line.id)}>
              <td style={{ padding: 8 }}>{String(line.parameterNameSnapshot)}</td>
              <td style={{ padding: 8 }}>{String(line.limitSnapshot ?? "Not configured")}</td>
              <td style={{ padding: 8 }}>{String(line.textValue ?? line.numericValue ?? "")}</td>
              <td style={{ padding: 8 }}>{String(line.result)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Tested by {String(record.testedByName ?? "—")} · Approved by {String(record.approvedByName ?? "—")}</p>
    </div>
  );
}
