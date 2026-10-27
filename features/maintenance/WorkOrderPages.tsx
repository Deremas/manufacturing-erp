"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, CheckCircle2, ClipboardCheck, Eye, LockKeyhole, PackageMinus, PackagePlus, Pencil, PlusCircle, Printer, RotateCcw, Send, UserRoundCheck } from "lucide-react";

import { ActionButtons, DataTable, EmptyState, FormCard, PageHeader, RemarksWithRemoveCell, StatusBadge } from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { colors } from "@/components/ui/colors";
import type { User } from "@/features/administration/types";
import type { Location } from "@/features/master-data/types";
import type { MaintenanceAsset, MaintenanceTicket, MaintenanceWorkOrder } from "@/features/maintenance/types";
import { WorkExecutionTimeline } from "@/features/maintenance/ExecutionPages";
import type { Item } from "@/types/master-data";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";

const shellStyle: React.CSSProperties = {
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  background: "#f8fafc",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: `1px solid ${colors.inputBorder}`,
  background: "#fff",
  fontSize: 16,
};

type PartState = {
  itemId: string;
  stockIssueId: string;
  requestedQty: string;
  issuedQty: string;
  usedQty: string;
  returnedQty: string;
  unitCost: string;
  remarks: string;
};

type LaborState = {
  employeeId: string;
  hours: string;
  hourlyRate: string;
  remarks: string;
};

type ExternalCostState = {
  description: string;
  amount: string;
  invoiceReference: string;
  remarks: string;
};

type WorkOrderFormState = {
  ticketId: string;
  assetId: string;
  locationId: string;
  assignedTechnicianId: string;
  supervisorId: string;
  workType: string;
  priority: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  problemDescription: string;
  diagnosis: string;
  workPerformed: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  testResult: string;
  status: string;
  completedById: string;
  approvedById: string;
  closedById: string;
  parts: PartState[];
  labor: LaborState[];
  externalCosts: ExternalCostState[];
};

function toDateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function toBadgeStatus(value: unknown): BadgeVariant {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "APPROVED":
    case "ASSIGNED":
    case "IN_PROGRESS":
      return "active";
    case "COMPLETED":
    case "TESTED":
    case "CLOSED":
      return "completed";
    case "SUBMITTED":
    case "WAITING_PARTS":
    case "WAITING_EXTERNAL_SERVICE":
      return "pending";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    default:
      return "draft";
  }
}

function emptyPart(): PartState {
  return { itemId: "", stockIssueId: "", requestedQty: "0", issuedQty: "0", usedQty: "0", returnedQty: "0", unitCost: "0", remarks: "" };
}

function emptyLabor(): LaborState {
  return { employeeId: "", hours: "0", hourlyRate: "0", remarks: "" };
}

function emptyExternal(): ExternalCostState {
  return { description: "", amount: "0", invoiceReference: "", remarks: "" };
}

