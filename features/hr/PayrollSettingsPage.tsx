"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Save, X } from "lucide-react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { PayrollSettings } from "./types";

type AccountOption = {
  id: string;
  accountCode: string;
  accountName: string;
};

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.text.secondary };
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 15,
  backgroundColor: colors.surface,
  boxSizing: "border-box",
};

export default function PayrollSettingsPage({
  settings,
  accounts,
}: {
  settings: PayrollSettings;
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Payroll Settings" },
  ];

  const [form, setForm] = useState({
    taxPercent: String(settings.taxPercent ?? 0),
    employeePensionPercent: String(settings.employeePensionPercent ?? 0),
    employerPensionPercent: String(settings.employerPensionPercent ?? 0),
    overtimeMultiplier: String(settings.overtimeMultiplier ?? 1.5),
    normalDayOvertimeMultiplier: String(settings.normalDayOvertimeMultiplier ?? settings.overtimeMultiplier ?? 1.5),
    weekendOvertimeMultiplier: String(settings.weekendOvertimeMultiplier ?? 2),
    holidayOvertimeMultiplier: String(settings.holidayOvertimeMultiplier ?? 2.5),
    standardWorkDaysPerMonth: String(settings.standardWorkDaysPerMonth ?? 26),
    attendanceRequiredForSalary: settings.attendanceRequiredForSalary ?? true,
    weekendDays: (settings.weekendDays ?? [0]).join(", "),
    holidayDates: (settings.holidayDates ?? []).join("\n"),
    salaryExpenseAccountId: settings.salaryExpenseAccountId ?? "",
    employerPensionExpenseAccountId: settings.employerPensionExpenseAccountId ?? "",
    salaryPayableAccountId: settings.salaryPayableAccountId ?? "",
    taxPayableAccountId: settings.taxPayableAccountId ?? "",
    pensionPayableAccountId: settings.pensionPayableAccountId ?? "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const save = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/hr/payroll-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxPercent: Number(form.taxPercent),
          employeePensionPercent: Number(form.employeePensionPercent),
          employerPensionPercent: Number(form.employerPensionPercent),
          overtimeMultiplier: Number(form.overtimeMultiplier),
          normalDayOvertimeMultiplier: Number(form.normalDayOvertimeMultiplier),
          weekendOvertimeMultiplier: Number(form.weekendOvertimeMultiplier),
          holidayOvertimeMultiplier: Number(form.holidayOvertimeMultiplier),
          standardWorkDaysPerMonth: Number(form.standardWorkDaysPerMonth),
          attendanceRequiredForSalary: Boolean(form.attendanceRequiredForSalary),
          weekendDays: form.weekendDays.split(",").map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
          holidayDates: form.holidayDates.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
          salaryExpenseAccountId: form.salaryExpenseAccountId || null,
          employerPensionExpenseAccountId: form.employerPensionExpenseAccountId || null,
          salaryPayableAccountId: form.salaryPayableAccountId || null,
          taxPayableAccountId: form.taxPayableAccountId || null,
          pensionPayableAccountId: form.pensionPayableAccountId || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to update payroll settings.");
        return;
      }

      setMessage("Payroll settings saved successfully.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const actions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => router.push("/hr"),
      disabled: saving,
    },
    {
      label: "Save Settings",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: save,
      loading: saving,
    },
  ];

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.accountCode} - ${account.accountName}`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Payroll Settings"
        subtitle="Configure tax, pension, overtime, and account mapping values from the live HR settings store."
        breadcrumbs={breadcrumbs}
      />

      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>{error}</div> : null}
      {message ? <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.success[200]}`, backgroundColor: colors.success[50], color: colors.success[700] }}>{message}</div> : null}

      <FormCard title="Rates & Rules" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            <label style={fieldStyle}><span style={labelStyle}>Income Tax %</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.taxPercent} onChange={(event) => setForm((current) => ({ ...current, taxPercent: event.target.value }))} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Employee Pension %</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.employeePensionPercent} onChange={(event) => setForm((current) => ({ ...current, employeePensionPercent: event.target.value }))} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Employer Pension %</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.employerPensionPercent} onChange={(event) => setForm((current) => ({ ...current, employerPensionPercent: event.target.value }))} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Default Overtime Multiplier</span><input type="number" min="1" step="0.1" style={inputStyle} value={form.overtimeMultiplier} onChange={(event) => setForm((current) => ({ ...current, overtimeMultiplier: event.target.value }))} /></label>
          </div>
          <div style={rowStyle}>
            <label style={fieldStyle}><span style={labelStyle}>Normal Day OT Multiplier</span><input type="number" min="1" step="0.1" style={inputStyle} value={form.normalDayOvertimeMultiplier} onChange={(event) => setForm((current) => ({ ...current, normalDayOvertimeMultiplier: event.target.value }))} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Weekend OT Multiplier</span><input type="number" min="1" step="0.1" style={inputStyle} value={form.weekendOvertimeMultiplier} onChange={(event) => setForm((current) => ({ ...current, weekendOvertimeMultiplier: event.target.value }))} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Holiday OT Multiplier</span><input type="number" min="1" step="0.1" style={inputStyle} value={form.holidayOvertimeMultiplier} onChange={(event) => setForm((current) => ({ ...current, holidayOvertimeMultiplier: event.target.value }))} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Standard Work Days / Month</span><input type="number" min="1" step="1" style={inputStyle} value={form.standardWorkDaysPerMonth} onChange={(event) => setForm((current) => ({ ...current, standardWorkDaysPerMonth: event.target.value }))} /></label>
          </div>
          <div style={rowStyle}>
            <label style={fieldStyle}><span style={labelStyle}>Attendance Required For Salary</span><select style={inputStyle} value={form.attendanceRequiredForSalary ? "yes" : "no"} onChange={(event) => setForm((current) => ({ ...current, attendanceRequiredForSalary: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
            <div style={{ ...fieldStyle, justifyContent: "flex-end" }}>
              <span style={labelStyle}>Work Calendar</span>
              <button
                type="button"
                onClick={() => router.push("/hr/work-calendar")}
                style={{
                  ...inputStyle,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  color: colors.primary[700],
                  backgroundColor: colors.primary[50],
                  border: `1px solid ${colors.primary[200]}`,
                }}
              >
                <CalendarDays size={16} />
                Manage weekends and holidays
              </button>
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Accounting Mapping" variant="default">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            {[
              ["salaryExpenseAccountId", "Salary Expense Account"],
              ["employerPensionExpenseAccountId", "Employer Pension Expense Account"],
              ["salaryPayableAccountId", "Salary Payable Account"],
              ["taxPayableAccountId", "Tax Payable Account"],
              ["pensionPayableAccountId", "Pension Payable Account"],
            ].map(([key, label]) => (
              <label key={key} style={fieldStyle}>
                <span style={labelStyle}>{label}</span>
                <select
                  style={inputStyle}
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                >
                  <option value="">Select ...</option>
                  {accountOptions.map((account) => <option key={account.value} value={account.value}>{account.label}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      </FormCard>

      <div style={{ position: "sticky", bottom: 0, zIndex: 10, backgroundColor: "#f8fafc", borderTop: `1px solid ${colors.border}`, padding: "16px 24px", display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={actions} />
      </div>
    </div>
  );
}
