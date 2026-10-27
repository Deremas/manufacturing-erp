"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, Pencil, Save } from "lucide-react";

import { QCSearchSelect } from "./QCSearchSelect";
import {
  QsBanner,
  QsField,
  QsListPage,
  QsValue,
  dateValue,
  nameOnly,
  qsAreaStyle,
  qsBackStyle,
  qsInputStyle,
  qsSaveStyle,
  StatusPill,
} from "./QCQualityKit";

type Option = { value: string; label: string };
type Mode = "create" | "edit" | "view";

function named(options: Option[]) {
  return options.map((option) => ({ ...option, label: nameOnly(option.label) }));
}

function Shell({
  title,
  code,
  banner,
  backHref,
  children,
  message,
  actions,
}: {
  title: string;
  code: string;
  banner: string;
  backHref: string;
  children: React.ReactNode;
  message: string;
  actions: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="qc-mr-page">
      <div className="qc-mr-toolbar">
        <div className="qc-mr-heading">
          <FileText size={18} color="#0f172a" />
          <h1>{title}</h1>
        </div>
        <div className="qc-mr-actions no-print">
          <button type="button" style={qsBackStyle} onClick={() => router.push(backHref)}><ArrowLeft size={14} /> Back</button>
          {actions}
        </div>
      </div>
      {message ? <p className="qc-mr-error">{message}</p> : null}
      <div className="qc-mr-card">
        <QsBanner code={code} title={banner} />
        <div className="qc-mr-body">{children}</div>
      </div>
    </div>
  );
}

function useSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function save(url: string, method: string, payload: Record<string, unknown>, viewHref: string) {
    startTransition(async () => {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save");
        return;
      }
      router.push(viewHref.replace(":id", String(body.id ?? payload.id ?? "")));
      router.refresh();
    });
  }
  function action(url: string) {
    startTransition(async () => {
      const response = await fetch(url, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(body.error ?? "Action failed");
      else router.refresh();
    });
  }
  return { pending, message, setMessage, save, action, router };
}

