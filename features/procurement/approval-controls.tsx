"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Send, XCircle } from "lucide-react";

import { ActionButtons, ApprovalDialog, FormCard } from "@/components/shared";
import type { TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { notifyActionError, notifyActionSuccess, notifyFromEndpoint } from "@/components/shared/toast";
import type { ApprovalActionKey } from "@/lib/approval/action-keys";

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 600,
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

function statusOf(record: { status?: unknown }) {
  return String(record.status ?? "").toUpperCase();
}

export type { ApprovalActionKey } from "@/lib/approval/action-keys";
export { approvalActionKeyFromEndpoint } from "@/lib/approval/action-keys";

export async function postProcurementApproval(
  endpoint: string,
  body?: { comment?: string },
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error ?? "Approval action failed");
  }
  return result;
}

export function useProcurementApprovalDialog({
  apiBasePath,
}: {
  apiBasePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"approve" | "reject" | "submit">("approve");
  const [record, setRecord] = useState<{ id: string; number: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<ApprovalActionKey | null>(null);
  const [error, setError] = useState("");

  function close() {
    if (pendingAction) return;
    setOpen(false);
    setError("");
    setRecord(null);
  }

  function openApprove(next: { id: string; number: string }) {
    setMode("approve");
    setRecord(next);
    setError("");
    setOpen(true);
  }

  function openReject(next: { id: string; number: string }) {
    setMode("reject");
    setRecord(next);
    setError("");
    setOpen(true);
  }

  function openSubmit(next: { id: string; number: string }) {
    setMode("submit");
    setRecord(next);
    setError("");
    setOpen(true);
  }

  async function run(action: ApprovalActionKey, comment?: string) {
    if (!record) return;
    setPendingAction(action);
    setError("");
    try {
      await postProcurementApproval(`${apiBasePath}/${record.id}/${action}`, { comment });
      notifyActionSuccess(action);
      setOpen(false);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Approval action failed";
      setError(message);
      notifyActionError(message);
    } finally {
      setPendingAction(null);
    }
  }

  const actions: TableAction[] = [
    {
      label: "Submit for Approval",
      icon: <Send size={16} />,
      show: (row) => ["DRAFT", "REJECTED"].includes(statusOf(row)),
      onClick: (row) => openSubmit({ id: String(row.id), number: String(row.number ?? row.invoiceNo ?? row.paymentNo ?? row.id) }),
    },
    {
      label: "Approve",
      icon: <CheckCircle size={16} />,
      show: (row) => statusOf(row) === "SUBMITTED",
      onClick: (row) => openApprove({ id: String(row.id), number: String(row.number ?? row.invoiceNo ?? row.paymentNo ?? row.id) }),
    },
    {
      label: "Reject",
      icon: <XCircle size={16} />,
      show: (row) => statusOf(row) === "SUBMITTED",
      onClick: (row) => openReject({ id: String(row.id), number: String(row.number ?? row.invoiceNo ?? row.paymentNo ?? row.id) }),
    },
  ];

  const dialog = (
    <ApprovalDialog
      open={open}
      onClose={close}
      intent={mode}
      title={
        mode === "submit"
          ? "Submit for Approval"
          : mode === "reject"
            ? "Reject Document"
            : "Approve Document"
      }
      recordInfo={record?.number}
      pendingAction={
        pendingAction === "approve" || pendingAction === "reject"
          ? pendingAction
          : pendingAction === "submit"
            ? "approve"
            : null
      }
      error={error}
      approveLabel={mode === "submit" ? "Submit for Approval" : "Approve"}
      rejectLabel="Reject"
      onApprove={
        mode === "reject"
          ? undefined
          : (comment) => void run(mode === "submit" ? "submit" : "approve", comment)
      }
      onReject={mode === "reject" ? (comment) => void run("reject", comment) : undefined}
    />
  );

  return { actions, dialog };
}

export function ProcurementApprovalForm({
  status,
  requestedByName,
  submitEndpoint,
  approveEndpoint,
  rejectEndpoint,
  onComplete,
  disabled,
}: {
  status: string;
  requestedByName?: string;
  submitEndpoint?: string;
  approveEndpoint?: string;
  rejectEndpoint?: string;
  onComplete?: () => void;
  disabled?: boolean;
}) {
  const current = String(status).toUpperCase();
  const canSubmit = Boolean(submitEndpoint) && ["DRAFT", "REJECTED"].includes(current);
  const canDecide = Boolean(approveEndpoint || rejectEndpoint) && current === "SUBMITTED";
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<ApprovalActionKey | null>(null);

  if (!canSubmit && !canDecide) {
    return null;
  }

  async function run(endpoint: string, action: ApprovalActionKey) {
    setPendingAction(action);
    setMessage("");
    try {
      await postProcurementApproval(endpoint, {
        comment: comment.trim() || undefined,
      });
      notifyFromEndpoint(endpoint);
      setComment("");
      onComplete?.();
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : "Approval action failed";
      setMessage(error);
      notifyActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  const busy = pendingAction != null;

  return (
    <FormCard title="Approval" variant="teal-header">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {requestedByName ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>
            Requested by {requestedByName}.
          </p>
        ) : null}
        <div>
          <label style={labelStyle}>Comment</label>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            value={comment}
            disabled={disabled || busy}
            onChange={(event) => setComment(event.target.value)}
            placeholder={canDecide ? "Optional approval or rejection comment" : "Optional submission comment"}
          />
        </div>
        {message ? <p style={{ margin: 0, color: colors.danger[600] }}>{message}</p> : null}
        <ActionButtons
          actions={[
            ...(canSubmit && submitEndpoint
              ? [{
                  label: "Submit for Approval",
                  variant: "primary" as const,
                  icon: <Send size={16} />,
                  loading: pendingAction === "submit",
                  disabled: disabled || busy,
                  onClick: () => void run(submitEndpoint, "submit"),
                }]
              : []),
            ...(canDecide && approveEndpoint
              ? [{
                  label: "Approve",
                  variant: "primary" as const,
                  icon: <CheckCircle size={16} />,
                  loading: pendingAction === "approve",
                  disabled: disabled || busy,
                  onClick: () => void run(approveEndpoint, "approve"),
                }]
              : []),
            ...(canDecide && rejectEndpoint
              ? [{
                  label: "Reject",
                  variant: "danger" as const,
                  icon: <XCircle size={16} />,
                  loading: pendingAction === "reject",
                  disabled: disabled || busy,
                  onClick: () => void run(rejectEndpoint, "reject"),
                }]
              : []),
          ]}
        />
      </div>
    </FormCard>
  );
}
