"use client";

import React, { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { ActionButtons, DataTable, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb, Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { PayrollComponent } from "./types";

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

type PayrollComponentFormState = {
  id?: string;
  code: string;
  name: string;
  type: string;
  taxable: boolean;
  recurring: boolean;
  defaultAmount: string;
  ratePercent: string;
  isActive: boolean;
};

const componentTypes = ["ALLOWANCE", "DEDUCTION", "BONUS", "LOAN", "TAX", "PENSION", "OTHER"];

function createEmptyForm(): PayrollComponentFormState {
  return {
    code: "",
    name: "",
    type: "ALLOWANCE",
    taxable: true,
    recurring: true,
    defaultAmount: "0",
    ratePercent: "",
    isActive: true,
  };
}

export default function PayrollComponentsPage({ initialItems }: { initialItems: PayrollComponent[] }) {
  const router = useRouter();
  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Payroll Components" },
  ];

  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState<PayrollComponentFormState>(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const editing = Boolean(form.id);
  const columns: Column<PayrollComponent>[] = useMemo(() => [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "type", label: "Type", sortable: true },
    { key: "taxable", label: "Taxable", render: (value) => (value ? "Yes" : "No") },
    { key: "recurring", label: "Recurring", render: (value) => (value ? "Yes" : "No") },
    { key: "defaultAmount", label: "Default Amount", sortable: true },
    { key: "ratePercent", label: "Rate %", render: (value) => value ?? "—" },
    { key: "isActive", label: "Status", render: (value) => <StatusBadge status={value ? "approved" : "draft"} /> },
  ], []);

  const tableActions: TableAction[] = [
    {
      label: "Edit payroll component",
      icon: <Pencil size={16} />,
      onClick: (record) => {
        setForm({
          id: record.id,
          code: record.code,
          name: record.name,
          type: record.type,
          taxable: record.taxable,
          recurring: record.recurring,
          defaultAmount: String(record.defaultAmount),
          ratePercent: record.ratePercent == null ? "" : String(record.ratePercent),
          isActive: record.isActive,
        });
        setError("");
        setMessage("");
      },
    },
    {
      label: "Archive payroll component",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        const response = await fetch(`/api/hr/payroll-components/${record.id}`, { method: "DELETE" });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setError(payload?.error ?? "Failed to archive payroll component.");
          return;
        }
        setItems((current) => current.filter((item) => item.id !== record.id));
        if (form.id === record.id) setForm(createEmptyForm());
        setMessage("Payroll component archived.");
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
        type: form.type,
        taxable: form.taxable,
        recurring: form.recurring,
        defaultAmount: Number(form.defaultAmount),
        ratePercent: form.ratePercent.trim() ? Number(form.ratePercent) : null,
        isActive: form.isActive,
      };

      const response = await fetch(form.id ? `/api/hr/payroll-components/${form.id}` : "/api/hr/payroll-components", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "Failed to save payroll component.");
        return;
      }
      router.refresh();
      const refreshed = await fetch("/api/hr/payroll-components").then((res) => res.json()) as { items: PayrollComponent[] };
      setItems(refreshed.items);
      setForm(createEmptyForm());
      setMessage(form.id ? "Payroll component updated." : "Payroll component created.");
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
      label: editing ? "Update Component" : "Add Component",
      variant: "primary",
      icon: editing ? <Save size={16} /> : <Plus size={16} />,
      onClick: save,
      loading: saving,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Payroll Components" subtitle="Maintain central allowances, bonuses, deductions, tax extras, and pension components used by payroll." breadcrumbs={breadcrumbs} />
      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.danger[50], border: `1px solid ${colors.danger[200]}`, color: colors.danger[700] }}>{error}</div> : null}
      {message ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.success[50], border: `1px solid ${colors.success[200]}`, color: colors.success[700] }}>{message}</div> : null}

      <FormCard title={editing ? "Edit Payroll Component" : "New Payroll Component"} variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label style={fieldStyle}><span style={labelStyle}>Code</span><input style={inputStyle} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Name</span><input style={inputStyle} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Type</span><select style={inputStyle} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>{componentTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Default Amount</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.defaultAmount} onChange={(event) => setForm((current) => ({ ...current, defaultAmount: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Rate %</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.ratePercent} onChange={(event) => setForm((current) => ({ ...current, ratePercent: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Taxable</span><select style={inputStyle} value={form.taxable ? "yes" : "no"} onChange={(event) => setForm((current) => ({ ...current, taxable: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Recurring</span><select style={inputStyle} value={form.recurring ? "yes" : "no"} onChange={(event) => setForm((current) => ({ ...current, recurring: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
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
        emptyState={<EmptyState title="No payroll components" message="Create the first allowance or deduction rule to make payroll fully policy-driven." />}
      />
    </div>
  );
}