export function QCCipListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  return (
    <QsListPage
      title="CIP Records"
      formCode="QC-CIP"
      newLabel="New Record"
      createHref="/qc/cip/create"
      viewBase="/qc/cip"
      routeKey="qc.cip"
      columns={[
        { key: "recordDate", label: "Date" },
        { key: "recordNo", label: "Record No" },
        { key: "shiftCode", label: "Shift" },
        { key: "assetName", label: "Equipment" },
        { key: "cycleNo", label: "Cycle" },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}

export function QCCipFormPage({
  mode,
  record,
  options,
}: {
  mode: Mode;
  record?: Record<string, unknown> | null;
  options: { shifts: Option[]; locations: Option[]; assets: Option[] };
}) {
  const readOnly = mode === "view";
  const { pending, message, setMessage, save, action, router } = useSave();
  const [header, setHeader] = useState({
    recordDate: dateValue(record?.recordDate) || new Date().toISOString().slice(0, 10),
    shiftCode: String(record?.shiftCode ?? ""),
    locationId: String(record?.locationId ?? ""),
    assetId: String(record?.assetId ?? ""),
    cycleNo: String(record?.cycleNo ?? ""),
    startTime: String(record?.startTime ?? ""),
    endTime: String(record?.endTime ?? ""),
    remarks: String(record?.remarks ?? ""),
  });
  const assets = named(options.assets);
  const canEdit = String(record?.status ?? "DRAFT") === "DRAFT";
  const canApprove = ["DRAFT", "SUBMITTED", "VERIFIED"].includes(String(record?.status ?? ""));

  return (
    <Shell
      title="CIP Record"
      code="QC-CIP"
      banner="Cleaning In Place"
      backHref="/qc/cip"
      message={message}
      actions={
        <>
          {readOnly && canEdit ? <button type="button" style={qsBackStyle} onClick={() => router.push(`/qc/cip/${record?.id}/edit`)}><Pencil size={14} /> Edit</button> : null}
          {readOnly && canApprove ? <button type="button" style={{ ...qsSaveStyle, background: "#16a34a" }} disabled={pending} onClick={() => action(`/api/qc/cip/${record?.id}/approve`)}><Check size={14} /> Approve</button> : null}
        </>
      }
    >
      <div className="qc-mr-fields">
        <QsField label="Date" required>{readOnly ? <QsValue>{header.recordDate}</QsValue> : <input type="date" style={qsInputStyle} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />}</QsField>
        <QsField label="Shift">{readOnly ? <QsValue>{options.shifts.find((row) => row.value === header.shiftCode)?.label || header.shiftCode}</QsValue> : (
          <select style={qsInputStyle} value={header.shiftCode} onChange={(event) => setHeader((current) => ({ ...current, shiftCode: event.target.value }))}>
            <option value="">- Select -</option>
            {options.shifts.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
          </select>
        )}</QsField>
        <QsField label="Location">{readOnly ? <QsValue>{options.locations.find((row) => row.value === header.locationId)?.label}</QsValue> : <QCSearchSelect value={header.locationId} placeholder="- Select -" options={options.locations} onChange={(value) => setHeader((current) => ({ ...current, locationId: value }))} />}</QsField>
        <QsField label="Equipment / Machine">{readOnly ? <QsValue>{assets.find((row) => row.value === header.assetId)?.label || String(record?.assetName ?? "")}</QsValue> : <QCSearchSelect value={header.assetId} placeholder="- Select -" options={assets} onChange={(value) => setHeader((current) => ({ ...current, assetId: value }))} />}</QsField>
        <QsField label="Cycle No">{readOnly ? <QsValue>{header.cycleNo}</QsValue> : <input style={qsInputStyle} value={header.cycleNo} onChange={(event) => setHeader((current) => ({ ...current, cycleNo: event.target.value }))} />}</QsField>
        <QsField label="Start Time">{readOnly ? <QsValue>{header.startTime}</QsValue> : <input type="time" style={qsInputStyle} value={header.startTime} onChange={(event) => setHeader((current) => ({ ...current, startTime: event.target.value }))} />}</QsField>
        <QsField label="End Time">{readOnly ? <QsValue>{header.endTime}</QsValue> : <input type="time" style={qsInputStyle} value={header.endTime} onChange={(event) => setHeader((current) => ({ ...current, endTime: event.target.value }))} />}</QsField>
      </div>
      <QsField label="Remarks">{readOnly ? <QsValue>{header.remarks}</QsValue> : <textarea style={{ ...qsAreaStyle, width: "100%" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />}</QsField>
      {readOnly ? null : (
        <div className="qc-save-row no-print">
          <button type="button" style={qsSaveStyle} disabled={pending} onClick={() => {
            if (!header.recordDate) return setMessage("Date is required");
            save(mode === "edit" && record?.id ? `/api/qc/cip/${record.id}` : "/api/qc/cip", mode === "edit" ? "PUT" : "POST", header, `/qc/cip/${record?.id ?? ":id"}`);
          }}><Save size={14} /> Save Record</button>
        </div>
      )}
    </Shell>
  );
}

export function QCRetentionListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  return (
    <QsListPage
      title="Retention Samples"
      formCode="QC-RET"
      newLabel="New Sample"
      createHref="/qc/retention-samples/create"
      viewBase="/qc/retention-samples"
      routeKey="qc.sample"
      columns={[
        { key: "recordDate", label: "Stored Date" },
        { key: "sampleNo", label: "Sample No" },
        { key: "itemName", label: "Product" },
        { key: "batchNo", label: "Batch" },
        { key: "retainUntil", label: "Retain Until" },
        { key: "storageLocation", label: "Location" },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}

export function QCRetentionFormPage({
  mode,
  record,
  options,
}: {
  mode: Mode;
  record?: Record<string, unknown> | null;
  options: { items: Option[]; shifts: Option[] };
}) {
  const readOnly = mode === "view";
  const { pending, message, setMessage, save, router } = useSave();
  const items = named(options.items);
  const [header, setHeader] = useState({
    recordDate: dateValue(record?.recordDate) || new Date().toISOString().slice(0, 10),
    itemId: String(record?.itemId ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    shiftCode: String(record?.shiftCode ?? ""),
    quantity: record?.quantity == null ? "" : String(record.quantity),
    storageLocation: String(record?.storageLocation ?? ""),
    retainUntil: dateValue(record?.retainUntil),
    condition: String(record?.condition ?? ""),
    remarks: String(record?.remarks ?? ""),
  });
  const canEdit = ["STORED", "DRAFT"].includes(String(record?.status ?? "STORED"));

  return (
    <Shell
      title="Retention Sample"
      code="QC-RET"
      banner="Retention Sample"
      backHref="/qc/retention-samples"
      message={message}
      actions={readOnly && canEdit ? <button type="button" style={qsBackStyle} onClick={() => router.push(`/qc/retention-samples/${record?.id}/edit`)}><Pencil size={14} /> Edit</button> : null}
    >
      <div className="qc-mr-fields">
        <QsField label="Date" required>{readOnly ? <QsValue>{header.recordDate}</QsValue> : <input type="date" style={qsInputStyle} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />}</QsField>
        <QsField label="Product">{readOnly ? <QsValue>{items.find((row) => row.value === header.itemId)?.label || String(record?.itemName ?? "")}</QsValue> : <QCSearchSelect value={header.itemId} placeholder="- Select -" options={items} onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))} />}</QsField>
        <QsField label="Batch">{readOnly ? <QsValue>{header.batchNo}</QsValue> : <input style={qsInputStyle} value={header.batchNo} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} />}</QsField>
        <QsField label="Shift">{readOnly ? <QsValue>{header.shiftCode}</QsValue> : (
          <select style={qsInputStyle} value={header.shiftCode} onChange={(event) => setHeader((current) => ({ ...current, shiftCode: event.target.value }))}>
            <option value="">- Select -</option>
            {options.shifts.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
          </select>
        )}</QsField>
        <QsField label="Quantity">{readOnly ? <QsValue>{header.quantity}</QsValue> : <input style={qsInputStyle} value={header.quantity} onChange={(event) => setHeader((current) => ({ ...current, quantity: event.target.value }))} />}</QsField>
        <QsField label="Storage Location">{readOnly ? <QsValue>{header.storageLocation}</QsValue> : <input style={qsInputStyle} value={header.storageLocation} onChange={(event) => setHeader((current) => ({ ...current, storageLocation: event.target.value }))} />}</QsField>
        <QsField label="Retain Until">{readOnly ? <QsValue>{header.retainUntil}</QsValue> : <input type="date" style={qsInputStyle} value={header.retainUntil} onChange={(event) => setHeader((current) => ({ ...current, retainUntil: event.target.value }))} />}</QsField>
        <QsField label="Condition">{readOnly ? <QsValue>{header.condition}</QsValue> : <input style={qsInputStyle} value={header.condition} onChange={(event) => setHeader((current) => ({ ...current, condition: event.target.value }))} />}</QsField>
      </div>
      <QsField label="Remarks">{readOnly ? <QsValue>{header.remarks}</QsValue> : <textarea style={{ ...qsAreaStyle, width: "100%" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />}</QsField>
      {readOnly ? null : (
        <div className="qc-save-row no-print">
          <button type="button" style={qsSaveStyle} disabled={pending} onClick={() => {
            if (!header.recordDate) return setMessage("Date is required");
            save(mode === "edit" && record?.id ? `/api/qc/retention-samples/${record.id}` : "/api/qc/retention-samples", mode === "edit" ? "PUT" : "POST", { ...header, quantity: header.quantity ? Number(header.quantity) : null }, `/qc/retention-samples/${record?.id ?? ":id"}`);
          }}><Save size={14} /> Save Sample</button>
        </div>
      )}
    </Shell>
  );
}

export function QCHoldListPage({ rows }: { rows: Array<Record<string, unknown>> }) {
  return (
    <QsListPage
      title="Product Hold / Release"
      formCode="QC-HLD"
      newLabel="New Decision"
      createHref="/qc/hold-release/create"
      viewBase="/qc/hold-release"
      routeKey="qc.hold-decision"
      columns={[
        { key: "recordDate", label: "Date" },
        { key: "decisionNo", label: "Decision No" },
        { key: "itemName", label: "Product" },
        { key: "batchNo", label: "Batch" },
        { key: "decision", label: "Decision" },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}

export function QCHoldFormPage({
  mode,
  record,
  options,
}: {
  mode: Mode;
  record?: Record<string, unknown> | null;
  options: { items: Option[]; shifts: Option[]; locations: Option[] };
}) {
  const readOnly = mode === "view";
  const { pending, message, setMessage, save, action, router } = useSave();
  const items = named(options.items);
  const [header, setHeader] = useState({
    recordDate: dateValue(record?.recordDate) || new Date().toISOString().slice(0, 10),
    itemId: String(record?.itemId ?? ""),
    batchNo: String(record?.batchNo ?? ""),
    shiftCode: String(record?.shiftCode ?? ""),
    locationId: String(record?.locationId ?? ""),
    quantity: record?.quantity == null ? "" : String(record.quantity),
    decision: String(record?.decision ?? "HOLD"),
    reason: String(record?.reason ?? ""),
    remarks: String(record?.remarks ?? ""),
  });
  const canEdit = String(record?.status ?? "DRAFT") === "DRAFT";
  const canApprove = ["DRAFT", "SUBMITTED"].includes(String(record?.status ?? "DRAFT"));

  return (
    <Shell
      title="Product Hold / Release"
      code="QC-HLD"
      banner="Hold / Release Decision"
      backHref="/qc/hold-release"
      message={message}
      actions={
        <>
          {readOnly && canEdit ? <button type="button" style={qsBackStyle} onClick={() => router.push(`/qc/hold-release/${record?.id}/edit`)}><Pencil size={14} /> Edit</button> : null}
          {readOnly && canApprove ? <button type="button" style={{ ...qsSaveStyle, background: "#16a34a" }} disabled={pending} onClick={() => action(`/api/qc/hold-decisions/${record?.id}`)}><Check size={14} /> Approve</button> : null}
        </>
      }
    >
      <div className="qc-mr-fields">
        <QsField label="Date" required>{readOnly ? <QsValue>{header.recordDate}</QsValue> : <input type="date" style={qsInputStyle} value={header.recordDate} onChange={(event) => setHeader((current) => ({ ...current, recordDate: event.target.value }))} />}</QsField>
        <QsField label="Product">{readOnly ? <QsValue>{items.find((row) => row.value === header.itemId)?.label || String(record?.itemName ?? "")}</QsValue> : <QCSearchSelect value={header.itemId} placeholder="- Select -" options={items} onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))} />}</QsField>
        <QsField label="Batch">{readOnly ? <QsValue>{header.batchNo}</QsValue> : <input style={qsInputStyle} value={header.batchNo} onChange={(event) => setHeader((current) => ({ ...current, batchNo: event.target.value }))} />}</QsField>
        <QsField label="Shift">{readOnly ? <QsValue>{header.shiftCode}</QsValue> : (
          <select style={qsInputStyle} value={header.shiftCode} onChange={(event) => setHeader((current) => ({ ...current, shiftCode: event.target.value }))}>
            <option value="">- Select -</option>
            {options.shifts.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
          </select>
        )}</QsField>
        <QsField label="Location">{readOnly ? <QsValue>{options.locations.find((row) => row.value === header.locationId)?.label || String(record?.locationName ?? "")}</QsValue> : <QCSearchSelect value={header.locationId} placeholder="- Select -" options={options.locations} onChange={(value) => setHeader((current) => ({ ...current, locationId: value }))} />}</QsField>
        <QsField label="Quantity">{readOnly ? <QsValue>{header.quantity}</QsValue> : <input style={qsInputStyle} value={header.quantity} onChange={(event) => setHeader((current) => ({ ...current, quantity: event.target.value }))} />}</QsField>
        <QsField label="Decision" required>{readOnly ? <StatusPill status={header.decision} /> : (
          <select style={qsInputStyle} value={header.decision} onChange={(event) => setHeader((current) => ({ ...current, decision: event.target.value }))}>
            {["HOLD", "RELEASE", "REJECT", "REWORK"].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        )}</QsField>
      </div>
      <QsField label="Reason" required>{readOnly ? <QsValue>{header.reason}</QsValue> : <textarea style={{ ...qsAreaStyle, width: "100%" }} value={header.reason} onChange={(event) => setHeader((current) => ({ ...current, reason: event.target.value }))} />}</QsField>
      <QsField label="Remarks">{readOnly ? <QsValue>{header.remarks}</QsValue> : <textarea style={{ ...qsAreaStyle, width: "100%" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />}</QsField>
      {readOnly ? null : (
        <div className="qc-save-row no-print">
          <button type="button" style={qsSaveStyle} disabled={pending} onClick={() => {
            if (!header.recordDate) return setMessage("Date is required");
            if (!header.reason.trim()) return setMessage("Reason is required");
            save(mode === "edit" && record?.id ? `/api/qc/hold-decisions/${record.id}` : "/api/qc/hold-decisions", mode === "edit" ? "PUT" : "POST", { ...header, quantity: header.quantity ? Number(header.quantity) : null }, `/qc/hold-release/${record?.id ?? ":id"}`);
          }}><Save size={14} /> Save Decision</button>
        </div>
      )}
    </Shell>
  );
}
