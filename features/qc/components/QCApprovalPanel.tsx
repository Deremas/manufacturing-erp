"use client";

import { Check, Loader2, SearchCheck, Send, ShieldX, X } from "lucide-react";

import { SectionHeading } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { QCStatusBadge } from "./QCStatusBadge";

export function QCApprovalPanel({
  status,
  testedByName,
  submittedByName,
  checkedByName,
  approvedByName,
  submittedAt,
  checkedAt,
  approvedAt,
  onSubmit,
  onCheck,
  onApprove,
  onReject,
  onCancel,
  busy,
  pendingAction = null,
}: {
  status: string;
  testedByName?: string | null;
  submittedByName?: string | null;
  checkedByName?: string | null;
  approvedByName?: string | null;
  submittedAt?: string | null;
  checkedAt?: string | null;
  approvedAt?: string | null;
  onSubmit?: () => void;
  onCheck?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  busy?: boolean;
  pendingAction?: string | null;
}) {
  const buttonStyle = (bg: string, isLoading = false): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    background: bg,
    color: "white",
    cursor: busy ? "wait" : "pointer",
    fontWeight: 600,
    opacity: busy && !isLoading ? 0.7 : 1,
  });

  const renderLabel = (action: string, label: string, icon: React.ReactNode) => {
    if (pendingAction === action) {
      return (
        <>
          <Loader2 size={16} className="erp-btn-spinner" aria-hidden />
          Processing...
        </>
      );
    }
    return (
      <>
        {icon}
        {label}
      </>
    );
  };

  return (
    <section style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, display: "grid", gap: 14 }}>
      <SectionHeading title="Workflow" extra={<QCStatusBadge status={status} />} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div><small style={{ color: colors.text.muted }}>Prepared / Tested By</small><div>{testedByName || "—"}</div></div>
        <div><small style={{ color: colors.text.muted }}>Submitted By</small><div>{submittedByName || "—"}{submittedAt ? ` · ${new Date(submittedAt).toLocaleString()}` : ""}</div></div>
        <div><small style={{ color: colors.text.muted }}>Checked By</small><div>{checkedByName || "—"}{checkedAt ? ` · ${new Date(checkedAt).toLocaleString()}` : ""}</div></div>
        <div><small style={{ color: colors.text.muted }}>Approved By</small><div>{approvedByName || "—"}{approvedAt ? ` · ${new Date(approvedAt).toLocaleString()}` : ""}</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status === "DRAFT" || status === "REJECTED" ? (
          <button type="button" style={buttonStyle(colors.primary[600], pendingAction === "submit")} onClick={onSubmit} disabled={busy}>
            {renderLabel("submit", "Submit", <Send size={16} />)}
          </button>
        ) : null}
        {status === "SUBMITTED" ? (
          <button type="button" style={buttonStyle("#2563eb", pendingAction === "check")} onClick={onCheck} disabled={busy}>
            {renderLabel("check", "Check", <SearchCheck size={16} />)}
          </button>
        ) : null}
        {status === "CHECKED" ? (
          <button type="button" style={buttonStyle(colors.success[600], pendingAction === "approve")} onClick={onApprove} disabled={busy}>
            {renderLabel("approve", "Approve", <Check size={16} />)}
          </button>
        ) : null}
        {status === "SUBMITTED" || status === "CHECKED" ? (
          <button type="button" style={buttonStyle(colors.danger[600], pendingAction === "reject")} onClick={onReject} disabled={busy}>
            {renderLabel("reject", "Reject", <ShieldX size={16} />)}
          </button>
        ) : null}
        {status === "DRAFT" || status === "SUBMITTED" ? (
          <button type="button" style={buttonStyle("#64748b", pendingAction === "cancel")} onClick={onCancel} disabled={busy}>
            {renderLabel("cancel", "Cancel", <X size={16} />)}
          </button>
        ) : null}
      </div>
    </section>
  );
}
