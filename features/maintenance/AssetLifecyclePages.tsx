"use client";

import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, ClipboardCheck, Eye, Pencil, PlusCircle, RotateCcw, Send, XCircle } from "lucide-react";

import { ActionButtons, DataTable, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";
import type { User } from "@/features/administration/types";
import type { Department, Location } from "@/features/master-data/types";
import type { MaintenanceAsset } from "@/features/maintenance/types";
import type { AssetAssignmentRecord, AssetMeterReadingRecord, AssetTransferRecord } from "@/services/maintenance/asset-lifecycle.service";

const shell: React.CSSProperties = { padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7 };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase" };
const input: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid #94a3b8", borderRadius: 14, background: "white", fontSize: 15 };

function badge(value: unknown) {
  const status = String(value);
  if (["POSTED", "ACTIVE", "RETURNED"].includes(status)) return <StatusBadge status="active" />;
  if (["REJECTED", "CANCELLED"].includes(status)) return <StatusBadge status="rejected" />;
  if (["SUBMITTED", "CHECKED", "APPROVED"].includes(status)) return <StatusBadge status="pending" />;
  return <StatusBadge status="draft" />;
}

export function AssetAssignmentsPage({ assignments }: { assignments: AssetAssignmentRecord[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const columns: Column<AssetAssignmentRecord>[] = [
    { key: "assignmentNo", label: "Assignment No" },
    { key: "assetCode", label: "Asset" , render: (_value, row) => `${row.assetCode} - ${row.assetName}` },
    { key: "assignedToType", label: "Target" },
    { key: "assigneeName", label: "Assigned To" },
    { key: "assignedDate", label: "Assigned Date", render: (value) => new Date(String(value)).toLocaleDateString() },
    { key: "expectedReturnDate", label: "Expected Return", render: (value) => value ? new Date(String(value)).toLocaleDateString() : "-" },
    { key: "status", label: "Status", render: badge },
  ];
  const transition = (record: AssetAssignmentRecord, action: string) => startTransition(async () => {
    setMessage("");
    const response = await fetch(`/api/maintenance/asset-assignments/${record.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? `Failed to ${action} assignment`);
    router.refresh();
  });
  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record: AssetAssignmentRecord) => router.push(publicViewUrl("maintenance.assignment", record.publicId)) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record: AssetAssignmentRecord) => record.status === "DRAFT" && router.push(`/maintenance/assets/assignments/${record.id}/edit`) },
    { label: "Submit", icon: <Send size={16} />, onClick: (record: AssetAssignmentRecord) => record.status === "DRAFT" && transition(record, "submit") },
    { label: "Check", icon: <ClipboardCheck size={16} />, onClick: (record: AssetAssignmentRecord) => record.status === "SUBMITTED" && transition(record, "check") },
    { label: "Approve", icon: <Check size={16} />, onClick: (record: AssetAssignmentRecord) => record.status === "CHECKED" && transition(record, "approve") },
    { label: "Reject", icon: <XCircle size={16} />, onClick: (record: AssetAssignmentRecord) => ["SUBMITTED", "CHECKED"].includes(record.status) && transition(record, "reject") },
    { label: "Cancel", icon: <XCircle size={16} />, onClick: (record: AssetAssignmentRecord) => ["DRAFT", "SUBMITTED", "CHECKED"].includes(record.status) && transition(record, "cancel") },
    { label: "Return", icon: <RotateCcw size={16} />, onClick: (record: AssetAssignmentRecord) => record.status === "ACTIVE" && router.push(`/maintenance/assets/assignments/${record.id}/return`) },
  ];
  return <div style={shell}>
    <PageHeader title="Asset Assignments" subtitle="Responsibility and operational ownership without moving inventory or changing physical location." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Assets", href: "/maintenance/assets" }, { label: "Assignments" }]} actions={<ActionButtons actions={[{ label: "Assign Asset", icon: <PlusCircle size={16} />, variant: "primary", onClick: () => router.push("/maintenance/assets/assignments/create") }]} />} />
    {message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}
    {pending ? <div>Updating assignment...</div> : null}
    <DataTable columns={columns} data={assignments} actions={actions} pageSize={15} emptyState={<EmptyState title="No asset assignments" message="Assign an asset to a user, department, or operational location." />} />
  </div>;
}

function toDateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function AssetAssignmentFormPage({
  assets,
  users,
  departments,
  locations,
  presetAssetId = "",
  assignment,
}: {
  assets: MaintenanceAsset[];
  users: User[];
  departments: Department[];
  locations: Location[];
  presetAssetId?: string;
  assignment?: AssetAssignmentRecord | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const editing = Boolean(assignment);
  const [form, setForm] = useState({
    assetId: assignment?.assetId ?? presetAssetId,
    assignedToType: assignment?.assignedToType ?? "USER",
    assignedToUserId: assignment?.assignedToUserId ?? "",
    assignedToDepartmentId: assignment?.assignedToDepartmentId ?? "",
    assignedToLocationId: assignment?.assignedToLocationId ?? "",
    assignedDate: toDateInput(assignment?.assignedDate) || new Date().toISOString().slice(0, 10),
    expectedReturnDate: toDateInput(assignment?.expectedReturnDate),
    conditionAtIssue: assignment?.conditionAtIssue ?? "Good",
    remarks: assignment?.remarks ?? "",
  });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  function submit() { startTransition(async () => {
    setMessage("");
    const response = await fetch(editing ? `/api/maintenance/asset-assignments/${assignment!.id}` : "/api/maintenance/asset-assignments", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Failed to assign asset");
    router.push("/maintenance/assets/assignments");
  }); }
  return <div style={shell}><PageHeader title={editing ? `Edit ${assignment?.assignmentNo}` : "Assign Asset"} subtitle="Assign responsibility without changing the asset's physical location." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Asset Assignments", href: "/assets/assignments" }, { label: editing ? "Edit" : "Create" }]} />
    {message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}
    <FormCard title="Assignment Details" variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: "Save Draft", variant: "primary", onClick: submit, loading: pending }, { label: "Cancel", onClick: () => router.back() }]} /> }}>
      <div style={grid}>
        <label style={field}><span style={label}>Asset</span><select style={input} value={form.assetId} disabled={editing} onChange={(e) => set("assetId", e.target.value)}><option value="">Select ...</option>{assets.filter((a) => a.isActive && !["IN_TRANSIT", "RETIRED", "DISPOSED"].includes(a.status)).map((a) => <option key={a.id} value={a.id}>{a.assetCode} - {a.assetName}</option>)}</select></label>
        <label style={field}><span style={label}>Assign To</span><select style={input} value={form.assignedToType} onChange={(e) => set("assignedToType", e.target.value)}><option value="USER">User</option><option value="DEPARTMENT">Department</option><option value="LOCATION">Operational Location</option></select></label>
        {form.assignedToType === "USER" ? <label style={field}><span style={label}>User</span><select style={input} value={form.assignedToUserId} onChange={(e) => set("assignedToUserId", e.target.value)}><option value="">Select ...</option>{users.filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label> : null}
        {form.assignedToType === "DEPARTMENT" ? <label style={field}><span style={label}>Department</span><select style={input} value={form.assignedToDepartmentId} onChange={(e) => set("assignedToDepartmentId", e.target.value)}><option value="">Select ...</option>{departments.filter((d) => d.isActive).map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}</select></label> : null}
        {form.assignedToType === "LOCATION" ? <label style={field}><span style={label}>Operational Location</span><select style={input} value={form.assignedToLocationId} onChange={(e) => set("assignedToLocationId", e.target.value)}><option value="">Select ...</option>{locations.filter((l) => l.isActive).map((l) => <option key={l.id} value={l.id}>{l.locationCode} - {l.locationName}</option>)}</select></label> : null}
        <label style={field}><span style={label}>Assigned Date</span><input type="date" style={input} value={form.assignedDate} onChange={(e) => set("assignedDate", e.target.value)} /></label>
        <label style={field}><span style={label}>Expected Return</span><input type="date" style={input} value={form.expectedReturnDate} onChange={(e) => set("expectedReturnDate", e.target.value)} /></label>
        <label style={field}><span style={label}>Condition at Issue</span><input style={input} value={form.conditionAtIssue} onChange={(e) => set("conditionAtIssue", e.target.value)} /></label>
      </div><label style={{ ...field, marginTop: 16 }}><span style={label}>Remarks</span><textarea style={{ ...input, minHeight: 100 }} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></label>
    </FormCard>
  </div>;
}

export function AssetTransfersPage({ transfers }: { transfers: AssetTransferRecord[] }) {
  const router = useRouter();
  const columns: Column<AssetTransferRecord>[] = [
    { key: "transferNo", label: "Transfer No" }, { key: "assetCode", label: "Asset", render: (_v, row) => `${row.assetCode} - ${row.assetName}` },
    { key: "fromLocationName", label: "From" }, { key: "toLocationName", label: "To" },
    { key: "transferDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString() }, { key: "status", label: "Status", render: badge },
  ];
  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (row: AssetTransferRecord) => router.push(publicViewUrl("maintenance.transfer", row.publicId)) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (row: AssetTransferRecord) => row.status === "DRAFT" && router.push(publicEditUrl("maintenance.transfer", row.publicId)) },
  ];
  return <div style={shell}><PageHeader title="Asset Transfers" subtitle="Controlled physical movement of assets between real locations." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Assets", href: "/maintenance/assets" }, { label: "Transfers" }]} actions={<ActionButtons actions={[{ label: "Create Transfer", icon: <ArrowLeftRight size={16} />, variant: "primary", onClick: () => router.push("/maintenance/assets/transfers/create") }]} />} /><DataTable columns={columns} data={transfers} actions={actions} pageSize={15} emptyState={<EmptyState title="No asset transfers" message="Create a controlled location transfer for an asset." />} /></div>;
}

export function AssetTransferFormPage({
  assets,
  locations,
  presetAssetId = "",
  transfer,
}: {
  assets: MaintenanceAsset[];
  locations: Location[];
  presetAssetId?: string;
  transfer?: AssetTransferRecord | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const editing = Boolean(transfer);
  const [form, setForm] = useState({
    assetId: transfer?.assetId ?? presetAssetId,
    toLocationId: transfer?.toLocationId ?? "",
    transferDate: toDateInput(transfer?.transferDate) || new Date().toISOString().slice(0, 10),
    reason: transfer?.reason ?? "",
    remarks: transfer?.remarks ?? "",
  });
  const selected = assets.find((asset) => asset.id === form.assetId);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  function submit() { startTransition(async () => {
    const response = await fetch(editing ? `/api/maintenance/asset-transfers/${transfer!.id}` : "/api/maintenance/asset-transfers", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Failed to create transfer");
    router.push(publicViewUrl("maintenance.transfer", result.item.publicId));
  }); }
  return <div style={shell}><PageHeader title={editing ? `Edit ${transfer?.transferNo}` : "Create Asset Transfer"} subtitle="Move a physical asset through a checked and approved transfer document." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Asset Transfers", href: "/maintenance/assets/transfers" }, { label: editing ? "Edit" : "Create" }]} />{message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}<FormCard title="Transfer Details" variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: "Save Draft", variant: "primary", onClick: submit, loading: pending }, { label: "Cancel", onClick: () => router.back() }]} /> }}><div style={grid}>
    <label style={field}><span style={label}>Asset</span><select style={input} value={form.assetId} disabled={editing} onChange={(e) => set("assetId", e.target.value)}><option value="">Select ...</option>{assets.filter((a) => a.isActive && !["UNDER_MAINTENANCE", "IN_TRANSIT", "RETIRED", "DISPOSED"].includes(a.status)).map((a) => <option key={a.id} value={a.id}>{a.assetCode} - {a.assetName}</option>)}</select></label>
    <label style={field}><span style={label}>From Location</span><input style={{ ...input, background: "#f1f5f9" }} readOnly value={selected ? `${selected.locationCode ?? ""} - ${selected.locationName ?? ""}` : transfer?.fromLocationName ?? "Select an asset"} /></label>
    <label style={field}><span style={label}>To Location</span><select style={input} value={form.toLocationId} onChange={(e) => set("toLocationId", e.target.value)}><option value="">Select ...</option>{locations.filter((l) => l.isActive && l.id !== selected?.locationId).map((l) => <option key={l.id} value={l.id}>{l.locationCode} - {l.locationName}</option>)}</select></label>
    <label style={field}><span style={label}>Transfer Date</span><input type="date" style={input} value={form.transferDate} onChange={(e) => set("transferDate", e.target.value)} /></label>
    <label style={field}><span style={label}>Reason</span><input style={input} value={form.reason} onChange={(e) => set("reason", e.target.value)} /></label>
  </div><label style={{ ...field, marginTop: 16 }}><span style={label}>Remarks</span><textarea style={{ ...input, minHeight: 100 }} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></label></FormCard></div>;
}

export function AssetTransferDetailPage({ transfer }: { transfer: AssetTransferRecord | null }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const isPending = pendingAction != null;
  const isActionLoading = (action: string) => pendingAction === action;
  if (!transfer) return <div style={shell}><EmptyState title="Asset transfer not found" message="The requested asset transfer does not exist." /></div>;
  const action = (name: string) => {
    setPendingAction(name);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/maintenance/asset-transfers/${transfer.id}/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        const result = await response.json();
        if (!response.ok) return setMessage(result.error ?? `Failed to ${name} transfer`);
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  };
  const actions = [] as Array<{ label: string; icon?: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "success" | "warning"; onClick: () => void; loading?: boolean; disabled?: boolean }>;
  if (transfer.status === "DRAFT") actions.push({ label: "Edit Draft", icon: <Pencil size={16} />, variant: "secondary", onClick: () => router.push(`/maintenance/assets/transfers/${transfer.id}/edit`) });
  if (transfer.status === "DRAFT") actions.push({ label: "Submit", icon: <Send size={16} />, variant: "primary", onClick: () => action("submit"), loading: isActionLoading("submit"), disabled: isPending });
  if (transfer.status === "SUBMITTED") actions.push({ label: "Check", icon: <ClipboardCheck size={16} />, variant: "primary", onClick: () => action("check"), loading: isActionLoading("check"), disabled: isPending });
  if (transfer.status === "CHECKED") actions.push({ label: "Approve", icon: <Check size={16} />, variant: "success", onClick: () => action("approve"), loading: isActionLoading("approve"), disabled: isPending });
  if (["SUBMITTED", "CHECKED"].includes(transfer.status)) actions.push({ label: "Reject", icon: <XCircle size={16} />, variant: "danger", onClick: () => action("reject"), loading: isActionLoading("reject"), disabled: isPending });
  if (transfer.status === "APPROVED") actions.push({ label: "Post Transfer", icon: <ArrowLeftRight size={16} />, variant: "success", onClick: () => action("post"), loading: isActionLoading("post"), disabled: isPending });
  if (!["POSTED", "REJECTED", "CANCELLED"].includes(transfer.status)) actions.push({ label: "Cancel", icon: <XCircle size={16} />, variant: "danger", onClick: () => action("cancel"), loading: isActionLoading("cancel"), disabled: isPending });
  return <div style={shell}><PageHeader recordKind="maintenance.asset" title={transfer.transferNo} subtitle={`${transfer.assetCode} - ${transfer.assetName}`} breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Asset Transfers", href: "/maintenance/assets/transfers" }, { label: transfer.transferNo }]} actions={<ActionButtons actions={actions} />} />{message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}<FormCard title="Transfer Information" variant="teal-header"><div style={grid}>{[["Asset", `${transfer.assetCode} - ${transfer.assetName}`], ["From", transfer.fromLocationName], ["To", transfer.toLocationName], ["Transfer Date", new Date(transfer.transferDate).toLocaleDateString()], ["Reason", transfer.reason], ["Status", transfer.status]].map(([name, value]) => <div key={name} style={field}><span style={label}>{name}</span><strong>{value}</strong></div>)}</div></FormCard></div>;
}

export function AssetAssignmentDetailPage({ assignment }: { assignment: AssetAssignmentRecord | null }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const isPending = pendingAction != null;
  const isActionLoading = (action: string) => pendingAction === action;
  if (!assignment) {
    return (
      <div style={shell}>
        <EmptyState
          title="Asset assignment not found"
          message="The requested asset assignment does not exist."
          action={{ label: "Back to Assignments", onClick: () => router.push("/maintenance/assets/assignments") }}
        />
      </div>
    );
  }
  const action = (name: string) => {
    setPendingAction(name);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/maintenance/asset-assignments/${assignment.id}/${name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const result = await response.json();
        if (!response.ok) return setMessage(result.error ?? `Failed to ${name} assignment`);
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  };
  const actions = [] as Array<{
    label: string;
    icon?: React.ReactNode;
    variant?: "primary" | "secondary" | "danger" | "success" | "warning";
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  }>;
  if (assignment.status === "DRAFT") {
    actions.push({
      label: "Edit Draft",
      icon: <Pencil size={16} />,
      variant: "secondary",
      onClick: () => router.push(`/maintenance/assets/assignments/${assignment.id}/edit`),
    });
  }
  if (assignment.status === "DRAFT") {
    actions.push({
      label: "Submit",
      icon: <Send size={16} />,
      variant: "primary",
      onClick: () => action("submit"),
      loading: isActionLoading("submit"),
      disabled: isPending,
    });
  }
  if (assignment.status === "SUBMITTED") {
    actions.push({
      label: "Check",
      icon: <ClipboardCheck size={16} />,
      variant: "primary",
      onClick: () => action("check"),
      loading: isActionLoading("check"),
      disabled: isPending,
    });
  }
  if (assignment.status === "CHECKED") {
    actions.push({
      label: "Approve",
      icon: <Check size={16} />,
      variant: "success",
      onClick: () => action("approve"),
      loading: isActionLoading("approve"),
      disabled: isPending,
    });
  }
  if (["SUBMITTED", "CHECKED"].includes(assignment.status)) {
    actions.push({
      label: "Reject",
      icon: <XCircle size={16} />,
      variant: "danger",
      onClick: () => action("reject"),
      loading: isActionLoading("reject"),
      disabled: isPending,
    });
  }
  if (assignment.status === "ACTIVE") {
    actions.push({
      label: "Return",
      icon: <RotateCcw size={16} />,
      variant: "secondary",
      onClick: () => router.push(`/maintenance/assets/assignments/${assignment.id}/return`),
    });
  }
  if (["DRAFT", "SUBMITTED", "CHECKED"].includes(assignment.status)) {
    actions.push({
      label: "Cancel",
      icon: <XCircle size={16} />,
      variant: "danger",
      onClick: () => action("cancel"),
      loading: isActionLoading("cancel"),
      disabled: isPending,
    });
  }
  return (
    <div style={shell}>
      <PageHeader
        recordKind="maintenance.asset"
        title={assignment.assignmentNo}
        subtitle={`${assignment.assetCode} - ${assignment.assetName}`}
        breadcrumbs={[
          { label: "Maintenance", href: "/maintenance" },
          { label: "Asset Assignments", href: "/maintenance/assets/assignments" },
          { label: assignment.assignmentNo },
        ]}
        actions={<ActionButtons actions={actions} />}
      />
      {message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}
      <FormCard title="Assignment Information" variant="teal-header">
        <div style={grid}>
          {[
            ["Asset", `${assignment.assetCode} - ${assignment.assetName}`],
            ["Target", assignment.assignedToType],
            ["Assigned To", assignment.assigneeName],
            ["Assigned Date", new Date(assignment.assignedDate).toLocaleDateString()],
            ["Expected Return", assignment.expectedReturnDate ? new Date(assignment.expectedReturnDate).toLocaleDateString() : "-"],
            ["Condition at Issue", assignment.conditionAtIssue],
            ["Status", assignment.status],
            ["Remarks", assignment.remarks || "-"],
          ].map(([name, value]) => (
            <div key={name} style={field}>
              <span style={label}>{name}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </FormCard>
    </div>
  );
}

export function AssetAssignmentReturnPage({ assignment }: { assignment: AssetAssignmentRecord | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    conditionAtReturn: assignment?.conditionAtIssue ?? "Good",
    remarks: "",
  });
  if (!assignment) return <div style={shell}><EmptyState title="Asset assignment not found" message="The requested assignment does not exist." action={{ label: "Back to Assignments", onClick: () => router.push("/maintenance/assets/assignments") }} /></div>;
  if (assignment.status !== "ACTIVE") return <div style={shell}><EmptyState title="Assignment cannot be returned" message={`Only active assignments can be returned. This assignment is ${assignment.status}.`} action={{ label: "Back to Assignments", onClick: () => router.push("/maintenance/assets/assignments") }} /></div>;
  function submit() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/maintenance/asset-assignments/${assignment!.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Failed to return asset");
      router.push("/maintenance/assets/assignments");
      router.refresh();
    });
  }
  return <div style={shell}>
    <PageHeader title={`Return ${assignment.assignmentNo}`} subtitle={`${assignment.assetCode} - ${assignment.assetName}`} breadcrumbs={[{ label: "Assets", href: "/maintenance/assets" }, { label: "Assignments", href: "/assets/assignments" }, { label: "Return" }]} />
    {message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}
    <FormCard title="Return Details" variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: "Confirm Return", variant: "primary", onClick: submit, loading: pending }, { label: "Cancel", onClick: () => router.back() }]} /> }}>
      <div style={grid}>
        <div style={field}><span style={label}>Asset</span><strong>{assignment.assetCode} - {assignment.assetName}</strong></div>
        <div style={field}><span style={label}>Assigned To</span><strong>{assignment.assigneeName}</strong></div>
        <div style={field}><span style={label}>Assigned Date</span><strong>{new Date(assignment.assignedDate).toLocaleDateString()}</strong></div>
        <div style={field}><span style={label}>Condition at Issue</span><strong>{assignment.conditionAtIssue ?? "-"}</strong></div>
        <label style={field}><span style={label}>Condition at Return</span><input style={input} value={form.conditionAtReturn} onChange={(e) => setForm((current) => ({ ...current, conditionAtReturn: e.target.value }))} /></label>
      </div>
      <label style={{ ...field, marginTop: 14 }}><span style={label}>Remarks</span><textarea style={{ ...input, minHeight: 90 }} value={form.remarks} onChange={(e) => setForm((current) => ({ ...current, remarks: e.target.value }))} /></label>
    </FormCard>
  </div>;
}

export function AssetLifecycleConfirmPage({ asset, action }: { asset: MaintenanceAsset | null; action: "retire" | "dispose" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [remarks, setRemarks] = useState("");
  const title = action === "retire" ? "Retire Asset" : "Dispose Asset";
  if (!asset) return <div style={shell}><EmptyState title="Asset not found" message="The requested asset does not exist." action={{ label: "Back to Assets", onClick: () => router.push("/maintenance/assets") }} /></div>;
  if (["RETIRED", "DISPOSED"].includes(asset.status)) return <div style={shell}><EmptyState title={`Asset already ${asset.status.toLowerCase()}`} message="Lifecycle closure has already been completed for this asset." action={{ label: "Back to Asset", onClick: () => router.push(publicViewUrl("maintenance.asset", asset.publicId)) }} /></div>;
  function submit() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/maintenance/assets/${asset!.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, remarks: remarks.trim() }),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? `Failed to ${action} asset`);
      router.push(publicViewUrl("maintenance.asset", asset!.publicId));
      router.refresh();
    });
  }
  return <div style={shell}>
    <PageHeader title={title} subtitle={`${asset.assetCode} - ${asset.assetName}`} breadcrumbs={[{ label: "Assets", href: "/maintenance/assets" }, { label: asset.assetCode, href: `/assets/${asset.id}` }, { label: action === "retire" ? "Retire" : "Dispose" }]} />
    {message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}
    <FormCard title={title} variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: `Confirm ${action === "retire" ? "Retire" : "Dispose"}`, variant: action === "dispose" ? "danger" : "warning", onClick: submit, loading: pending }, { label: "Cancel", onClick: () => router.back() }]} /> }}>
      <div style={grid}>
        <div style={field}><span style={label}>Asset</span><strong>{asset.assetCode} - {asset.assetName}</strong></div>
        <div style={field}><span style={label}>Current Status</span><strong>{asset.status}</strong></div>
        <div style={field}><span style={label}>Location</span><strong>{asset.locationName ?? "-"}</strong></div>
      </div>
      <label style={{ ...field, marginTop: 14 }}><span style={label}>Reason</span><textarea style={{ ...input, minHeight: 110 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={`Why this asset is being ${action === "retire" ? "retired" : "disposed"}`} /></label>
    </FormCard>
  </div>;
}

export function AssetMeterReadingsPage({
  asset,
  readings,
}: {
  asset: MaintenanceAsset | null;
  readings: AssetMeterReadingRecord[];
}) {
  const router = useRouter();
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [readingType, setReadingType] = useState(asset?.meterType ?? "HOURS");
  const [readingValue, setReadingValue] = useState("");
  const [unit, setUnit] = useState(asset?.meterUnit ?? "H");
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  if (!asset) {
    return <div style={shell}><EmptyState title="Asset not found" message="The requested asset does not exist." action={{ label: "Back to Assets", onClick: () => router.push("/maintenance/assets") }} /></div>;
  }
  const currentAsset = asset;

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/assets/${currentAsset.id}/meter-readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingDate, readingType, readingValue: Number(readingValue), unit, remarks }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to record meter reading");
        return;
      }
      setReadingValue("");
      setRemarks("");
      router.refresh();
    });
  }

  return (
    <div style={shell}>
      <PageHeader
        title={`${asset.assetCode} Meter Readings`}
        subtitle="Record and review meter history used for usage-based preventive maintenance."
        breadcrumbs={[{ label: "Assets", href: "/maintenance/assets" }, { label: asset.assetCode, href: `/assets/${asset.id}` }, { label: "Meter Readings" }]}
      />
      {message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Record Reading"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: "Save Reading", variant: "primary", onClick: submit, loading: pending }, { label: "Back", variant: "secondary", onClick: () => router.push(publicViewUrl("maintenance.asset", asset.publicId)) }]} /> }}
      >
        <div style={grid}>
          <label style={field}><span style={label}>Date</span><input type="date" style={input} value={readingDate} onChange={(event) => setReadingDate(event.target.value)} /></label>
          <label style={field}><span style={label}>Type</span><input style={input} value={readingType} onChange={(event) => setReadingType(event.target.value)} /></label>
          <label style={field}><span style={label}>Reading</span><input style={input} value={readingValue} onChange={(event) => setReadingValue(event.target.value)} /></label>
          <label style={field}><span style={label}>Unit</span><input style={input} value={unit} onChange={(event) => setUnit(event.target.value)} /></label>
        </div>
        <label style={{ ...field, marginTop: 14 }}><span style={label}>Remarks</span><textarea style={{ ...input, minHeight: 80 }} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
      </FormCard>
      <FormCard title="History" variant="teal-header">
        <DataTable
          columns={[
            { key: "readingDate", label: "Date", render: (value) => new Date(String(value)).toLocaleString() },
            { key: "readingType", label: "Type" },
            { key: "readingValue", label: "Reading" },
            { key: "unit", label: "Unit" },
            { key: "source", label: "Source", render: (value) => value ?? "—" },
            { key: "recordedByName", label: "Recorded By", render: (value) => value ?? "—" },
            { key: "remarks", label: "Remarks", render: (value) => value ?? "—" },
          ]}
          data={readings}
          pageSize={15}
          emptyState={<EmptyState title="No readings yet" message="Record the first meter reading for this asset." />}
        />
      </FormCard>
    </div>
  );
}
