"use client";

import React, { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { ActionButtons, DataTable, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb, Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { LeaveType } from "./types";

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.text.secondary };
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 15,
  backgroundColor: colors.surface,
  boxSizing: "border-box",
};

type LeaveTypeFormState = {
  id?: string;
  code: string;
  name: string;
  paid: boolean;
  entitlementDays: string;
  requiresAttachment: boolean;
  approvalLevel: string;
  isActive: boolean;
};

function createEmptyForm(): LeaveTypeFormState {
  return {
    code: "",
    name: "",
    paid: true,
    entitlementDays: "0",
    requiresAttachment: false,
    approvalLevel: "1",
    isActive: true,
  };
}

export default function LeaveTypesPage({ initialItems }: { initialItems: LeaveType[] }) {
  const router = useRouter();
  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Leave Types" },
  ];

  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState<LeaveTypeFormState>(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const editing = Boolean(form.id);
  const columns: Column<LeaveType>[] = useMemo(() => [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "paid", label: "Paid", render: (value) => (value ? "Yes" : "No") },
    { key: "entitlementDays", label: "Entitlement Days", sortable: true },
    { key: "approvalLevel", label: "Approval Level", sortable: true },
    { key: "requiresAttachment", label: "Attachment", render: (value) => (value ? "Required" : "Optional") },
    { key: "isActive", label: "Status", render: (value) => <StatusBadge status={value ? "approved" : "draft"} /> },
  ], []);

  const tableActions: TableAction[] = [
    {
      label: "Edit leave type",
      icon: <Pencil size={16} />,
      onClick: (record) => {
        setForm({
          id: record.id,
          code: record.code,
          name: record.name,
          paid: record.paid,
          entitlementDays: String(record.entitlementDays),
          requiresAttachment: record.requiresAttachment,
          approvalLevel: String(record.approvalLevel),
          isActive: record.isActive,
        });
        setError("");
        setMessage("");
      },
    },
    {
      label: "Archive leave type",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        setError("");
        setMessage("");
        const response = await fetch(`/api/hr/leave-types/${record.id}`, { method: "DELETE" });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setError(payload?.error ?? "Failed to archive leave type.");
          return;
        }
        setItems((current) => current.filter((item) => item.id !== record.id));
        if (form.id === record.id) {
          setForm(createEmptyForm());
        }
        setMessage("Leave type archived.");
        router.refresh();
      },
    },
  ];

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        paid: form.paid,
        entitlementDays: Number(form.entitlementDays),
        requiresAttachment: form.requiresAttachment,
        approvalLevel: Number(form.approvalLevel),
        isActive: form.isActive,
      };

      const response = await fetch(form.id ? `/api/hr/leave-types/${form.id}` : "/api/hr/leave-types", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "Failed to save leave type.");
        return;
      }

      router.refresh();
      const refreshed = await fetch("/api/hr/leave-types").then((res) => res.json()) as { items: LeaveType[] };
      setItems(refreshed.items);
      setForm(createEmptyForm());
      setMessage(form.id ? "Leave type updated." : "Leave type created.");
    } finally {
      setSaving(false);
    }
  };

  const actions: Action[] = [
    {
      label: editing ? "Clear" : "Reset",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => setForm(createEmptyForm()),
      disabled: saving,
    },
    {
      label: editing ? "Update Leave Type" : "Add Leave Type",
      variant: "primary",
      icon: editing ? <Save size={16} /> : <Plus size={16} />,
      onClick: save,
      loading: saving,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Leave Types" subtitle="Configure paid and unpaid leave policies, entitlement days, and attachment rules from live HR setup." breadcrumbs={breadcrumbs} />
      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.danger[50], border: `1px solid ${colors.danger[200]}`, color: colors.danger[700] }}>{error}</div> : null}
      {message ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.success[50], border: `1px solid ${colors.success[200]}`, color: colors.success[700] }}>{message}</div> : null}

      <FormCard title={editing ? "Edit Leave Type" : "New Leave Type"} variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label style={fieldStyle}><span style={labelStyle}>Code</span><input style={inputStyle} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Name</span><input style={inputStyle} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Entitlement Days</span><input type="number" min="0" step="0.5" style={inputStyle} value={form.entitlementDays} onChange={(event) => setForm((current) => ({ ...current, entitlementDays: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Approval Level</span><input type="number" min="1" step="1" style={inputStyle} value={form.approvalLevel} onChange={(event) => setForm((current) => ({ ...current, approvalLevel: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Paid Leave</span><select style={inputStyle} value={form.paid ? "yes" : "no"} onChange={(event) => setForm((current) => ({ ...current, paid: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Attachment Rule</span><select style={inputStyle} value={form.requiresAttachment ? "required" : "optional"} onChange={(event) => setForm((current) => ({ ...current, requiresAttachment: event.target.value === "required" }))}><option value="optional">Optional</option><option value="required">Required</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Status</span><select style={inputStyle} value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <ActionButtons actions={actions} />
        </div>
      </FormCard>

      <DataTable
        columns={columns}
        data={items}
        actions={tableActions}
        recordCount={items.length}
        emptyState={<EmptyState title="No leave types" message="Create the first leave policy to drive approvals and payroll treatment." />}
      />
    </div>
  );
}