function initialState(workOrder?: MaintenanceWorkOrder | null, presetTicket?: MaintenanceTicket | null): WorkOrderFormState {
  if (workOrder) {
    return {
      ticketId: workOrder.ticketId ?? "",
      assetId: workOrder.assetId,
      locationId: workOrder.locationId,
      assignedTechnicianId: workOrder.assignedTechnicianId ?? "",
      supervisorId: workOrder.supervisorId ?? "",
      workType: workOrder.workType,
      priority: workOrder.priority,
      scheduledStart: toDateInput(workOrder.scheduledStart),
      scheduledEnd: toDateInput(workOrder.scheduledEnd),
      actualStart: toDateInput(workOrder.actualStart),
      actualEnd: toDateInput(workOrder.actualEnd),
      problemDescription: workOrder.problemDescription,
      diagnosis: workOrder.diagnosis ?? "",
      workPerformed: workOrder.workPerformed ?? "",
      rootCause: workOrder.rootCause ?? "",
      correctiveAction: workOrder.correctiveAction ?? "",
      preventiveAction: workOrder.preventiveAction ?? "",
      testResult: workOrder.testResult ?? "",
      status: workOrder.status,
      completedById: workOrder.completedById ?? "",
      approvedById: workOrder.approvedById ?? "",
      closedById: workOrder.closedById ?? "",
      parts: workOrder.parts.length
        ? workOrder.parts.map((entry) => ({
            itemId: entry.itemId,
            stockIssueId: entry.stockIssueId ?? "",
            requestedQty: String(entry.requestedQty ?? 0),
            issuedQty: String(entry.issuedQty ?? 0),
            usedQty: String(entry.usedQty ?? 0),
            returnedQty: String(entry.returnedQty ?? 0),
            unitCost: String(entry.unitCost ?? 0),
            remarks: entry.remarks ?? "",
          }))
        : [emptyPart()],
      labor: workOrder.labor.length
        ? workOrder.labor.map((entry) => ({
            employeeId: entry.employeeId ?? "",
            hours: String(entry.hours ?? 0),
            hourlyRate: String(entry.hourlyRate ?? 0),
            remarks: entry.remarks ?? "",
          }))
        : [emptyLabor()],
      externalCosts: workOrder.externalCosts.length
        ? workOrder.externalCosts.map((entry) => ({
            description: entry.description,
            amount: String(entry.amount ?? 0),
            invoiceReference: entry.invoiceReference ?? "",
            remarks: entry.remarks ?? "",
          }))
        : [emptyExternal()],
    };
  }

  return {
    ticketId: presetTicket?.id ?? "",
    assetId: presetTicket?.assetId ?? "",
    locationId: presetTicket?.locationId ?? "",
    assignedTechnicianId: presetTicket?.assignedToId ?? "",
    supervisorId: "",
    workType: presetTicket?.type ?? "CORRECTIVE",
    priority: presetTicket?.priority ?? "MEDIUM",
    scheduledStart: new Date().toISOString().slice(0, 10),
    scheduledEnd: new Date().toISOString().slice(0, 10),
    actualStart: "",
    actualEnd: "",
    problemDescription: presetTicket?.problemDescription ?? "",
    diagnosis: "",
    workPerformed: "",
    rootCause: "",
    correctiveAction: "",
    preventiveAction: "",
    testResult: "",
    status: "DRAFT",
    completedById: "",
    approvedById: "",
    closedById: "",
    parts: [emptyPart()],
    labor: [emptyLabor()],
    externalCosts: [emptyExternal()],
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function WorkOrdersListPage({ workOrders }: { workOrders: MaintenanceWorkOrder[] }) {
  const router = useRouter();
  const columns: Column<MaintenanceWorkOrder>[] = [
    { key: "workOrderNo", label: "Work Order No" },
    { key: "ticketNo", label: "Ticket", render: (value) => value ?? "-" },
    { key: "assetCode", label: "Asset Code", render: (value) => value ?? "-" },
    { key: "assetName", label: "Asset" },
    { key: "priority", label: "Priority" },
    { key: "assignedTechnicianName", label: "Technician", render: (value) => value ?? "-" },
    { key: "totalCost", label: "Total Cost", render: (value) => money(Number(value ?? 0)) },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
  ];
  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(publicViewUrl("maintenance.work-order", record.publicId)) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(publicEditUrl("maintenance.work-order", record.publicId)) },
    { label: "Print", icon: <Printer size={16} />, onClick: (record) => router.push(publicPrintUrl("maintenance.work-order", record.publicId)) },
  ];

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Work Orders"
        subtitle="Track diagnosis, parts, labor, and closure against live maintenance requests."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders" }]}
        actions={<ActionButtons actions={[{ label: "Create Work Order", icon: <PlusCircle size={16} />, variant: "primary", onClick: () => router.push("/maintenance/work-orders/create") }]} />}
      />
      <DataTable columns={columns} data={workOrders} actions={actions} pageSize={15} emptyState={<EmptyState title="No work orders yet" message="Convert a maintenance ticket into a work order to begin assignment and execution." />} />
    </div>
  );
}

