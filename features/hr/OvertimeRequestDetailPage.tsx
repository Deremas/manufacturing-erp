"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Pencil, Send, XCircle } from "lucide-react";

import { ActionButtons, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { publicEditUrl } from "@/lib/routing/urls";
import type { OvertimeRequest } from "./types";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function postAction(id: string, action: "submit" | "approve" | "reject" | "cancel") {
  const response = await fetch(`/api/hr/overtime/${id}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to update overtime request.");
  }
}

export default function OvertimeRequestDetailPage({ overtime }: { overtime: OvertimeRequest | null }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Overtime", href: "/hr/overtime" },
    { label: overtime?.overtimeNo ?? "Detail" },
  ];

  if (!overtime) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <PageHeader title="Overtime Request" subtitle="Review overtime details and workflow history." breadcrumbs={breadcrumbs} />
        <FormCard title="Overtime Request" variant="teal-header">
          <div style={{ color: colors.text.secondary }}>Overtime request not found.</div>
        </FormCard>
      </div>
    );
  }

  const runAction = async (action: "submit" | "approve" | "reject" | "cancel") => {
    try {
      setError("");
      setBusyAction(action);
      await postAction(overtime.id, action);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update overtime request.");
    } finally {
      setBusyAction(null);
    }
  };

  const actions: Action[] = [
    {
      label: "Edit",
      variant: "secondary",
      icon: <Pencil size={16} />,
      onClick: () => router.push(publicEditUrl("hr.overtime", overtime.publicId)),
      disabled: !["DRAFT", "SUBMITTED"].includes(overtime.status),
    },
    {
      label: "Submit",
      variant: "secondary",
      icon: <Send size={16} />,
      onClick: () => { void runAction("submit"); },
      loading: busyAction === "submit",
      disabled: overtime.status !== "DRAFT",
    },
    {
      label: "Approve",
      variant: "primary",
      icon: <CheckCircle2 size={16} />,
      onClick: () => { void runAction("approve"); },
      loading: busyAction === "approve",
      disabled: overtime.status !== "SUBMITTED",
    },
    {
      label: "Reject",
      variant: "danger",
      icon: <XCircle size={16} />,
      onClick: () => { void runAction("reject"); },
      loading: busyAction === "reject",
      disabled: !["DRAFT", "SUBMITTED"].includes(overtime.status),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        recordKind="hr.overtime"
        title={overtime.overtimeNo}
        subtitle="Review the overtime request, amount calculation, and approval workflow from the live HR module."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {error ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>
          {error}
        </div>
      ) : null}

      <FormCard title="Overtime Overview" variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Employee</div><div>{overtime.employeeName}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Employee No</div><div>{overtime.employeeNo ?? "—"}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Date</div><div>{formatDate(overtime.overtimeDate)}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Shift</div><div>{overtime.shiftCode || "—"}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Hours</div><div>{overtime.hours}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Multiplier</div><div>{overtime.rateMultiplier}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Amount</div><div>{formatCurrency(overtime.amount)}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Status</div><div><StatusBadge status={overtime.status === "APPROVED" || overtime.status === "POSTED" ? "approved" : overtime.status === "SUBMITTED" ? "pending" : overtime.status === "REJECTED" || overtime.status === "CANCELLED" ? "rejected" : "draft"} /></div></div>
        </div>
      </FormCard>

      <FormCard title="Context" variant="default">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Department</div><div>{overtime.departmentName ?? "—"}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Location</div><div>{overtime.locationName ?? "—"}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Requested By</div><div>{overtime.requestedByName ?? "—"}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Approved By</div><div>{overtime.approvedByName ?? "—"}</div></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ color: colors.text.secondary, fontSize: 12 }}>Reason</div>
          <div>{overtime.reason ?? "—"}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ color: colors.text.secondary, fontSize: 12 }}>Remarks</div>
          <div>{overtime.remarks ?? "—"}</div>
        </div>
      </FormCard>
    </div>
  );
}
