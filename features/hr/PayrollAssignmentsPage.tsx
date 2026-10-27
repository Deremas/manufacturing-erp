"use client";

import React, { useMemo, useState } from "react";
import { Pencil, Save, Trash2, UserCog, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { ActionButtons, DataTable, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb, Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { EmployeePayrollAssignment, OptionItem } from "./types";
import type { EmployeePayrollAssignmentSummary } from "@/services/hr/payroll-assignment.service";

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

type FormState = {
  id?: string;
  employeeId: string;
  payrollComponentId: string;
  amount: string;
  ratePercent: string;
  effectiveFrom: string;
  effectiveTo: string;
  remarks: string;
  isActive: boolean;
};

function createEmptyForm(): FormState {
  return {
    employeeId: "",
    payrollComponentId: "",
    amount: "",
    ratePercent: "",
    effectiveFrom: "",
    effectiveTo: "",
    remarks: "",
    isActive: true,
  };
}

function createBaseForm(employeeId?: string): FormState {
  return {
    ...createEmptyForm(),
    employeeId: employeeId ?? "",
  };
}

export default function PayrollAssignmentsPage({
  initialItems,
  employees,
  payrollComponents,
  selectedEmployeeId,
  summary,
}: {
  initialItems: EmployeePayrollAssignment[];
  employees: OptionItem[];
  payrollComponents: OptionItem[];
  selectedEmployeeId?: string;
  summary?: EmployeePayrollAssignmentSummary | null;
}) {
  const router = useRouter();
  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Payroll Assignments" },
  ];

  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState<FormState>(() => createBaseForm(selectedEmployeeId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const columns: Column<EmployeePayrollAssignment>[] = useMemo(() => [
    { key: "employeeNo", label: "Employee No", sortable: true },
    { key: "employeeName", label: "Employee", sortable: true },
    { key: "employeeLocationName", label: "Location", sortable: true, render: (value) => value || "—" },
    { key: "payrollComponentCode", label: "Component Code", sortable: true },
    { key: "payrollComponentName", label: "Component", sortable: true },
    { key: "payrollComponentType", label: "Type", sortable: true },
    { key: "amount", label: "Amount", render: (value) => value == null ? "—" : Number(value).toFixed(2) },
    { key: "ratePercent", label: "Rate %", render: (value) => value == null ? "—" : Number(value).toFixed(2) },
    { key: "effectiveFrom", label: "Effective From", render: (value) => value || "Open" },
    { key: "effectiveTo", label: "Effective To", render: (value) => value || "Open" },
    { key: "isActive", label: "Status", render: (value) => <StatusBadge status={value ? "approved" : "draft"} /> },
  ], []);

  const tableActions: TableAction[] = [
    {
      label: "Edit assignment",
      icon: <Pencil size={16} />,
      onClick: (record) => {
        setForm({
          id: record.id,
          employeeId: record.employeeId,
          payrollComponentId: record.payrollComponentId,
          amount: record.amount == null ? "" : String(record.amount),
          ratePercent: record.ratePercent == null ? "" : String(record.ratePercent),
          effectiveFrom: record.effectiveFrom?.slice(0, 10) ?? "",
          effectiveTo: record.effectiveTo?.slice(0, 10) ?? "",
          remarks: record.remarks ?? "",
          isActive: record.isActive,
        });
        setError("");
        setMessage("");
      },
    },
    {
      label: "Archive assignment",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        const response = await fetch(`/api/hr/payroll-assignments/${record.id}`, { method: "DELETE" });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setError(payload?.error ?? "Failed to archive payroll assignment.");
          return;
        }
        setItems((current) => current.filter((item) => item.id !== record.id));
        if (form.id === record.id) setForm(createBaseForm(selectedEmployeeId));
        setMessage("Payroll assignment archived.");
        router.refresh();
      },
    },
  ];

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(form.id ? `/api/hr/payroll-assignments/${form.id}` : "/api/hr/payroll-assignments", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          payrollComponentId: form.payrollComponentId,
          amount: form.amount.trim() ? Number(form.amount) : null,
          ratePercent: form.ratePercent.trim() ? Number(form.ratePercent) : null,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          remarks: form.remarks,
          isActive: form.isActive,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to save payroll assignment.");
        return;
      }
      const refreshed = await fetch(selectedEmployeeId ? `/api/hr/payroll-assignments?employeeId=${encodeURIComponent(selectedEmployeeId)}` : "/api/hr/payroll-assignments").then((res) => res.json()) as { items: EmployeePayrollAssignment[] };
      setItems(refreshed.items);
      setForm(createBaseForm(selectedEmployeeId));
      setMessage(form.id ? "Payroll assignment updated." : "Payroll assignment created.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const actions: Action[] = [
    {
      label: form.id ? "Clear" : "Reset",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => setForm(createBaseForm(selectedEmployeeId)),
      disabled: saving,
    },
    {
      label: form.id ? "Update Assignment" : "Save Assignment",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: save,
      loading: saving,
    },
  ];

  const selectedEmployeeLabel =
    employees.find((employee) => employee.value === (selectedEmployeeId ?? form.employeeId))?.label ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Payroll Assignments"
        subtitle={
          selectedEmployeeLabel
            ? `Managing employee-specific payroll components for ${selectedEmployeeLabel}.`
            : "Assign taxable or non-taxable allowances and deductions per employee so payroll can vary by person instead of applying one blanket rule."
        }
        breadcrumbs={breadcrumbs}
      />

      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.danger[50], border: `1px solid ${colors.danger[200]}`, color: colors.danger[700] }}>{error}</div> : null}
      {message ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.success[50], border: `1px solid ${colors.success[200]}`, color: colors.success[700] }}>{message}</div> : null}

      {summary ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div style={{ borderRadius: 14, border: `1px solid ${colors.primary[200]}`, backgroundColor: colors.primary[50], padding: 16 }}>
            <div style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 6 }}>Employee</div>
            <div style={{ fontWeight: 700, color: colors.text.primary }}>{summary.employeeNo} - {summary.employeeName}</div>
          </div>
          <div style={{ borderRadius: 14, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, padding: 16 }}>
            <div style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 6 }}>Assignments</div>
            <div style={{ fontWeight: 700, color: colors.text.primary }}>{summary.activeAssignments} active / {summary.totalAssignments} total</div>
          </div>
          <div style={{ borderRadius: 14, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, padding: 16 }}>
            <div style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 6 }}>Active Allowances</div>
            <div style={{ fontWeight: 700, color: colors.text.primary }}>{Number(summary.activeAllowanceAmount ?? 0).toFixed(2)}</div>
          </div>
          <div style={{ borderRadius: 14, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, padding: 16 }}>
            <div style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 6 }}>Active Deductions</div>
            <div style={{ fontWeight: 700, color: colors.text.primary }}>{Number(summary.activeDeductionAmount ?? 0).toFixed(2)}</div>
          </div>
        </div>
      ) : null}

      <FormCard title={form.id ? "Edit Payroll Assignment" : "New Payroll Assignment"} variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Employee</span>
            <select
              style={inputStyle}
              value={form.employeeId}
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
              disabled={Boolean(selectedEmployeeId)}
            >
              <option value="">Select ...</option>
              {employees.map((employee) => <option key={employee.value} value={employee.value}>{employee.label}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Payroll Component</span>
            <select style={inputStyle} value={form.payrollComponentId} onChange={(event) => setForm((current) => ({ ...current, payrollComponentId: event.target.value }))}>
              <option value="">Select ...</option>
              {payrollComponents.map((component) => <option key={component.value} value={component.value}>{component.label}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Amount</span>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Rate %</span>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.ratePercent} onChange={(event) => setForm((current) => ({ ...current, ratePercent: event.target.value }))} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Effective From</span>
            <input type="date" style={inputStyle} value={form.effectiveFrom} onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Effective To</span>
            <input type="date" style={inputStyle} value={form.effectiveTo} onChange={(event) => setForm((current) => ({ ...current, effectiveTo: event.target.value }))} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Status</span>
            <select style={inputStyle} value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Remarks</span>
            <textarea style={{ ...inputStyle, height: 96, resize: "vertical" }} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
          </label>
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <ActionButtons actions={actions} />
        </div>
        <div style={{ marginTop: 12, color: colors.text.secondary, fontSize: 13 }}>
          Active assignments for the same employee and payroll component cannot overlap in date range. Leave effective dates open only when the component should remain active indefinitely.
        </div>
      </FormCard>

      <DataTable
        columns={columns}
        data={items}
        actions={tableActions}
        recordCount={items.length}
        emptyState={<EmptyState icon={<UserCog size={30} />} title="No payroll assignments" message="Assign employee-specific allowances and deductions here so payroll can vary by employee." />}
      />
    </div>
  );
}
