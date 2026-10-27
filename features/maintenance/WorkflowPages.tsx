"use client";

import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, CheckCircle2, ClipboardCheck, Eye, PackageMinus, PackagePlus, Pencil, PlusCircle, Printer, Send, XCircle } from "lucide-react";

import { ActionButtons, DataTable, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";
import type { Role, User } from "@/features/administration/types";
import type { MaintenanceAsset, MaintenanceTicket, MaintenanceWorkOrder, PreventiveMaintenancePlan } from "@/features/maintenance/types";
import type { PreventiveMaintenanceHistoryRow } from "@/services/maintenance/maintenance.service";
import type { MaintenanceSpareRequestRecord } from "@/services/maintenance/maintenance.service";
import { colors } from "@/components/ui/colors";
import type { BadgeVariant } from "@/components/ui/badges";
import type { Item } from "@/types/master-data";

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

function toBadgeStatus(value: unknown): BadgeVariant {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "ACTIVE":
    case "APPROVED":
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "UNDER_MAINTENANCE":
    case "COMPLETED":
    case "TESTED":
    case "CLOSED":
      return "active";
    case "SUBMITTED":
    case "PENDING":
    case "WAITING_PARTS":
    case "WAITING_EXTERNAL_SERVICE":
      return "pending";
    case "REJECTED":
    case "CANCELLED":
    case "OUT_OF_SERVICE":
      return "rejected";
    case "PAUSED":
      return "inactive";
    default:
      return "draft";
  }
}

