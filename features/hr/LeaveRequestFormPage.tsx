"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Save, X } from "lucide-react";
import type { LeaveRequest, OptionItem } from "./types";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: colors.text.secondary,
};

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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "auto",
  minHeight: 100,
  resize: "vertical",
};

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function LeaveRequestFormPage({
  initialData,
  employees,
  leaveTypes,
  submitEndpoint,
  successHref,
  isEdit = false,
}: {
  initialData?: LeaveRequest | null;
  employees: OptionItem[];
  leaveTypes: OptionItem[];
  submitEndpoint: string;
  successHref: string;
  isEdit?: boolean;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId ?? "");
  const [leaveTypeId, setLeaveTypeId] = useState(initialData?.leaveTypeId ?? "");
  const [startDate, setStartDate] = useState(initialData?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initialData?.endDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachmentUrl ?? "");
  const [reason, setReason] = useState(initialData?.reason ?? "");
  const [remarks, setRemarks] = useState(initialData?.remarks ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      { label: "HR", href: "/hr" },
      { label: "Leave", href: "/hr/leave" },
      { label: isEdit ? "Edit Leave Request" : "Create Leave Request" },
    ],
    [isEdit],
  );

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const submit = async () => {
    setError("");
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      setError("Employee, leave type, start date, and end date are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(submitEndpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          leaveTypeId,
          startDate,
          endDate,
          attachmentUrl: normalizeOptional(attachmentUrl),
          reason: normalizeOptional(reason),
          remarks: normalizeOptional(remarks),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; publicId?: number }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to save leave request.");
        return;
      }

      router.push(publicViewUrlFromPayload("hr.leave", payload, successHref));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const footerActions: Action[] = [
    { label: "Cancel", variant: "secondary", icon: <X size={16} />, onClick: () => router.push("/hr/leave"), disabled: saving },
    { label: isEdit ? "Update Leave Request" : "Save Leave Request", variant: "primary", icon: <Save size={16} />, onClick: submit, loading: saving },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title={isEdit ? "Edit Leave Request" : "Create Leave Request"}
        subtitle="Create a live leave request using real employee and leave type records from the HR database."
        breadcrumbs={breadcrumbs}
      />

      {error ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>
          {error}
        </div>
      ) : null}

      <FormCard title="Leave Request" variant="teal-header">
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
              <label style={labelStyle}>Leave Type *</label>
              <select style={inputStyle} value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}>
                <option value="">Select ...</option>
                {leaveTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          </div>

          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Start Date *</label>
              <input type="date" style={inputStyle} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>End Date *</label>
              <input type="date" style={inputStyle} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Attachment URL</label>
            <input style={inputStyle} value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} placeholder="Optional link to supporting document" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Reason</label>
            <textarea style={textareaStyle} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the leave request" />
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