export function WorkOrderFormPage({
  mode,
  workOrder,
  tickets,
  assets,
  locations,
  users,
  items,
  presetTicket,
}: {
  mode: "create" | "edit";
  workOrder?: MaintenanceWorkOrder | null;
  tickets: MaintenanceTicket[];
  assets: MaintenanceAsset[];
  locations: Location[];
  users: User[];
  items: Item[];
  presetTicket?: MaintenanceTicket | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<WorkOrderFormState>(() => initialState(workOrder, presetTicket));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const assetOptions = useMemo(() => assets.filter((entry) => entry.isActive), [assets]);
  const ticketOptions = useMemo(() => tickets.filter((entry) => !workOrder || entry.id === workOrder.ticketId || entry.status !== "CLOSED"), [tickets, workOrder]);
  const spareItems = useMemo(
    () =>
      items.filter((entry) => {
        const code = String(entry.itemType ?? "").toUpperCase();
        const name = `${entry.itemTypeName ?? ""} ${entry.itemName}`.toUpperCase();
        return entry.isActive && !entry.isArchived && (code.includes("SP") || code.includes("SPARE") || name.includes("SPARE"));
      }),
    [items],
  );

  const selectedAsset = useMemo(() => assetOptions.find((entry) => entry.id === form.assetId), [assetOptions, form.assetId]);

  const totalSpareCost = form.parts.reduce((sum, entry) => {
    const qty = numeric(entry.usedQty) || numeric(entry.issuedQty) || numeric(entry.requestedQty);
    return sum + qty * numeric(entry.unitCost);
  }, 0);
  const totalLaborCost = form.labor.reduce((sum, entry) => sum + numeric(entry.hours) * numeric(entry.hourlyRate), 0);
  const totalExternalCost = form.externalCosts.reduce((sum, entry) => sum + numeric(entry.amount), 0);
  const grandTotal = totalSpareCost + totalLaborCost + totalExternalCost;

  function updateTicket(ticketId: string) {
    const ticket = ticketOptions.find((entry) => entry.id === ticketId);
    setForm((current) => ({
      ...current,
      ticketId,
      assetId: ticket?.assetId ?? current.assetId,
      locationId: ticket?.locationId ?? current.locationId,
      assignedTechnicianId: ticket?.assignedToId ?? current.assignedTechnicianId,
      workType: ticket?.type ?? current.workType,
      priority: ticket?.priority ?? current.priority,
      problemDescription: ticket?.problemDescription ?? current.problemDescription,
    }));
  }

  function updateAsset(assetId: string) {
    const asset = assetOptions.find((entry) => entry.id === assetId);
    setForm((current) => ({
      ...current,
      assetId,
      locationId: asset?.locationId ?? current.locationId,
    }));
  }

  function updatePart(index: number, key: keyof PartState, value: string) {
    setForm((current) => ({
      ...current,
      parts: current.parts.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)),
    }));
  }

  function updateLabor(index: number, key: keyof LaborState, value: string) {
    setForm((current) => ({
      ...current,
      labor: current.labor.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)),
    }));
  }

  function updateExternal(index: number, key: keyof ExternalCostState, value: string) {
    setForm((current) => ({
      ...current,
      externalCosts: current.externalCosts.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)),
    }));
  }

  async function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(mode === "create" ? "/api/maintenance/work-orders" : `/api/maintenance/work-orders/${workOrder?.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          parts: form.parts.map((entry) => ({
            itemId: entry.itemId,
            stockIssueId: entry.stockIssueId || undefined,
            requestedQty: numeric(entry.requestedQty),
            issuedQty: numeric(entry.issuedQty),
            usedQty: numeric(entry.usedQty),
            returnedQty: numeric(entry.returnedQty),
            unitCost: numeric(entry.unitCost),
            remarks: entry.remarks,
          })),
          labor: form.labor.map((entry) => ({
            employeeId: entry.employeeId,
            hours: numeric(entry.hours),
            hourlyRate: numeric(entry.hourlyRate),
            remarks: entry.remarks,
          })),
          externalCosts: form.externalCosts.map((entry) => ({
            description: entry.description,
            amount: numeric(entry.amount),
            invoiceReference: entry.invoiceReference,
            remarks: entry.remarks,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to save work order");
        return;
      }
      router.push(publicViewUrl("maintenance.work-order", result.item.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={mode === "create" ? "Create Work Order" : `Edit ${workOrder?.workOrderNo ?? "Work Order"}`}
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: mode === "create" ? "Create" : "Edit" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}

      <FormCard title="Header" variant="teal-header">
        <div style={gridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Ticket</span><select style={inputStyle} value={form.ticketId} onChange={(event) => updateTicket(event.target.value)}><option value="">Select ...</option>{ticketOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.ticketNo} - {entry.assetCode ?? entry.assetName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Asset</span><select style={inputStyle} value={form.assetId} onChange={(event) => updateAsset(event.target.value)}><option value="">Select ...</option>{assetOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.assetCode} - {entry.assetName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Location</span><select style={inputStyle} value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}><option value="">Select ...</option>{locations.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.locationCode} - {entry.locationName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Assigned Technician</span><select style={inputStyle} value={form.assignedTechnicianId} onChange={(event) => setForm((current) => ({ ...current, assignedTechnicianId: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Supervisor</span><select style={inputStyle} value={form.supervisorId} onChange={(event) => setForm((current) => ({ ...current, supervisorId: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Work Type</span><select style={inputStyle} value={form.workType} onChange={(event) => setForm((current) => ({ ...current, workType: event.target.value }))}>{["BREAKDOWN", "CORRECTIVE", "PREVENTIVE", "INSPECTION", "CALIBRATION", "EMERGENCY"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Priority</span><select style={inputStyle} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Status</span><select style={inputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Scheduled Start</span><input type="date" style={inputStyle} value={form.scheduledStart} onChange={(event) => setForm((current) => ({ ...current, scheduledStart: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Scheduled End</span><input type="date" style={inputStyle} value={form.scheduledEnd} onChange={(event) => setForm((current) => ({ ...current, scheduledEnd: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Actual Start</span><input type="date" style={inputStyle} value={form.actualStart} onChange={(event) => setForm((current) => ({ ...current, actualStart: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Actual End</span><input type="date" style={inputStyle} value={form.actualEnd} onChange={(event) => setForm((current) => ({ ...current, actualEnd: event.target.value }))} /></label>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Problem Description</span>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.problemDescription} onChange={(event) => setForm((current) => ({ ...current, problemDescription: event.target.value }))} placeholder={selectedAsset ? `Describe the issue on ${selectedAsset.assetCode}` : "Describe the issue"} />
        </div>
      </FormCard>

      <FormCard title="Diagnosis and Closure Notes" variant="teal-header">
        <div style={gridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Completed By</span><select style={inputStyle} value={form.completedById} onChange={(event) => setForm((current) => ({ ...current, completedById: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Approved By</span><select style={inputStyle} value={form.approvedById} onChange={(event) => setForm((current) => ({ ...current, approvedById: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Closed By</span><select style={inputStyle} value={form.closedById} onChange={(event) => setForm((current) => ({ ...current, closedById: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        </div>
        {[
          ["Diagnosis", "diagnosis"],
          ["Work Performed", "workPerformed"],
          ["Root Cause", "rootCause"],
          ["Corrective Action", "correctiveAction"],
          ["Preventive Action", "preventiveAction"],
          ["Test Result", "testResult"],
        ].map(([label, key]) => (
          <div key={key} style={{ ...fieldStyle, marginTop: 16 }}>
            <span style={labelStyle}>{label}</span>
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={form[key as keyof WorkOrderFormState] as string}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            />
          </div>
        ))}
      </FormCard>

      <FormCard title="Spare Parts" variant="teal-header">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "Requested", "Issued", "Used", "Returned", "Unit Cost", ""].map((label) => (
                  <th key={label} style={{ padding: "10px 8px", textAlign: "left", color: colors.text.secondary }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.parts.map((part, index) => (
                <tr key={`part-${index}`}>
                  <td style={{ padding: "8px" }}>
                    <select style={inputStyle} value={part.itemId} onChange={(event) => updatePart(index, "itemId", event.target.value)}>
                      <option value="">Select ...</option>
                      {spareItems.map((entry) => <option key={entry.id} value={entry.id}>{entry.itemCode} - {entry.itemName} - {entry.uomCode || entry.uomName}</option>)}
                    </select>
                  </td>
                  {(["requestedQty", "issuedQty", "usedQty", "returnedQty", "unitCost"] as const).map((key) => (
                    <td key={key} style={{ padding: "8px" }}>
                      <input type="number" min="0" step="0.01" style={inputStyle} value={part[key]} onChange={(event) => updatePart(index, key, event.target.value)} />
                    </td>
                  ))}
                  <td style={{ padding: "8px", width: 60 }}>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, parts: blankOrRemoveRow(current.parts, index, emptyPart()) }))}
                      style={{ ...inputStyle, color: colors.danger[600], cursor: "pointer" }}
                    >
                      x
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ActionButtons actions={[{ label: "Add Part", icon: <PlusCircle size={16} />, variant: "secondary", onClick: () => setForm((current) => ({ ...current, parts: [...current.parts, emptyPart()] })) }]} />
      </FormCard>

      <FormCard title="Labor and External Costs" variant="teal-header">
        <div style={gridStyle}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Labor</div>
            {form.labor.map((entry, index) => (
              <div key={`labor-${index}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 40px", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <select style={inputStyle} value={entry.employeeId} onChange={(event) => updateLabor(index, "employeeId", event.target.value)}>
                  <option value="">Select ...</option>
                  {users.filter((user) => user.isActive).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
                <input type="number" min="0" step="0.25" style={inputStyle} value={entry.hours} onChange={(event) => updateLabor(index, "hours", event.target.value)} />
                <input type="number" min="0" step="0.01" style={inputStyle} value={entry.hourlyRate} onChange={(event) => updateLabor(index, "hourlyRate", event.target.value)} />
                <RemarksWithRemoveCell
                  value={entry.remarks}
                  canRemove
                  inputStyle={inputStyle}
                  onChange={(next) => updateLabor(index, "remarks", next)}
                  onRemove={() => setForm((current) => ({ ...current, labor: blankOrRemoveRow(current.labor, index, emptyLabor()) }))}
                  removeAriaLabel={`Remove labor row ${index + 1}`}
                />
              </div>
            ))}
            <ActionButtons actions={[{ label: "Add Labor", icon: <PlusCircle size={16} />, variant: "secondary", onClick: () => setForm((current) => ({ ...current, labor: [...current.labor, emptyLabor()] })) }]} />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>External Services</div>
            {form.externalCosts.map((entry, index) => (
              <div key={`external-${index}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 40px", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input style={inputStyle} placeholder="Description" value={entry.description} onChange={(event) => updateExternal(index, "description", event.target.value)} />
                <input type="number" min="0" step="0.01" style={inputStyle} value={entry.amount} onChange={(event) => updateExternal(index, "amount", event.target.value)} />
                <input style={inputStyle} placeholder="Invoice Ref" value={entry.invoiceReference} onChange={(event) => updateExternal(index, "invoiceReference", event.target.value)} />
                <RemarksWithRemoveCell
                  value={entry.remarks}
                  canRemove
                  inputStyle={inputStyle}
                  onChange={(next) => updateExternal(index, "remarks", next)}
                  onRemove={() => setForm((current) => ({ ...current, externalCosts: blankOrRemoveRow(current.externalCosts, index, emptyExternal()) }))}
                  removeAriaLabel={`Remove external cost row ${index + 1}`}
                />
              </div>
            ))}
            <ActionButtons actions={[{ label: "Add External", icon: <PlusCircle size={16} />, variant: "secondary", onClick: () => setForm((current) => ({ ...current, externalCosts: [...current.externalCosts, emptyExternal()] })) }]} />
          </div>
        </div>
      </FormCard>

      <FormCard
        title="Cost Summary"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: mode === "create" ? "Save Work Order" : "Update Work Order", variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={gridStyle}>
          <div><div style={labelStyle}>Spare Cost</div><div>ETB {money(totalSpareCost)}</div></div>
          <div><div style={labelStyle}>Labor Cost</div><div>ETB {money(totalLaborCost)}</div></div>
          <div><div style={labelStyle}>External Cost</div><div>ETB {money(totalExternalCost)}</div></div>
          <div><div style={labelStyle}>Grand Total</div><div>ETB {money(grandTotal)}</div></div>
        </div>
      </FormCard>
    </div>
  );
}

export function WorkOrderDetailPage({ workOrder }: { workOrder: MaintenanceWorkOrder | null }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [workflowPending, startWorkflow] = useTransition();
  if (!workOrder) {
    return <div style={shellStyle}><EmptyState title="Work order not found" message="The requested maintenance work order does not exist." action={{ label: "Back to Work Orders", onClick: () => router.push("/maintenance/work-orders") }} /></div>;
  }

  const canManageExecution = ["APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"].includes(workOrder.status);
  const canComplete = ["ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"].includes(workOrder.status);
  const canAssign = ["APPROVED", "ASSIGNED", "IN_PROGRESS"].includes(workOrder.status);
  const canClose = ["COMPLETED", "TESTED"].includes(workOrder.status);
  const canReopen = workOrder.status === "CLOSED";
  const canCancel = !["CLOSED", "CANCELLED"].includes(workOrder.status);
  const workflow = (action: string) => startWorkflow(async () => {
    setMessage("");
    const response = await fetch(`/api/maintenance/work-orders/${workOrder.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? `Failed to ${action} work order`);
    router.refresh();
  });

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="maintenance"
        title={workOrder.workOrderNo}
        subtitle="Maintenance execution document"
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: workOrder.workOrderNo }]}
        actions={<ActionButtons actions={[
          ...(workOrder.status === "DRAFT" ? [{ label: "Submit", icon: <Send size={16} />, variant: "primary" as const, onClick: () => workflow("submit"), loading: workflowPending }] : []),
          ...(workOrder.status === "SUBMITTED" && !workOrder.checkedById ? [{ label: "Check", icon: <ClipboardCheck size={16} />, variant: "primary" as const, onClick: () => workflow("check"), loading: workflowPending }] : []),
          ...(workOrder.status === "SUBMITTED" && workOrder.checkedById ? [{ label: "Approve", icon: <Check size={16} />, variant: "primary" as const, onClick: () => workflow("approve"), loading: workflowPending }] : []),
          ...(canAssign ? [{ label: workOrder.status === "IN_PROGRESS" ? "Reassign" : "Assign / Start", icon: <UserRoundCheck size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/assign`) }] : []),
          ...(canManageExecution ? [{ label: "Check In", icon: <UserRoundCheck size={16} />, variant: "primary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/check-in`) }] : []),
          ...(workOrder.status === "IN_PROGRESS" ? [{ label: "Pause", icon: <ClipboardCheck size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/pause`) }] : []),
          ...(workOrder.status === "IN_PROGRESS" ? [{ label: "Resume", icon: <Check size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/resume`) }] : []),
          ...(workOrder.status === "IN_PROGRESS" ? [{ label: "Check Out", icon: <UserRoundCheck size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/check-out`) }] : []),
          ...(canManageExecution ? [{ label: "Diagnose", icon: <ClipboardCheck size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/diagnose`) }] : []),
          { label: "PM Checklist", icon: <ClipboardCheck size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/pm-checklist`) },
          ...(canManageExecution ? [{ label: "Request Parts", icon: <PackagePlus size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/request-parts`) }] : []),
          ...(canManageExecution ? [{ label: "Issue Parts", icon: <PackagePlus size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/issue-parts`) }] : []),
          ...(canManageExecution ? [{ label: "Record Usage", icon: <ClipboardCheck size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/usage`) }] : []),
          ...(canManageExecution ? [{ label: "Return Parts", icon: <PackageMinus size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/return-parts`) }] : []),
          ...(canComplete ? [{ label: "Complete", icon: <CheckCircle2 size={16} />, variant: "primary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/complete`) }] : []),
          ...(workOrder.status === "COMPLETED" ? [{ label: "Test", icon: <Check size={16} />, variant: "primary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/test`) }] : []),
          ...(canClose ? [{ label: "Close", icon: <LockKeyhole size={16} />, variant: "primary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/close`) }] : []),
          ...(canReopen ? [{ label: "Reopen", icon: <RotateCcw size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/reopen`) }] : []),
          ...(canCancel ? [{ label: "Cancel", icon: <Ban size={16} />, variant: "danger" as const, onClick: () => router.push(`/maintenance/work-orders/${workOrder.id}/cancel`) }] : []),
          ...(workOrder.status === "DRAFT" ? [{ label: "Edit", icon: <Pencil size={16} />, variant: "secondary" as const, onClick: () => router.push(publicEditUrl("maintenance.work-order", workOrder.publicId)) }] : []),
          { label: "Print", icon: <Printer size={16} />, variant: "secondary", onClick: () => router.push(publicPrintUrl("maintenance.work-order", workOrder.publicId)) },
        ]} />}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard title="Header" variant="teal-header">
        <div style={gridStyle}>
          <div><div style={labelStyle}>Status</div><StatusBadge status={toBadgeStatus(workOrder.status)} /></div>
          <div><div style={labelStyle}>Ticket</div><div>{workOrder.ticketNo ?? "-"}</div></div>
          <div><div style={labelStyle}>Asset</div><div>{workOrder.assetCode} - {workOrder.assetName}</div></div>
          <div><div style={labelStyle}>Location</div><div>{workOrder.locationCode} - {workOrder.locationName}</div></div>
          <div><div style={labelStyle}>Technician</div><div>{workOrder.assignedTechnicianName ?? "-"}</div></div>
          <div><div style={labelStyle}>Supervisor</div><div>{workOrder.supervisorName ?? "-"}</div></div>
          <div><div style={labelStyle}>Completed By</div><div>{workOrder.completedByName ?? "-"}</div></div>
          <div><div style={labelStyle}>Closed By</div><div>{workOrder.closedByName ?? "-"}</div></div>
        </div>
        <div style={{ marginTop: 16 }}><div style={labelStyle}>Problem Description</div><div>{workOrder.problemDescription}</div></div>
      </FormCard>
      <FormCard title="Cost Summary" variant="teal-header">
        <div style={gridStyle}>
          <div><div style={labelStyle}>Spare Cost</div><div>ETB {money(workOrder.totalSpareCost)}</div></div>
          <div><div style={labelStyle}>Labor Cost</div><div>ETB {money(workOrder.totalLaborCost)}</div></div>
          <div><div style={labelStyle}>External Cost</div><div>ETB {money(workOrder.totalExternalCost)}</div></div>
          <div><div style={labelStyle}>Grand Total</div><div>ETB {money(workOrder.totalCost)}</div></div>
        </div>
      </FormCard>
      <FormCard title="Execution Lines" variant="teal-header">
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Parts</div>
            <DataTable
              columns={[
                { key: "itemCode", label: "Item Code", render: (value) => value ?? "-" },
                { key: "itemName", label: "Item" },
                { key: "requestedQty", label: "Requested Qty" },
                { key: "issuedQty", label: "Issued Qty" },
                { key: "usedQty", label: "Used Qty" },
                { key: "damagedQty", label: "Damaged Qty" },
                { key: "unresolvedQty", label: "Unresolved Qty" },
                { key: "returnedQty", label: "Returned Qty" },
                { key: "unitCode", label: "UOM", render: (value, row) => value ?? row.unitName ?? "-" },
                { key: "totalCost", label: "Total Cost", render: (value) => money(Number(value ?? 0)) },
              ]}
              data={workOrder.parts}
              pageSize={10}
              emptyState={<EmptyState title="No parts recorded" message="This work order has no spare parts lines yet." />}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Labor</div>
            <DataTable
              columns={[
                { key: "employeeName", label: "Employee", render: (value) => value ?? "-" },
                { key: "hours", label: "Hours" },
                { key: "hourlyRate", label: "Hourly Rate", render: (value) => money(Number(value ?? 0)) },
                { key: "totalCost", label: "Total Cost", render: (value) => money(Number(value ?? 0)) },
              ]}
              data={workOrder.labor}
              pageSize={10}
              emptyState={<EmptyState title="No labor recorded" message="This work order has no labor lines yet." />}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>External Services</div>
            <DataTable
              columns={[
                { key: "supplierName", label: "Supplier", render: (value) => value ?? "-" },
                { key: "description", label: "Description" },
                { key: "invoiceReference", label: "Invoice Ref", render: (value) => value ?? "-" },
                { key: "amount", label: "Amount", render: (value) => `ETB ${money(Number(value ?? 0))}` },
                { key: "remarks", label: "Remarks", render: (value) => value ?? "-" },
              ]}
              data={workOrder.externalCosts}
              pageSize={10}
              emptyState={<EmptyState title="No external services" message="This work order has no external service costs." />}
            />
          </div>
        </div>
      </FormCard>
      <FormCard title="Diagnosis, Testing, and Closure" variant="teal-header">
        <div style={gridStyle}>
          <div><div style={labelStyle}>Diagnosis</div><div>{workOrder.diagnosis ?? "-"}</div></div>
          <div><div style={labelStyle}>Root Cause</div><div>{workOrder.rootCause ?? "-"}</div></div>
          <div><div style={labelStyle}>Corrective Action</div><div>{workOrder.correctiveAction ?? "-"}</div></div>
          <div><div style={labelStyle}>Preventive Action</div><div>{workOrder.preventiveAction ?? "-"}</div></div>
          <div><div style={labelStyle}>Test Result</div><div>{workOrder.testResult ?? "-"}</div></div>
        </div>
      </FormCard>
      <WorkExecutionTimeline workOrderId={workOrder.id} />
    </div>
  );
}
