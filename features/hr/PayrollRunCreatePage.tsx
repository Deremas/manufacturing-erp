"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { publicViewUrl } from "@/lib/routing/urls";
import type { OptionItem } from "./types";

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

export default function PayrollRunCreatePage({
  nextPayrollNo,
  locations,
}: {
  nextPayrollNo: string;
  locations: OptionItem[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [paymentDate, setPaymentDate] = useState(today);
  const [locationId, setLocationId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const breadcrumbs: Breadcrumb[] = useMemo(() => [
    { label: "HR", href: "/hr" },
    { label: "Payroll", href: "/hr/payroll" },
    { label: "Generate Payroll" },
  ], []);

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          paymentDate,
          locationId: locationId || null,
          remarks: remarks.trim() || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; id?: string; publicId?: number } | null;
      if (!response.ok || (!payload?.publicId && !payload?.id)) {
        setError(payload?.error ?? "Failed to generate payroll run.");
        return;
      }

      router.push(payload.publicId ? publicViewUrl("hr.payroll", payload.publicId) : `/hr/payroll/${payload.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const actions: Action[] = [
    { label: "Cancel", variant: "secondary", icon: <X size={16} />, onClick: () => router.push("/hr/payroll"), disabled: saving },
    { label: "Generate Payroll", variant: "primary", icon: <Save size={16} />, onClick: submit, loading: saving },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Generate Payroll"
        subtitle="Create a payroll run from active employees and approved overtime in the selected period."
        breadcrumbs={breadcrumbs}
      />

      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>{error}</div> : null}

      <FormCard title="Payroll Run" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Payroll No</label><input style={{ ...inputStyle, backgroundColor: colors.secondary[50] }} value={nextPayrollNo} readOnly /></div>
            <div style={fieldStyle}><label style={labelStyle}>Location Scope</label><select style={inputStyle} value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">All accessible locations</option>{locations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          </div>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Period Start</label><input type="date" style={inputStyle} value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Period End</label><input type="date" style={inputStyle} value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Payment Date</label><input type="date" style={inputStyle} value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={textareaStyle} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional payroll notes" />
          </div>
        </div>
      </FormCard>

      <div style={{ position: "sticky", bottom: 0, zIndex: 10, backgroundColor: "#f8fafc", borderTop: `1px solid ${colors.border}`, padding: "16px 24px", display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={actions} />
      </div>
    </div>
  );
}
