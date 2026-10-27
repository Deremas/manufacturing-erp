"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { ArrowLeft, CheckCircle2, Pencil, Send, XCircle } from "lucide-react";
import { publicEditUrl } from "@/lib/routing/urls";
import type { LeaveRequest } from "./types";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

export default function LeaveRequestDetailPage({ request }: { request?: LeaveRequest | null }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!request) {
    return <EmptyState title="Leave request not found" message="This leave request only appears when it exists in the live HR database." action={{ label: "Back", onClick: () => router.push("/hr/leave") }} />;
  }

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Leave", href: "/hr/leave" },
    { label: request.leaveNo },
  ];

  const runAction = async (action: "submit" | "approve" | "reject" | "cancel") => {
    setError("");
    setBusyAction(action);
    try {
      const rejectionReason =
        action === "reject" || action === "cancel"
          ? window.prompt("Provide a reason for this action (optional):") ?? ""
          : "";

      const response = await fetch(`/api/hr/leave/${request.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to update leave request.");
        return;
      }

      router.refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const statusVariant =
    request.status === "APPROVED"
      ? "approved"
      : request.status === "SUBMITTED"
        ? "pending"
        : request.status === "REJECTED" || request.status === "CANCELLED"
          ? "rejected"
          : "draft";

  const actions: Action[] = [
    { label: "Back", variant: "secondary", icon: <ArrowLeft size={16} />, onClick: () => router.push("/hr/leave") },
    ...(request.status === "DRAFT" || request.status === "SUBMITTED"
      ? [{ label: "Edit", variant: "secondary" as const, icon: <Pencil size={16} />, onClick: () => router.push(publicEditUrl("hr.leave", request.publicId)) }]
      : []),
    ...(request.status === "DRAFT"
      ? [{ label: "Submit", variant: "primary" as const, icon: <Send size={16} />, onClick: () => runAction("submit"), loading: busyAction === "submit" }]
      : []),
    ...(request.status === "SUBMITTED"
      ? [
          { label: "Approve", variant: "primary" as const, icon: <CheckCircle2 size={16} />, onClick: () => runAction("approve"), loading: busyAction === "approve" },
          { label: "Reject", variant: "danger" as const, icon: <XCircle size={16} />, onClick: () => runAction("reject"), loading: busyAction === "reject" },
        ]
      : []),
    ...(["DRAFT", "SUBMITTED"].includes(request.status)
      ? [{ label: "Cancel", variant: "danger" as const, icon: <XCircle size={16} />, onClick: () => runAction("cancel"), loading: busyAction === "cancel" }]
      : []),
  ];

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.text.secondary, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 16, color: colors.text.primary }}>{value || "—"}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        recordKind="hr.leave"
        title={request.leaveNo}
        subtitle={`${request.employeeName} • ${request.leaveTypeName}`}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {error ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>
          {error}
        </div>
      ) : null}

      <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${colors.primary[200]}`, backgroundColor: colors.primary[50], display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ color: colors.primary[700], fontWeight: 700 }}>{request.leaveNo}</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: colors.text.primary }}>{request.employeeName}</div>
          <div style={{ color: colors.text.secondary }}>
            {request.leaveTypeName} • {request.days} day(s) • {formatDate(request.startDate)} to {formatDate(request.endDate)}
          </div>
        </div>
        <StatusBadge status={statusVariant} />
      </div>

      <FormCard title="Request Details" variant="teal-header">
        <div style={gridStyle}>
          {renderField("Employee No", request.employeeNo)}
          {renderField("Leave Type", request.leaveTypeName)}
          {renderField("Department", request.departmentName)}
          {renderField("Location", request.locationName)}
          {renderField("Start Date", formatDate(request.startDate))}
          {renderField("End Date", formatDate(request.endDate))}
          {renderField("Days", request.days)}
          {renderField("Requested By", request.requestedByName)}
        </div>
      </FormCard>

      <FormCard title="Approval" variant="teal-header">
        <div style={gridStyle}>
          {renderField("Manager Approval", request.managerApprovalStatus)}
          {renderField("Manager Approved By", request.managerApprovedByName)}
          {renderField("Manager Approved At", formatDate(request.managerApprovedAt))}
          {renderField("HR Approval", request.hrApprovalStatus)}
          {renderField("HR Approved By", request.hrApprovedByName)}
          {renderField("HR Approved At", formatDate(request.hrApprovedAt))}
          {renderField("Final Approval", request.finalApprovalStatus)}
          {renderField("Final Approved By", request.finalApprovedByName)}
          {renderField("Final Approved At", formatDate(request.finalApprovedAt))}
        </div>
      </FormCard>

      <FormCard title="Reason & Remarks" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {renderField("Reason", request.reason)}
          {renderField("Attachment", request.attachmentUrl)}
          {renderField("Remarks", request.remarks)}
          {renderField("Rejection / Cancellation Reason", request.rejectionReason)}
        </div>
      </FormCard>
    </div>
  );
}
