"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { OvertimeRequest, OptionItem } from "./types";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

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
const textareaStyle: React.CSSProperties = { ...inputStyle, height: "auto", minHeight: 100, resize: "vertical" };

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function OvertimeRequestFormPage({
  initialData,
  employees,
  reasons,
  shifts,
  submitEndpoint,
  successHref,
  isEdit = false,
}: {
  initialData?: OvertimeRequest | null;
  employees: OptionItem[];
  reasons: OptionItem[];
  shifts: OptionItem[];
  submitEndpoint: string;
  successHref: string;
  isEdit?: boolean;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId ?? "");
  const [overtimeDate, setOvertimeDate] = useState(initialData?.overtimeDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [shiftCode, setShiftCode] = useState(initialData?.shiftCode ?? "");
  const [hours, setHours] = useState(String(initialData?.hours ?? ""));
  const [reason, setReason] = useState(initialData?.reason ?? "");
  const [rateMultiplier, setRateMultiplier] = useState(String(initialData?.rateMultiplier ?? 1.5));
  const [remarks, setRemarks] = useState(initialData?.remarks ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const breadcrumbs: Breadcrumb[] = useMemo(() => [
    { label: "HR", href: "/hr" },
    { label: "Overtime", href: "/hr/overtime" },
    { label: isEdit ? "Edit Overtime" : "Create Overtime" },
  ], [isEdit]);

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const submit = async () => {
    setError("");
    if (!employeeId || !overtimeDate || !hours) {
      setError("Employee, overtime date, and overtime hours are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(submitEndpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          overtimeDate,
          shiftCode: normalizeOptional(shiftCode),
          hours: Number(hours),
          reason: normalizeOptional(reason),
          rateMultiplier: Number(rateMultiplier || 0),
          remarks: normalizeOptional(remarks),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; publicId?: number }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to save overtime request.");
        return;
      }

      router.push(publicViewUrlFromPayload("hr.overtime", payload, successHref));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => router.push("/hr/overtime"),
      disabled: saving,
    },
    {
      label: isEdit ? "Update Overtime" : "Save Overtime",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: submit,
      loading: saving,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title={isEdit ? "Edit Overtime Request" : "Create Overtime Request"}
        subtitle="Create payroll-ready overtime records using live employee, shift, and settings-backed reason references."
        breadcrumbs={breadcrumbs}
      />

      {error ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>
          {error}
        </div>
      ) : null}

      <FormCard title="Overtime Request" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Employee *</label>
              <select style={inputStyle} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="">Select ...</option>
                {employees.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Overtime Date *</label>
              <input type="date" style={inputStyle} value={overtimeDate} onChange={(event) => setOvertimeDate(event.target.value)} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Shift</label>
              <select style={inputStyle} value={shiftCode} onChange={(event) => setShiftCode(event.target.value)}>
                <option value="">Select ...</option>
                {shifts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Hours *</label>
              <input type="number" min="0.5" step="0.5" style={inputStyle} value={hours} onChange={(event) => setHours(event.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Rate Multiplier</label>
              <input type="number" min="1" step="0.1" style={inputStyle} value={rateMultiplier} onChange={(event) => setRateMultiplier(event.target.value)} />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Reason</label>
            <select style={inputStyle} value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">Select ...</option>
              {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={textareaStyle} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Internal remarks" />
          </div>
        </div>
      </FormCard>

      <div style={{ position: "sticky", bottom: 0, zIndex: 10, backgroundColor: "#f8fafc", borderTop: `1px solid ${colors.border}`, padding: "16px 24px", display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}