function money(value: number) {
  return new Intl.NumberFormat("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function toDateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function TicketAssignPage({ ticket, users }: { ticket: MaintenanceTicket | null; users: User[] }) {
  const router = useRouter();
  const [assignedToId, setAssignedToId] = useState(ticket?.assignedToId ?? "");
  const [priority, setPriority] = useState(ticket?.priority ?? "MEDIUM");
  const [targetCompletionDate, setTargetCompletionDate] = useState(toDateInput(ticket?.targetCompletionDate));
  const [remarks, setRemarks] = useState(ticket?.remarks ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!ticket) {
    return <div style={shellStyle}><EmptyState title="Ticket not found" message="The maintenance ticket you want to assign does not exist." action={{ label: "Back to Tickets", onClick: () => router.push("/maintenance/tickets") }} /></div>;
  }
  const currentTicket = ticket;

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/tickets/${currentTicket.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId, priority, targetCompletionDate, remarks }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to assign maintenance ticket");
        return;
      }
      router.push(publicViewUrl("maintenance.ticket", currentTicket.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Assign ${currentTicket.ticketNo}`}
        subtitle="Assign the maintenance request to a technician and set the target completion date."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Tickets", href: "/maintenance/tickets" }, { label: currentTicket.ticketNo, href: `/maintenance/tickets/${currentTicket.id}` }, { label: "Assign" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Assignment"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: "Assign Ticket", icon: <CheckCircle2 size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Ticket</span><div>{currentTicket.ticketNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentTicket.assetCode} - {currentTicket.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Current Status</span><StatusBadge status={toBadgeStatus(currentTicket.status)} /></div>
          <label style={fieldStyle}><span style={labelStyle}>Assigned Technician</span><select style={inputStyle} value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Priority</span><select style={inputStyle} value={priority} onChange={(event) => setPriority(event.target.value)}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Target Completion</span><input type="date" style={inputStyle} value={targetCompletionDate} onChange={(event) => setTargetCompletionDate(event.target.value)} /></label>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Remarks</span>
          <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </div>
      </FormCard>
    </div>
  );
}

export function TicketClosePage({ ticket }: { ticket: MaintenanceTicket | null }) {
  const router = useRouter();
  const [actualCompletionDate, setActualCompletionDate] = useState(toDateInput(ticket?.actualCompletionDate) || new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState(ticket?.remarks ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!ticket) {
    return <div style={shellStyle}><EmptyState title="Ticket not found" message="The maintenance ticket you want to close does not exist." action={{ label: "Back to Tickets", onClick: () => router.push("/maintenance/tickets") }} /></div>;
  }
  const currentTicket = ticket;

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/tickets/${currentTicket.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualCompletionDate, remarks }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to close maintenance ticket");
        return;
      }
      router.push(publicViewUrl("maintenance.ticket", currentTicket.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Close ${currentTicket.ticketNo}`}
        subtitle="Finalize the maintenance request after the repair and testing steps are complete."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Tickets", href: "/maintenance/tickets" }, { label: currentTicket.ticketNo, href: `/maintenance/tickets/${currentTicket.id}` }, { label: "Close" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Closure"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: "Close Ticket", icon: <ClipboardCheck size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Ticket</span><div>{currentTicket.ticketNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentTicket.assetCode} - {currentTicket.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Status</span><StatusBadge status={toBadgeStatus(currentTicket.status)} /></div>
          <label style={fieldStyle}><span style={labelStyle}>Actual Completion Date</span><input type="date" style={inputStyle} value={actualCompletionDate} onChange={(event) => setActualCompletionDate(event.target.value)} /></label>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Closure Remarks</span>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </div>
      </FormCard>
    </div>
  );
}

export function WorkOrderCompletePage({ workOrder, users }: { workOrder: MaintenanceWorkOrder | null; users: User[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    actualStart: toDateInput(workOrder?.actualStart) || new Date().toISOString().slice(0, 10),
    actualEnd: toDateInput(workOrder?.actualEnd) || new Date().toISOString().slice(0, 10),
    diagnosis: workOrder?.diagnosis ?? "",
    workPerformed: workOrder?.workPerformed ?? "",
    rootCause: workOrder?.rootCause ?? "",
    correctiveAction: workOrder?.correctiveAction ?? "",
    preventiveAction: workOrder?.preventiveAction ?? "",
    testResult: workOrder?.testResult ?? "",
    status: workOrder?.status === "TESTED" ? workOrder.status : "COMPLETED",
    completedById: workOrder?.completedById ?? "",
    approvedById: workOrder?.approvedById ?? "",
    closedById: workOrder?.closedById ?? "",
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!workOrder) {
    return <div style={shellStyle}><EmptyState title="Work order not found" message="The work order you want to complete does not exist." action={{ label: "Back to Work Orders", onClick: () => router.push("/maintenance/work-orders") }} /></div>;
  }
  const currentWorkOrder = workOrder;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/work-orders/${currentWorkOrder.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to complete maintenance work order");
        return;
      }
      router.push(publicViewUrl("maintenance.work-order", currentWorkOrder.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Complete ${currentWorkOrder.workOrderNo}`}
        subtitle="Record final repair findings, testing notes, and completion ownership."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: currentWorkOrder.workOrderNo, href: `/maintenance/work-orders/${currentWorkOrder.id}` }, { label: "Complete" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Completion"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: "Complete Work Order", icon: <CheckCircle2 size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Work Order</span><div>{currentWorkOrder.workOrderNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentWorkOrder.assetCode} - {currentWorkOrder.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Current Status</span><StatusBadge status={toBadgeStatus(currentWorkOrder.status)} /></div>
          <label style={fieldStyle}><span style={labelStyle}>Actual Start</span><input type="date" style={inputStyle} value={form.actualStart} onChange={(event) => updateField("actualStart", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Actual End</span><input type="date" style={inputStyle} value={form.actualEnd} onChange={(event) => updateField("actualEnd", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Next Status</span><select style={inputStyle} value={form.status} onChange={(event) => updateField("status", event.target.value)}>{["COMPLETED", "TESTED"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Completed By</span><select style={inputStyle} value={form.completedById} onChange={(event) => updateField("completedById", event.target.value)}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Approved By</span><select style={inputStyle} value={form.approvedById} onChange={(event) => updateField("approvedById", event.target.value)}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Closed By</span><select style={inputStyle} value={form.closedById} onChange={(event) => updateField("closedById", event.target.value)}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
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
              style={{ ...inputStyle, minHeight: 95, resize: "vertical" }}
              value={form[key as keyof typeof form] as string}
              onChange={(event) => updateField(key as keyof typeof form, event.target.value as never)}
            />
          </div>
        ))}
      </FormCard>
    </div>
  );
}

export function WorkOrderLifecyclePage({
  mode,
  workOrder,
  users = [],
}: {
  mode: "assign" | "close" | "reopen" | "cancel";
  workOrder: MaintenanceWorkOrder | null;
  users?: User[];
}) {
  const router = useRouter();
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(workOrder?.assignedTechnicianId ?? "");
  const [supervisorId, setSupervisorId] = useState(workOrder?.supervisorId ?? "");
  const [startNow, setStartNow] = useState(workOrder?.status !== "IN_PROGRESS");
  const [remarks, setRemarks] = useState("");
  const [leaveOutOfService, setLeaveOutOfService] = useState(workOrder?.testResult === "FAIL");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!workOrder) {
    return <div style={shellStyle}><EmptyState title="Work order not found" message="The requested maintenance work order does not exist." action={{ label: "Back to Work Orders", onClick: () => router.push("/maintenance/work-orders") }} /></div>;
  }
  const currentWorkOrder = workOrder;
  const title = mode === "assign" ? `${currentWorkOrder.status === "IN_PROGRESS" ? "Reassign" : "Assign"} ${currentWorkOrder.workOrderNo}` : mode === "close" ? `Close ${currentWorkOrder.workOrderNo}` : mode === "reopen" ? `Reopen ${currentWorkOrder.workOrderNo}` : `Cancel ${currentWorkOrder.workOrderNo}`;
  const actionLabel = mode === "assign" ? (startNow ? "Assign and Start" : "Assign Work Order") : mode === "close" ? "Close Work Order" : mode === "reopen" ? "Reopen Work Order" : "Cancel Work Order";

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/work-orders/${currentWorkOrder.id}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "assign"
          ? { assignedTechnicianId, supervisorId, startNow, remarks }
          : mode === "close"
            ? { closureRemarks: remarks, leaveOutOfService }
            : { reason: remarks }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? `Failed to ${mode} work order`);
        return;
      }
      router.push(publicViewUrl("maintenance.work-order", currentWorkOrder.publicId));
      router.refresh();
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={title}
        subtitle={mode === "assign" ? "Set accountable technicians and optionally begin execution." : mode === "close" ? "Close only after testing and spare-part reconciliation." : mode === "reopen" ? "Return a safely reversible closed order to active execution." : "Cancel safely after returning issued spare parts; any posted maintenance journal is reversed."}
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: currentWorkOrder.workOrderNo, href: `/maintenance/work-orders/${currentWorkOrder.id}` }, { label: mode === "assign" ? "Assign" : mode === "close" ? "Close" : mode === "reopen" ? "Reopen" : "Cancel" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Lifecycle Action"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: actionLabel, icon: <CheckCircle2 size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Work Order</span><div>{currentWorkOrder.workOrderNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentWorkOrder.assetCode} - {currentWorkOrder.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Current Status</span><StatusBadge status={toBadgeStatus(currentWorkOrder.status)} /></div>
          {mode === "assign" ? <>
            <label style={fieldStyle}><span style={labelStyle}>Assigned Technician</span><select style={inputStyle} value={assignedTechnicianId} onChange={(event) => setAssignedTechnicianId(event.target.value)}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label style={fieldStyle}><span style={labelStyle}>Supervisor</span><select style={inputStyle} value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)}><option value="">No supervisor</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label style={{ ...fieldStyle, flexDirection: "row", alignItems: "center", alignSelf: "end", minHeight: 48 }}><input type="checkbox" checked={startNow} onChange={(event) => setStartNow(event.target.checked)} /> Start work now</label>
          </> : null}
        </div>
        <label style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>{mode === "reopen" ? "Reopen Reason" : mode === "cancel" ? "Cancellation Reason" : mode === "close" ? "Closure Remarks" : "Assignment Remarks"}</span>
          <textarea required={mode === "reopen" || mode === "cancel"} style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </label>
        {mode === "close" ? (
          <label style={{ ...fieldStyle, flexDirection: "row", alignItems: "center", marginTop: 16 }}>
            <input type="checkbox" checked={leaveOutOfService} onChange={(event) => setLeaveOutOfService(event.target.checked)} />
            Leave asset out of service after unsuccessful repair
          </label>
        ) : null}
      </FormCard>
    </div>
  );
}

type PartWorkflowLineState = {
  partId: string;
  itemLabel: string;
  unitLabel: string;
  requestedQty: number;
  issuedQty: number;
  returnedQty: number;
  usedQty: number;
  damagedQty: number;
  availableQty: number;
  quantity: string;
  unitCost: string;
  remarks: string;
};

function buildPartIssueState(workOrder: MaintenanceWorkOrder) {
  return workOrder.parts.map((part) => ({
    partId: part.id,
    itemLabel: `${part.itemCode ?? ""} - ${part.itemName ?? ""}`.trim().replace(/^-\s*/, ""),
    unitLabel: [part.unitCode, part.unitName].filter(Boolean).join(" - ") || "-",
    requestedQty: Number(part.requestedQty ?? 0),
    issuedQty: Number(part.issuedQty ?? 0),
    returnedQty: Number(part.returnedQty ?? 0),
    usedQty: Number(part.usedQty ?? 0),
    damagedQty: Number(part.damagedQty ?? 0),
    availableQty: Number(part.availableQty ?? 0),
    quantity: String(Math.max(Number(part.requestedQty ?? 0) - Number(part.issuedQty ?? 0), 0)),
    unitCost: String(Number(part.unitCost ?? 0)),
    remarks: part.remarks ?? "",
  }));
}

function buildPartReturnState(workOrder: MaintenanceWorkOrder) {
  return workOrder.parts.map((part) => ({
    partId: part.id,
    itemLabel: `${part.itemCode ?? ""} - ${part.itemName ?? ""}`.trim().replace(/^-\s*/, ""),
    unitLabel: [part.unitCode, part.unitName].filter(Boolean).join(" - ") || "-",
    requestedQty: Number(part.requestedQty ?? 0),
    issuedQty: Number(part.issuedQty ?? 0),
    returnedQty: Number(part.returnedQty ?? 0),
    usedQty: Number(part.usedQty ?? 0),
    damagedQty: Number(part.damagedQty ?? 0),
    availableQty: Number(part.availableQty ?? 0),
    quantity: String(Math.max(Number(part.issuedQty ?? 0) - Number(part.returnedQty ?? 0) - Number(part.usedQty ?? 0) - Number(part.damagedQty ?? 0), 0)),
    unitCost: String(Number(part.unitCost ?? 0)),
    remarks: part.remarks ?? "",
  }));
}

export function MaintenanceWorkOrderIssuePartsPage({ workOrder, spareRequests = [] }: { workOrder: MaintenanceWorkOrder | null; spareRequests?: MaintenanceSpareRequestRecord[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<PartWorkflowLineState[]>(() => (workOrder ? buildPartIssueState(workOrder) : []));
  const [remarks, setRemarks] = useState("");
  const [spareRequestId, setSpareRequestId] = useState("");
  const [directIssueReason, setDirectIssueReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!workOrder) {
    return <div style={shellStyle}><EmptyState title="Work order not found" message="The work order you want to issue parts for does not exist." action={{ label: "Back to Work Orders", onClick: () => router.push("/maintenance/work-orders") }} /></div>;
  }

  const currentWorkOrder = workOrder;

  function updateLine(index: number, key: keyof PartWorkflowLineState, value: string) {
    setLines((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)));
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/work-orders/${currentWorkOrder.id}/issue-parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarks,
          spareRequestId: spareRequestId || null,
          directIssueReason: spareRequestId ? null : directIssueReason,
          lines: lines.map((entry) => ({
            partId: entry.partId,
            quantity: numeric(entry.quantity),
            unitCost: numeric(entry.unitCost),
            remarks: entry.remarks,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to issue work order parts");
        return;
      }
      router.push(publicViewUrl("maintenance.work-order", currentWorkOrder.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Issue Parts ${currentWorkOrder.workOrderNo}`}
        subtitle="Post spare parts from inventory into the work order through the shared maintenance inventory integration."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: currentWorkOrder.workOrderNo, href: `/maintenance/work-orders/${currentWorkOrder.id}` }, { label: "Issue Parts" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Issue Request"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: "Issue Parts", icon: <PackagePlus size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={{ ...gridStyle, marginBottom: 12 }}>
          <div style={fieldStyle}><span style={labelStyle}>Work Order</span><div>{currentWorkOrder.workOrderNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentWorkOrder.assetCode} - {currentWorkOrder.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Store Location</span><div>{currentWorkOrder.locationCode} - {currentWorkOrder.locationName}</div></div>
          <label style={fieldStyle}><span style={labelStyle}>Approved Spare Request</span><select style={inputStyle} value={spareRequestId} onChange={(event) => setSpareRequestId(event.target.value)}><option value="">Direct issue (no request)</option>{spareRequests.filter((request) => ["APPROVED", "PARTIALLY_ISSUED"].includes(request.status)).map((request) => <option key={request.id} value={request.id}>{request.requestNo} - {request.status}</option>)}</select></label>
          {!spareRequestId ? <label style={fieldStyle}><span style={labelStyle}>Direct-Issue Reason</span><input style={inputStyle} required value={directIssueReason} onChange={(event) => setDirectIssueReason(event.target.value)} placeholder="Emergency/breakdown justification" /></label> : null}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "UOM", "Requested", "Issued", "Available", "Issue Qty", "Unit Cost", "Remarks"].map((label) => (
                  <th key={label} style={{ padding: "10px 8px", textAlign: "left", color: colors.text.secondary }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((entry, index) => (
                <tr key={entry.partId}>
                  <td style={{ padding: "8px" }}>{entry.itemLabel}</td>
                  <td style={{ padding: "8px" }}>{entry.unitLabel}</td>
                  <td style={{ padding: "8px" }}>{entry.requestedQty}</td>
                  <td style={{ padding: "8px" }}>{entry.issuedQty}</td>
                  <td style={{ padding: "8px" }}>{entry.availableQty}</td>
                  <td style={{ padding: "8px" }}><input type="number" min="0" step="0.01" max={Math.max(entry.requestedQty - entry.issuedQty, 0)} style={inputStyle} value={entry.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></td>
                  <td style={{ padding: "8px" }}><input type="number" min="0" step="0.01" style={inputStyle} value={entry.unitCost} onChange={(event) => updateLine(index, "unitCost", event.target.value)} /></td>
                  <td style={{ padding: "8px" }}><input style={inputStyle} value={entry.remarks} onChange={(event) => updateLine(index, "remarks", event.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Issue Remarks</span>
          <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </div>
      </FormCard>
    </div>
  );
}

export function MaintenanceSpareRequestPage({ workOrder, requests }: { workOrder: MaintenanceWorkOrder | null; requests: MaintenanceSpareRequestRecord[] }) {
  const router = useRouter();
  const [lines, setLines] = useState(() => workOrder?.parts.map((part) => ({ partId: part.id, item: `${part.itemCode ?? ""} - ${part.itemName ?? ""}`, required: Math.max(Number(part.requestedQty) - Number(part.issuedQty), 0), quantity: String(Math.max(Number(part.requestedQty) - Number(part.issuedQty), 0)), remarks: "" })) ?? []);
  const [remarks, setRemarks] = useState(""); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  if (!workOrder) return <div style={shellStyle}><EmptyState title="Work order not found" message="The work order does not exist." /></div>;
  const current = workOrder;
  const update = (index: number, key: "quantity" | "remarks", value: string) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const create = () => startTransition(async () => { setMessage(""); const response = await fetch(`/api/maintenance/work-orders/${current.id}/spare-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remarks, lines: lines.map((line) => ({ partId: line.partId, quantity: numeric(line.quantity), remarks: line.remarks })) }) }); const result = await response.json(); if (!response.ok) return setMessage(result.error ?? "Failed to create spare request"); router.refresh(); });
  const act = (id: string, action: string) => startTransition(async () => { setMessage(""); const response = await fetch(`/api/maintenance/spare-requests/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const result = await response.json(); if (!response.ok) return setMessage(result.error ?? `Failed to ${action} request`); router.refresh(); });
  return <div style={shellStyle}><PageHeader title={`Spare Requests ${current.workOrderNo}`} subtitle="Request and approve planned spares before store issue; emergency direct issue remains separately authorized." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: current.workOrderNo, href: `/maintenance/work-orders/${current.id}` }, { label: "Spare Requests" }]} />
    {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
    <FormCard title="New Spare Request" variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: "Save Draft", icon: <PackagePlus size={16} />, variant: "primary", onClick: create, loading: pending }, { label: "Back", variant: "secondary", onClick: () => router.push(publicViewUrl("maintenance.work-order", current.publicId)) }]} /> }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Item", "Unissued Requirement", "Request Qty", "Remarks"].map((title) => <th key={title} style={{ padding: 8, textAlign: "left" }}>{title}</th>)}</tr></thead><tbody>{lines.map((line, index) => <tr key={line.partId}><td style={{ padding: 8 }}>{line.item}</td><td style={{ padding: 8 }}>{line.required}</td><td style={{ padding: 8 }}><input type="number" min="0" max={line.required} step="0.01" style={inputStyle} value={line.quantity} onChange={(event) => update(index, "quantity", event.target.value)} /></td><td style={{ padding: 8 }}><input style={inputStyle} value={line.remarks} onChange={(event) => update(index, "remarks", event.target.value)} /></td></tr>)}</tbody></table></div><label style={{ ...fieldStyle, marginTop: 14 }}><span style={labelStyle}>Remarks</span><textarea style={{ ...inputStyle, minHeight: 80 }} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label></FormCard>
    <FormCard title="Request Workflow"><DataTable columns={[{ key: "requestNo", label: "Request No" }, { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> }, { key: "createdAt", label: "Created", render: (value) => new Date(String(value)).toLocaleString() }, { key: "items", label: "Lines", render: (value) => Array.isArray(value) ? value.length : 0 }]} data={requests} actions={[
      { label: "Submit", icon: <Send size={16} />, onClick: (row: MaintenanceSpareRequestRecord) => row.status === "DRAFT" && act(row.id, "submit") },
      { label: "Check", icon: <ClipboardCheck size={16} />, onClick: (row: MaintenanceSpareRequestRecord) => row.status === "SUBMITTED" && act(row.id, "check") },
      { label: "Approve", icon: <Check size={16} />, onClick: (row: MaintenanceSpareRequestRecord) => row.status === "CHECKED" && act(row.id, "approve") },
      { label: "Reject", icon: <XCircle size={16} />, onClick: (row: MaintenanceSpareRequestRecord) => ["SUBMITTED", "CHECKED"].includes(row.status) && act(row.id, "reject") },
      { label: "Cancel", icon: <XCircle size={16} />, onClick: (row: MaintenanceSpareRequestRecord) => ["DRAFT", "SUBMITTED", "CHECKED"].includes(row.status) && act(row.id, "cancel") },
    ]} pageSize={10} emptyState={<EmptyState title="No spare requests" message="Create the first controlled spare request for this work order." />} /></FormCard>
  </div>;
}

export function MaintenanceWorkOrderReturnPartsPage({ workOrder }: { workOrder: MaintenanceWorkOrder | null }) {
  const router = useRouter();
  const [lines, setLines] = useState<PartWorkflowLineState[]>(() => (workOrder ? buildPartReturnState(workOrder) : []));
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!workOrder) {
    return <div style={shellStyle}><EmptyState title="Work order not found" message="The work order you want to return parts for does not exist." action={{ label: "Back to Work Orders", onClick: () => router.push("/maintenance/work-orders") }} /></div>;
  }

  const currentWorkOrder = workOrder;

  function updateLine(index: number, key: keyof PartWorkflowLineState, value: string) {
    setLines((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)));
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/work-orders/${currentWorkOrder.id}/return-parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarks,
          lines: lines.map((entry) => ({
            partId: entry.partId,
            quantity: numeric(entry.quantity),
            unitCost: numeric(entry.unitCost),
            remarks: entry.remarks,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to return work order parts");
        return;
      }
      router.push(publicViewUrl("maintenance.work-order", currentWorkOrder.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Return Parts ${currentWorkOrder.workOrderNo}`}
        subtitle="Return unused spare parts back to inventory and update used cost on the work order."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: currentWorkOrder.workOrderNo, href: `/maintenance/work-orders/${currentWorkOrder.id}` }, { label: "Return Parts" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Return Request"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: "Return Parts", icon: <PackageMinus size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={{ ...gridStyle, marginBottom: 12 }}>
          <div style={fieldStyle}><span style={labelStyle}>Work Order</span><div>{currentWorkOrder.workOrderNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentWorkOrder.assetCode} - {currentWorkOrder.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Return Location</span><div>{currentWorkOrder.locationCode} - {currentWorkOrder.locationName}</div></div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "UOM", "Issued", "Already Returned", "Current Used", "Damaged", "Return Qty", "Unit Cost", "Remarks"].map((label) => (
                  <th key={label} style={{ padding: "10px 8px", textAlign: "left", color: colors.text.secondary }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((entry, index) => (
                <tr key={entry.partId}>
                  <td style={{ padding: "8px" }}>{entry.itemLabel}</td>
                  <td style={{ padding: "8px" }}>{entry.unitLabel}</td>
                  <td style={{ padding: "8px" }}>{entry.issuedQty}</td>
                  <td style={{ padding: "8px" }}>{entry.returnedQty}</td>
                  <td style={{ padding: "8px" }}>{entry.usedQty}</td>
                  <td style={{ padding: "8px" }}>{entry.damagedQty}</td>
                  <td style={{ padding: "8px" }}><input type="number" min="0" step="0.01" max={Math.max(entry.issuedQty - entry.returnedQty - entry.usedQty - entry.damagedQty, 0)} style={inputStyle} value={entry.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></td>
                  <td style={{ padding: "8px" }}><input type="number" min="0" step="0.01" style={inputStyle} value={entry.unitCost} onChange={(event) => updateLine(index, "unitCost", event.target.value)} /></td>
                  <td style={{ padding: "8px" }}><input style={inputStyle} value={entry.remarks} onChange={(event) => updateLine(index, "remarks", event.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Return Remarks</span>
          <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </div>
      </FormCard>
    </div>
  );
}

type PartUsageLineState = {
  partId: string;
  itemLabel: string;
  unitLabel: string;
  issuedQty: number;
  returnedQty: number;
  usedQty: string;
  damagedQty: string;
  damageReason: string;
};

export function MaintenanceWorkOrderPartUsagePage({ workOrder }: { workOrder: MaintenanceWorkOrder | null }) {
  const router = useRouter();
  const [lines, setLines] = useState<PartUsageLineState[]>(() => workOrder?.parts.map((part) => ({
    partId: part.id,
    itemLabel: `${part.itemCode ?? ""} - ${part.itemName ?? ""}`.trim().replace(/^-\s*/, ""),
    unitLabel: [part.unitCode, part.unitName].filter(Boolean).join(" - ") || "-",
    issuedQty: Number(part.issuedQty ?? 0),
    returnedQty: Number(part.returnedQty ?? 0),
    usedQty: String(Number(part.usedQty ?? 0)),
    damagedQty: String(Number(part.damagedQty ?? 0)),
    damageReason: part.damageReason ?? "",
  })) ?? []);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!workOrder) {
    return <div style={shellStyle}><EmptyState title="Work order not found" message="The work order you want to reconcile does not exist." action={{ label: "Back to Work Orders", onClick: () => router.push("/maintenance/work-orders") }} /></div>;
  }
  const currentWorkOrder = workOrder;

  function updateLine(index: number, key: "usedQty" | "damagedQty" | "damageReason", value: string) {
    setLines((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry));
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/work-orders/${currentWorkOrder.id}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarks,
          lines: lines.map((entry) => ({
            partId: entry.partId,
            usedQty: numeric(entry.usedQty),
            damagedQty: numeric(entry.damagedQty),
            damageReason: entry.damageReason,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to record spare usage");
        return;
      }
      router.push(publicViewUrl("maintenance.work-order", currentWorkOrder.publicId));
      router.refresh();
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Reconcile Parts ${currentWorkOrder.workOrderNo}`}
        subtitle="Classify every issued spare as used, damaged, or returned before work-order closure."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: currentWorkOrder.workOrderNo, href: `/maintenance/work-orders/${currentWorkOrder.id}` }, { label: "Part Usage" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Usage and Damage"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: "Save Reconciliation", icon: <ClipboardCheck size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse" }}>
            <thead><tr>{["Item", "UOM", "Issued", "Returned", "Used", "Damaged", "Unresolved", "Damage Reason"].map((label) => <th key={label} style={{ padding: "10px 8px", textAlign: "left", color: colors.text.secondary }}>{label}</th>)}</tr></thead>
            <tbody>{lines.map((entry, index) => {
              const unresolved = Math.max(entry.issuedQty - entry.returnedQty - numeric(entry.usedQty) - numeric(entry.damagedQty), 0);
              return <tr key={entry.partId}>
                <td style={{ padding: 8 }}>{entry.itemLabel}</td><td style={{ padding: 8 }}>{entry.unitLabel}</td>
                <td style={{ padding: 8 }}>{entry.issuedQty}</td><td style={{ padding: 8 }}>{entry.returnedQty}</td>
                <td style={{ padding: 8 }}><input type="number" min="0" step="0.01" style={inputStyle} value={entry.usedQty} onChange={(event) => updateLine(index, "usedQty", event.target.value)} /></td>
                <td style={{ padding: 8 }}><input type="number" min="0" step="0.01" style={inputStyle} value={entry.damagedQty} onChange={(event) => updateLine(index, "damagedQty", event.target.value)} /></td>
                <td style={{ padding: 8, fontWeight: 700, color: unresolved > 0 ? colors.danger[600] : colors.success[600] }}>{unresolved}</td>
                <td style={{ padding: 8 }}><input style={inputStyle} required={numeric(entry.damagedQty) > 0} placeholder={numeric(entry.damagedQty) > 0 ? "Required" : "Optional"} value={entry.damageReason} onChange={(event) => updateLine(index, "damageReason", event.target.value)} /></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}><span style={labelStyle}>Reconciliation Remarks</span><textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></div>
      </FormCard>
    </div>
  );
}

type PMFormState = {
  assetId: string;
  title: string;
  maintenanceType: string;
  frequencyType: string;
  frequencyValue: string;
  nextDueDate: string;
  meterInterval: string;
  nextMeterReading: string;
  checklist: string;
  estimatedDurationMinutes: string;
  requiredRoleId: string;
  status: string;
  lastCompletedDate: string;
  triggerType: string;
  leadTimeDays: string;
  gracePeriodDays: string;
  autoGenerateWorkOrder: boolean;
  priority: string;
  preferredTechnicianId: string;
  plannedDowntimeMinutes: string;
  tasksText: string;
  plannedSpares: Array<{ itemId: string; quantity: number; remarks?: string }>;
};

function initialPMState(plan?: PreventiveMaintenancePlan | null): PMFormState {
  return {
    assetId: plan?.assetId ?? "",
    title: plan?.title ?? "",
    maintenanceType: plan?.maintenanceType ?? "PREVENTIVE",
    frequencyType: plan?.frequencyType ?? "MONTHLY",
    frequencyValue: String(plan?.frequencyValue ?? 1),
    nextDueDate: toDateInput(plan?.nextDueDate),
    meterInterval: plan?.meterInterval != null ? String(plan.meterInterval) : "",
    nextMeterReading: plan?.nextMeterReading != null ? String(plan.nextMeterReading) : "",
    checklist: plan?.checklist ?? "",
    estimatedDurationMinutes: String(plan?.estimatedDurationMinutes ?? 0),
    requiredRoleId: plan?.requiredRoleId ?? "",
    status: plan?.status ?? "DRAFT",
    lastCompletedDate: toDateInput(plan?.lastCompletedDate),
    triggerType: plan?.triggerType ?? "CALENDAR",
    leadTimeDays: String(plan?.leadTimeDays ?? 14),
    gracePeriodDays: String(plan?.gracePeriodDays ?? 0),
    autoGenerateWorkOrder: plan?.autoGenerateWorkOrder ?? true,
    priority: plan?.priority ?? "MEDIUM",
    preferredTechnicianId: plan?.preferredTechnicianId ?? "",
    plannedDowntimeMinutes: String(plan?.plannedDowntimeMinutes ?? 0),
    tasksText: plan?.tasks.map((task) => task.task).join("\n") ?? "",
    plannedSpares: plan?.plannedSpares.map((spare) => ({ itemId: spare.itemId, quantity: spare.quantity, remarks: spare.remarks })) ?? [],
  };
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PreventiveMaintenanceListPage({ plans }: { plans: PreventiveMaintenancePlan[] }) {
  const router = useRouter();
  const columns: Column<PreventiveMaintenancePlan>[] = [
    { key: "planNo", label: "Plan No" },
    { key: "assetCode", label: "Asset Code", render: (value) => value ?? "-" },
    { key: "assetName", label: "Asset" },
    { key: "title", label: "Title" },
    { key: "frequencyType", label: "Frequency" },
    { key: "nextDueDate", label: "Next Due", render: (value) => value ? new Date(String(value)).toLocaleDateString("en-KE") : "-" },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
  ];
  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(publicViewUrl("maintenance.pm", record.publicId)) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(publicEditUrl("maintenance.pm", record.publicId)) },
  ];

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Preventive Maintenance"
        subtitle="Manage preventive schedules, due dates, and recurring maintenance workload."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Preventive Maintenance" }]}
        actions={<ActionButtons actions={[{ label: "Create PM Plan", icon: <PlusCircle size={16} />, variant: "primary", onClick: () => router.push("/maintenance/pm/create") }, { label: "Due Soon", icon: <CalendarClock size={16} />, variant: "secondary", onClick: () => router.push("/maintenance/pm/due") }, { label: "Calendar", icon: <CalendarClock size={16} />, variant: "secondary", onClick: () => router.push("/maintenance/pm/calendar") }, { label: "History", icon: <CalendarClock size={16} />, variant: "secondary", onClick: () => router.push("/maintenance/pm/history") }]} />}
      />
      <DataTable columns={columns} data={plans} actions={actions} pageSize={15} emptyState={<EmptyState title="No PM plans yet" message="Create the first preventive maintenance plan to begin due-date scheduling." />} />
    </div>
  );
}

export function PreventiveMaintenanceFormPage({
  mode,
  plan,
  assets,
  roles,
  users,
  items,
}: {
  mode: "create" | "edit";
  plan?: PreventiveMaintenancePlan | null;
  assets: MaintenanceAsset[];
  roles: Role[];
  users: User[];
  items: Item[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<PMFormState>(() => initialPMState(plan));
  const [message, setMessage] = useState("");
  const [spareItemId, setSpareItemId] = useState("");
  const [spareQuantity, setSpareQuantity] = useState("1");
  const [isPending, startTransition] = useTransition();
  const selectedAsset = useMemo(() => assets.find((entry) => entry.id === form.assetId), [assets, form.assetId]);

  function updateField<K extends keyof PMFormState>(key: K, value: PMFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(mode === "create" ? "/api/maintenance/pm" : `/api/maintenance/pm/${plan?.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          frequencyValue: Math.max(1, numeric(form.frequencyValue)),
          meterInterval: form.meterInterval ? numeric(form.meterInterval) : null,
          nextMeterReading: form.nextMeterReading ? numeric(form.nextMeterReading) : null,
          estimatedDurationMinutes: Math.max(0, numeric(form.estimatedDurationMinutes)),
          leadTimeDays: Math.max(0, numeric(form.leadTimeDays)),
          gracePeriodDays: Math.max(0, numeric(form.gracePeriodDays)),
          plannedDowntimeMinutes: Math.max(0, numeric(form.plannedDowntimeMinutes)),
          tasks: form.tasksText.split(/\r?\n/).map((task) => task.trim()).filter(Boolean).map((task) => ({ task, isMandatory: true })),
          plannedSpares: form.plannedSpares,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to save preventive maintenance plan");
        return;
      }
      router.push(publicViewUrl("maintenance.pm", result.item.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={mode === "create" ? "Create PM Plan" : `Edit ${plan?.planNo ?? "PM Plan"}`}
        subtitle="Define the recurring preventive maintenance schedule for a live asset."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Preventive Maintenance", href: "/maintenance/pm" }, { label: mode === "create" ? "Create" : "Edit" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Plan Details"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: mode === "create" ? "Save Plan" : "Update Plan", icon: <CheckCircle2 size={16} />, variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={gridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Asset</span><select style={inputStyle} value={form.assetId} onChange={(event) => updateField("assetId", event.target.value)}><option value="">Select ...</option>{assets.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.assetCode} - {entry.assetName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Title</span><input style={inputStyle} value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder={selectedAsset ? `${selectedAsset.assetCode} routine service` : "Routine service"} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Maintenance Type</span><select style={inputStyle} value={form.maintenanceType} onChange={(event) => updateField("maintenanceType", event.target.value)}>{["PREVENTIVE", "INSPECTION", "CALIBRATION", "CORRECTIVE"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Frequency Type</span><select style={inputStyle} value={form.frequencyType} onChange={(event) => updateField("frequencyType", event.target.value)}>{["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "METER_BASED"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Trigger Policy</span><select style={inputStyle} value={form.triggerType} onChange={(event) => updateField("triggerType", event.target.value)}>{["CALENDAR", "METER", "HYBRID"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Frequency Value</span><input type="number" min="1" step="1" style={inputStyle} value={form.frequencyValue} onChange={(event) => updateField("frequencyValue", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Next Due Date</span><input type="date" style={inputStyle} value={form.nextDueDate} onChange={(event) => updateField("nextDueDate", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Meter Interval</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.meterInterval} onChange={(event) => updateField("meterInterval", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Next Meter Reading</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.nextMeterReading} onChange={(event) => updateField("nextMeterReading", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Estimated Duration (Minutes)</span><input type="number" min="0" step="1" style={inputStyle} value={form.estimatedDurationMinutes} onChange={(event) => updateField("estimatedDurationMinutes", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Planning Lead Time (Days)</span><input type="number" min="0" step="1" style={inputStyle} value={form.leadTimeDays} onChange={(event) => updateField("leadTimeDays", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Grace Period (Days)</span><input type="number" min="0" step="1" style={inputStyle} value={form.gracePeriodDays} onChange={(event) => updateField("gracePeriodDays", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Planned Downtime (Minutes)</span><input type="number" min="0" step="1" style={inputStyle} value={form.plannedDowntimeMinutes} onChange={(event) => updateField("plannedDowntimeMinutes", event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Priority</span><select style={inputStyle} value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Preferred Technician</span><select style={inputStyle} value={form.preferredTechnicianId} onChange={(event) => updateField("preferredTechnicianId", event.target.value)}><option value="">Assign later</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={{ ...fieldStyle, justifyContent: "flex-end" }}><span style={labelStyle}>Automation</span><span style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 46 }}><input type="checkbox" checked={form.autoGenerateWorkOrder} onChange={(event) => updateField("autoGenerateWorkOrder", event.target.checked)} /> Generate work order automatically when due</span></label>
          <label style={fieldStyle}><span style={labelStyle}>Required Role</span><select style={inputStyle} value={form.requiredRoleId} onChange={(event) => updateField("requiredRoleId", event.target.value)}><option value="">No explicit role</option>{roles.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Status</span><select style={inputStyle} value={form.status} onChange={(event) => updateField("status", event.target.value)}>{["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Last Completed</span><input type="date" style={inputStyle} value={form.lastCompletedDate} onChange={(event) => updateField("lastCompletedDate", event.target.value)} /></label>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Checklist</span>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={form.checklist} onChange={(event) => updateField("checklist", event.target.value)} placeholder="List the PM steps, checks, and expected findings." />
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Mandatory Checklist Tasks (one per line)</span>
          <textarea style={{ ...inputStyle, minHeight: 130, resize: "vertical" }} value={form.tasksText} onChange={(event) => updateField("tasksText", event.target.value)} placeholder={"Lock out machine\nInspect guards and belts\nLubricate bearings\nRun and verify output"} />
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Planned Spare Parts</span>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) 130px auto", gap: 10 }}>
            <select style={inputStyle} value={spareItemId} onChange={(event) => setSpareItemId(event.target.value)}><option value="">Select ...</option>{items.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.itemCode} - {entry.itemName}</option>)}</select>
            <input type="number" min="0.0001" step="0.0001" style={inputStyle} value={spareQuantity} onChange={(event) => setSpareQuantity(event.target.value)} />
            <button type="button" style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 700 }} onClick={() => { const quantity = numeric(spareQuantity); if (!spareItemId || quantity <= 0) return; updateField("plannedSpares", [...form.plannedSpares.filter((entry) => entry.itemId !== spareItemId), { itemId: spareItemId, quantity }]); setSpareItemId(""); setSpareQuantity("1"); }}>Add Spare</button>
          </div>
          {form.plannedSpares.map((spare) => { const item = items.find((entry) => entry.id === spare.itemId); return <div key={spare.itemId} style={{ display: "flex", justifyContent: "space-between", gap: 12, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "10px 12px" }}><span>{item ? `${item.itemCode} - ${item.itemName}` : spare.itemId} · {spare.quantity}</span><button type="button" onClick={() => updateField("plannedSpares", form.plannedSpares.filter((entry) => entry.itemId !== spare.itemId))} style={{ border: 0, background: "transparent", color: colors.danger[600], cursor: "pointer" }}>Remove</button></div>; })}
        </div>
      </FormCard>
    </div>
  );
}

export function PreventiveMaintenanceDetailPage({ plan }: { plan: PreventiveMaintenancePlan | null }) {
  const router = useRouter();
  const [requestedDueDate, setRequestedDueDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  if (!plan) {
    return <div style={shellStyle}><EmptyState title="PM plan not found" message="The requested preventive maintenance plan does not exist." action={{ label: "Back to PM Plans", onClick: () => router.push("/maintenance/pm") }} /></div>;
  }
  const currentPlan = plan;

  function requestReschedule() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/pm/${currentPlan.id}/reschedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestedDueDate, reason: rescheduleReason }) });
      const result = await response.json();
      setMessage(response.ok ? "Schedule-change request submitted for check and approval." : result.error ?? "Failed to request schedule change");
      if (response.ok) router.refresh();
    });
  }

  function scheduleAction(changeId: string, action: "check" | "approve" | "reject") {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/pm/reschedule/${changeId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const result = await response.json();
      setMessage(response.ok ? `Schedule change ${action} action completed.` : result.error ?? `Failed to ${action} schedule change`);
      if (response.ok) router.refresh();
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="maintenance"
        title={currentPlan.planNo}
        subtitle="Recurring preventive maintenance definition and execution history."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Preventive Maintenance", href: "/maintenance/pm" }, { label: currentPlan.planNo }]}
        actions={<ActionButtons actions={[{ label: "Edit Plan", icon: <Pencil size={16} />, variant: "secondary", onClick: () => router.push(publicEditUrl("maintenance.pm", currentPlan.publicId)) }, { label: "Print", icon: <Printer size={16} />, variant: "secondary", onClick: () => window.print() }]} />}
      />
      {message ? <div style={{ color: message.includes("Failed") ? colors.danger[600] : colors.primary[700], fontWeight: 700 }}>{message}</div> : null}
      <FormCard title="Plan Overview" variant="teal-header">
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentPlan.assetCode} - {currentPlan.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Title</span><div>{currentPlan.title}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Frequency</span><div>{currentPlan.frequencyType} x {currentPlan.frequencyValue}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Next Due</span><div>{currentPlan.nextDueDate ? new Date(currentPlan.nextDueDate).toLocaleDateString("en-KE") : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Required Role</span><div>{currentPlan.requiredRoleName ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Status</span><StatusBadge status={toBadgeStatus(currentPlan.status)} /></div>
          <div style={fieldStyle}><span style={labelStyle}>Last Completed</span><div>{currentPlan.lastCompletedDate ? new Date(currentPlan.lastCompletedDate).toLocaleDateString("en-KE") : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Estimated Duration</span><div>{currentPlan.estimatedDurationMinutes} min</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Meter Trigger</span><div>{currentPlan.meterInterval != null ? `${currentPlan.meterInterval} / next ${currentPlan.nextMeterReading ?? "-"}` : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Trigger Policy</span><div>{currentPlan.triggerType}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Automation</span><div>{currentPlan.autoGenerateWorkOrder ? `Generate ${currentPlan.leadTimeDays} day(s) ahead` : "Manual generation"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Preferred Technician</span><div>{currentPlan.preferredTechnicianName ?? "Assign later"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Planned Downtime</span><div>{currentPlan.plannedDowntimeMinutes} min</div></div>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Checklist</span>
          <div>{currentPlan.checklist ?? "-"}</div>
        </div>
      </FormCard>
      <FormCard title="Controlled Checklist & Spare Plan" variant="teal-header">
        <div style={gridStyle}>
          <div><div style={labelStyle}>Mandatory Tasks</div><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{currentPlan.tasks.length ? currentPlan.tasks.map((task) => <div key={task.id}>{task.sequence}. {task.task}{task.isMandatory ? " *" : ""}</div>) : <span>-</span>}</div></div>
          <div><div style={labelStyle}>Planned Spares</div><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{currentPlan.plannedSpares.length ? currentPlan.plannedSpares.map((spare) => <div key={spare.id}>{spare.itemCode} - {spare.itemName}: {spare.quantity} <span style={{ color: spare.availableQuantity < spare.quantity ? colors.danger[600] : colors.text.secondary }}>(available {spare.availableQuantity})</span></div>) : <span>-</span>}</div></div>
        </div>
      </FormCard>
      <FormCard title="Schedule Change Control" variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) minmax(260px, 1fr) auto", gap: 12, alignItems: "end" }}>
          <label style={fieldStyle}><span style={labelStyle}>Requested Due Date</span><input type="date" style={inputStyle} value={requestedDueDate} onChange={(event) => setRequestedDueDate(event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Reason</span><input style={inputStyle} value={rescheduleReason} onChange={(event) => setRescheduleReason(event.target.value)} placeholder="Production commitment, unavailable specialist, parts delay..." /></label>
          <button type="button" disabled={isPending} onClick={requestReschedule} style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 700 }}>Request Reschedule</button>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>{currentPlan.scheduleChanges.map((change) => <div key={change.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><strong>{new Date(change.previousDueDate).toLocaleDateString("en-KE")} → {new Date(change.requestedDueDate).toLocaleDateString("en-KE")}</strong><div style={{ color: colors.text.secondary }}>{change.reason} · {change.status}</div></div>{["PENDING", "CHECKED"].includes(change.status) ? <ActionButtons actions={[...(change.status === "PENDING" ? [{ label: "Check", icon: <Check size={16} />, variant: "secondary" as const, onClick: () => scheduleAction(change.id, "check") }] : [{ label: "Approve", icon: <CheckCircle2 size={16} />, variant: "primary" as const, onClick: () => scheduleAction(change.id, "approve") }]), { label: "Reject", icon: <XCircle size={16} />, variant: "danger" as const, onClick: () => scheduleAction(change.id, "reject") }]} /> : null}</div>)}</div>
      </FormCard>
      <FormCard title="Execution History" variant="teal-header">
        <DataTable
          columns={[
            { key: "scheduledDate", label: "Scheduled", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
            { key: "completedDate", label: "Completed", render: (value) => value ? new Date(String(value)).toLocaleDateString("en-KE") : "-" },
            { key: "workOrderNo", label: "Work Order", render: (value) => value ?? "-" },
            { key: "meterReading", label: "Meter", render: (value) => value ?? "-" },
            { key: "result", label: "Result", render: (value) => value ?? "-" },
          ]}
          data={currentPlan.executions}
          pageSize={10}
          emptyState={<EmptyState title="No executions yet" message="This PM plan has not been executed yet." />}
        />
      </FormCard>
    </div>
  );
}

export function PreventiveMaintenanceDuePage({ plans }: { plans: PreventiveMaintenancePlan[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const duePlans = plans;
  function generateWorkOrders() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/maintenance/pm/generate-due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planIds: duePlans.map((plan) => plan.id) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to generate preventive maintenance work orders");
        return;
      }
      setMessage(result.items.length ? `${result.items.length} work order(s) generated.` : "No due plans required a new work order.");
      router.refresh();
    });
  }
  return (
    <div style={shellStyle}>
      <PageHeader title="PM Due Soon" subtitle="Preventive maintenance workload due in the upcoming planning window." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Preventive Maintenance", href: "/maintenance/pm" }, { label: "Due Soon" }]} actions={<ActionButtons actions={[{ label: "Generate Due Work Orders", icon: <ClipboardCheck size={16} />, variant: "primary", onClick: generateWorkOrders, loading: isPending }]} />} />
      {message ? <div style={{ color: message.includes("Failed") ? colors.danger[600] : colors.primary[700], fontWeight: 700 }}>{message}</div> : null}
      <DataTable
        columns={[
          { key: "planNo", label: "Plan No" },
          { key: "assetCode", label: "Asset Code", render: (value) => value ?? "-" },
          { key: "assetName", label: "Asset" },
          { key: "title", label: "Title" },
          { key: "dueReason", label: "Trigger", render: (value) => value ?? "-" },
          { key: "nextDueDate", label: "Next Due", render: (value) => value ? new Date(String(value)).toLocaleDateString("en-KE") : "-" },
          { key: "plannedSpares", label: "Spare Readiness", render: (_value, record) => { const shortage = record.plannedSpares.filter((spare: PreventiveMaintenancePlan["plannedSpares"][number]) => spare.availableQuantity < spare.quantity).length; return shortage ? <span style={{ color: colors.danger[600], fontWeight: 700 }}>{shortage} shortage(s)</span> : `${record.plannedSpares.length} ready`; } },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
        ]}
        data={duePlans}
        pageSize={15}
        emptyState={<EmptyState title="No PM plans due soon" message="Nothing is currently scheduled in the due window." />}
      />
    </div>
  );
}

export function PreventiveMaintenanceCalendarPage({ plans }: { plans: PreventiveMaintenancePlan[] }) {
  const grouped = useMemo(() => {
    return plans.reduce<Record<string, PreventiveMaintenancePlan[]>>((accumulator, plan) => {
      const key = plan.nextDueDate ? new Date(plan.nextDueDate).toISOString().slice(0, 7) : "Unscheduled";
      accumulator[key] = accumulator[key] ? [...accumulator[key], plan] : [plan];
      return accumulator;
    }, {});
  }, [plans]);

  return (
    <div style={shellStyle}>
      <PageHeader title="PM Calendar" subtitle="Monthly preventive maintenance schedule overview for live assets." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Preventive Maintenance", href: "/maintenance/pm" }, { label: "Calendar" }]} />
      {Object.keys(grouped).length === 0 ? (
        <EmptyState title="No PM plans in the calendar" message="Create active PM plans with due dates to populate the calendar." />
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {Object.entries(grouped).map(([month, entries]) => (
            <FormCard key={month} title={month === "Unscheduled" ? "Unscheduled" : month} variant="teal-header">
              <div style={{ display: "grid", gap: 12 }}>
                {entries.map((entry) => (
                  <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${colors.border}`, borderRadius: 14, padding: "12px 14px" }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontWeight: 700 }}>{entry.planNo} - {entry.title}</div>
                      <div style={{ color: colors.text.secondary }}>{entry.assetCode} - {entry.assetName}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div>{entry.nextDueDate ? new Date(entry.nextDueDate).toLocaleDateString("en-KE") : "No due date"}</div>
                      <div style={{ marginTop: 6 }}><StatusBadge status={toBadgeStatus(entry.status)} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </FormCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function MaintenanceWorkOrderPrintView({ workOrder }: { workOrder: MaintenanceWorkOrder | null }) {
  const router = useRouter();
  if (!workOrder) {
    return <div style={shellStyle}><EmptyState title="Work order not found" message="The maintenance work order does not exist." action={{ label: "Back to Work Orders", onClick: () => router.push("/maintenance/work-orders") }} /></div>;
  }
  const currentWorkOrder = workOrder;

  return (
    <div style={{ ...shellStyle, maxWidth: 1120, margin: "0 auto", background: "#fff" }}>
      <PageHeader
        title={`Print ${currentWorkOrder.workOrderNo}`}
        subtitle="Maintenance work order print preview"
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: currentWorkOrder.workOrderNo, href: `/maintenance/work-orders/${currentWorkOrder.id}` }, { label: "Print" }]}
        actions={<ActionButtons actions={[{ label: "Print", icon: <Printer size={16} />, variant: "primary", onClick: () => window.print() }, { label: "Back", variant: "secondary", onClick: () => router.back() }]} />}
      />
      <FormCard title="Header" variant="teal-header">
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Work Order No</span><div>{currentWorkOrder.workOrderNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Ticket No</span><div>{currentWorkOrder.ticketNo ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{currentWorkOrder.assetCode} - {currentWorkOrder.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Location</span><div>{currentWorkOrder.locationCode} - {currentWorkOrder.locationName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Technician</span><div>{currentWorkOrder.assignedTechnicianName ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Status</span><div>{currentWorkOrder.status}</div></div>
        </div>
      </FormCard>
      <FormCard title="Execution Summary" variant="teal-header">
        <div style={{ display: "grid", gap: 14 }}>
          <div><strong>Problem:</strong> {currentWorkOrder.problemDescription}</div>
          <div><strong>Diagnosis:</strong> {currentWorkOrder.diagnosis ?? "-"}</div>
          <div><strong>Work Performed:</strong> {currentWorkOrder.workPerformed ?? "-"}</div>
          <div><strong>Root Cause:</strong> {currentWorkOrder.rootCause ?? "-"}</div>
          <div><strong>Corrective Action:</strong> {currentWorkOrder.correctiveAction ?? "-"}</div>
          <div><strong>Preventive Action:</strong> {currentWorkOrder.preventiveAction ?? "-"}</div>
          <div><strong>Test Result:</strong> {currentWorkOrder.testResult ?? "-"}</div>
        </div>
      </FormCard>
      <FormCard title="Parts and Cost" variant="teal-header">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "Requested", "Issued", "Used", "Returned", "Unit Cost", "Total Cost"].map((label) => (
                  <th key={label} style={{ padding: "10px 8px", textAlign: "left", color: colors.text.secondary, borderBottom: `1px solid ${colors.border}` }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentWorkOrder.parts.map((part) => (
                <tr key={part.id}>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>{part.itemCode} - {part.itemName}</td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>{part.requestedQty}</td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>{part.issuedQty}</td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>{part.usedQty}</td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>{part.returnedQty}</td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>ETB {money(part.unitCost)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>ETB {money(part.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div><strong>Spare Cost:</strong> ETB {money(currentWorkOrder.totalSpareCost)}</div>
          <div><strong>Labor Cost:</strong> ETB {money(currentWorkOrder.totalLaborCost)}</div>
          <div><strong>External Cost:</strong> ETB {money(currentWorkOrder.totalExternalCost)}</div>
          <div><strong>Total Cost:</strong> ETB {money(currentWorkOrder.totalCost)}</div>
        </div>
      </FormCard>
    </div>
  );
}

export function MaintenanceTicketPrintView({ ticket }: { ticket: MaintenanceTicket | null }) {
  const router = useRouter();
  if (!ticket) {
    return <div style={shellStyle}><EmptyState title="Ticket not found" message="The maintenance ticket does not exist." action={{ label: "Back to Tickets", onClick: () => router.push("/maintenance/tickets") }} /></div>;
  }

  return (
    <div style={{ ...shellStyle, maxWidth: 1120, margin: "0 auto", background: "#fff" }}>
      <PageHeader
        title={`Print ${ticket.ticketNo}`}
        subtitle="Maintenance ticket print preview"
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Tickets", href: "/maintenance/tickets" }, { label: ticket.ticketNo, href: `/maintenance/tickets/${ticket.id}` }, { label: "Print" }]}
        actions={<ActionButtons actions={[{ label: "Print", icon: <Printer size={16} />, variant: "primary", onClick: () => window.print() }, { label: "Back", variant: "secondary", onClick: () => router.back() }]} />}
      />
      <FormCard title="Header" variant="teal-header">
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Ticket No</span><div>{ticket.ticketNo}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{ticket.assetCode} - {ticket.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Location</span><div>{ticket.locationCode} - {ticket.locationName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Type</span><div>{ticket.type}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Priority</span><div>{ticket.priority}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Status</span><div>{ticket.status}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Requested By</span><div>{ticket.requestedByName ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Assigned To</span><div>{ticket.assignedToName ?? "-"}</div></div>
        </div>
      </FormCard>
      <FormCard title="Problem" variant="teal-header">
        <div>{ticket.problemDescription}</div>
        <div style={{ marginTop: 12 }}><strong>Remarks:</strong> {ticket.remarks ?? "-"}</div>
      </FormCard>
    </div>
  );
}

export function PreventiveMaintenanceHistoryPage({ rows }: { rows: PreventiveMaintenanceHistoryRow[] }) {
  const router = useRouter();
  return (
    <div style={shellStyle}>
      <PageHeader
        title="Preventive Maintenance History"
        subtitle="Completed, missed, and cancelled preventive executions."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Preventive Maintenance", href: "/maintenance/pm" }, { label: "History" }]}
        actions={<ActionButtons actions={[{ label: "Back to Plans", variant: "secondary", onClick: () => router.push("/maintenance/pm") }]} />}
      />
      <DataTable
        columns={[
          { key: "planNo", label: "Plan" },
          { key: "assetCode", label: "Asset", render: (_value, row) => `${row.assetCode ?? ""} - ${row.assetName ?? ""}` },
          { key: "title", label: "Title" },
          { key: "scheduledDate", label: "Scheduled", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
          { key: "completedDate", label: "Completed", render: (value) => value ? new Date(String(value)).toLocaleDateString("en-KE") : "—" },
          { key: "workOrderNo", label: "Work Order", render: (value) => value ?? "—" },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
          { key: "result", label: "Result", render: (value) => value ?? "—" },
        ]}
        data={rows}
        pageSize={15}
        emptyState={<EmptyState title="No PM history yet" message="Completed preventive executions will appear here." />}
      />
    </div>
  );
}

export function MaintenanceAssetHistoryPageView({
  asset,
  tickets,
  workOrders,
  lifecycleHistory,
  qualityHistory,
}: {
  asset: MaintenanceAsset | null;
  tickets: MaintenanceTicket[];
  workOrders: MaintenanceWorkOrder[];
  lifecycleHistory: Array<{ id: string; eventType: string; eventDate: string; oldStatus: string | null; newStatus: string | null; oldLocationName: string | null; newLocationName: string | null; performedByName: string | null; remarks: string | null }>;
  qualityHistory: Array<{ id: string; testNo: string; sampleDate: string; testType: string; batchNo: string | null; result: string; status: string; failedParameters: number; nonconformityNo: string | null; maintenanceTicketId: string | null; maintenanceTicketNo: string | null; maintenanceStatus: string | null }>;
}) {
  const router = useRouter();
  if (!asset) {
    return <div style={shellStyle}><EmptyState title="Asset not found" message="The requested asset history is not available." action={{ label: "Back to Assets", onClick: () => router.push("/assets") }} /></div>;
  }

  const assetTickets = tickets.filter((entry) => entry.assetId === asset.id);
  const assetWorkOrders = workOrders.filter((entry) => entry.assetId === asset.id);

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`${asset.assetCode} History`}
        subtitle="Trace maintenance requests and work orders recorded against this asset."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Assets", href: "/assets" }, { label: asset.assetCode, href: `/assets/${asset.id}` }, { label: "History" }]}
        actions={<ActionButtons actions={[{ label: "View Asset", variant: "secondary", onClick: () => router.push(`/assets/${asset.id}`) }, { label: "Create Ticket", variant: "primary", onClick: () => router.push(`/maintenance/tickets/create?assetId=${asset.id}`) }]} />}
      />
      <FormCard title="Asset Snapshot" variant="teal-header">
        <div style={gridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Asset</span><div>{asset.assetCode} - {asset.assetName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Location</span><div>{asset.locationCode} - {asset.locationName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Status</span><StatusBadge status={toBadgeStatus(asset.status)} /></div>
          <div style={fieldStyle}><span style={labelStyle}>Criticality</span><div>{asset.criticality}</div></div>
        </div>
      </FormCard>
      <FormCard title="Lifecycle Timeline" variant="teal-header">
        <DataTable
          columns={[
            { key: "eventDate", label: "Date", render: (value) => new Date(String(value)).toLocaleString("en-KE") },
            { key: "eventType", label: "Event", render: (value) => String(value).replace(/_/g, " ") },
            { key: "oldStatus", label: "Previous Status", render: (value) => value ?? "-" },
            { key: "newStatus", label: "New Status", render: (value) => value ?? "-" },
            { key: "oldLocationName", label: "From", render: (value) => value ?? "-" },
            { key: "newLocationName", label: "To", render: (value) => value ?? "-" },
            { key: "performedByName", label: "Performed By", render: (value) => value ?? "-" },
          ]}
          data={lifecycleHistory}
          pageSize={10}
          emptyState={<EmptyState title="No lifecycle events" message="Assignments, transfers, meter readings, and status changes will appear here." />}
        />
      </FormCard>
      <FormCard title="Ticket History" variant="teal-header">
        <DataTable
          columns={[
            { key: "ticketNo", label: "Ticket No" },
            { key: "requestDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
            { key: "type", label: "Type" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
          ]}
          data={assetTickets}
          pageSize={10}
          emptyState={<EmptyState title="No ticket history" message="No maintenance tickets are linked to this asset yet." />}
        />
      </FormCard>
      <FormCard title="Machine Quality and Failure History" variant="teal-header">
        <DataTable
          columns={[
            { key: "sampleDate", label: "Date", render: (value) => new Date(String(value)).toLocaleString("en-KE") },
            { key: "testNo", label: "QC Test" },
            { key: "testType", label: "Test Type" },
            { key: "batchNo", label: "Batch", render: (value) => value ?? "-" },
            { key: "result", label: "Result", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
            { key: "failedParameters", label: "Failed Parameters" },
            { key: "nonconformityNo", label: "Nonconformity", render: (value) => value ?? "-" },
            { key: "maintenanceTicketNo", label: "Maintenance Ticket", render: (value) => value ?? "-" },
            { key: "maintenanceStatus", label: "Repair Status", render: (value) => value ? <StatusBadge status={toBadgeStatus(value)} /> : "-" },
          ]}
          data={qualityHistory}
          pageSize={10}
          emptyState={<EmptyState title="No machine quality history" message="Machine-linked QC tests, failures, nonconformities, and maintenance escalations will appear here." />}
        />
      </FormCard>
      <FormCard title="Work Order History" variant="teal-header">
        <DataTable
          columns={[
            { key: "workOrderNo", label: "Work Order No" },
            { key: "scheduledStart", label: "Scheduled", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
            { key: "workType", label: "Type" },
            { key: "priority", label: "Priority" },
            { key: "totalCost", label: "Total Cost", render: (value) => `ETB ${money(Number(value ?? 0))}` },
            { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
          ]}
          data={assetWorkOrders}
          pageSize={10}
          emptyState={<EmptyState title="No work order history" message="No maintenance work orders are linked to this asset yet." />}
        />
      </FormCard>
    </div>
  );
}
