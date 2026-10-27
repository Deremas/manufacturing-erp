"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Check,
  Eye,
  FileText,
  PackagePlus,
  Pencil,
  Printer,
  Send,
  Wallet,
} from "lucide-react";

import { ActionButtons, ApprovalDialog, FormCard, HistoryActionBadge, RecordDetailIcon, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { postProcurementApproval, approvalActionKeyFromEndpoint, type ApprovalActionKey } from "./approval-controls";
import { useAccess } from "@/lib/auth/use-access";
import { notifyActionError, notifyFromEndpoint } from "@/components/shared/toast";

export type DocumentItemColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: "text" | "qty" | "money";
};

type RelatedDocument = {
  label: string;
  href: string;
  status?: string;
};

type RelatedAction = {
  label: string;
  href: string;
  variant?: Action["variant"];
};

type TrailEntry = {
  action: string;
  label: string;
  actor: string;
  at: string;
  comment?: string;
};

function formatStatusLabel(status: string) {
  return String(status).replaceAll("_", " ");
}

function isPreApprovalStatus(status: string) {
  return ["DRAFT"].includes(String(status).toUpperCase());
}

function badgeForStatus(status: string) {
  switch (String(status).toUpperCase()) {
    case "APPROVED":
    case "POSTED":
    case "RECEIVED":
    case "PAID":
    case "CONVERTED":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
      return "voided";
    case "SUBMITTED":
    case "PARTIALLY_CONVERTED":
    case "PARTIALLY_RECEIVED":
    case "PARTIAL_PAID":
      return "pending";
    default:
      return "draft";
  }
}

import { useSystemPreferences } from "@/lib/client/use-system-preferences";
import { formatMoney, formatQuantity } from "@/lib/utils/format-number";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function cellValue(column: DocumentItemColumn, value: unknown, currencyCode: string) {
  if (value == null || value === "") return "-";
  if (column.format === "money") return formatMoney(value, currencyCode);
  if (column.format === "qty") return formatQuantity(value);
  return String(value);
}

function buildApprovalTrail(
  documentHistory: Array<{ action: string; performedBy?: string; comment?: string; createdAt: string }>,
  approvalHistory: Array<{ status: string; requestedBy: string; assignedApprover?: string; approvedBy?: string; comment?: string; createdAt: string }>,
): TrailEntry[] {
  const entries: TrailEntry[] = [];

  for (const entry of documentHistory) {
    if (entry.action === "CREATE") {
      entries.push({
        action: "CREATE",
        label: "Prepared by",
        actor: entry.performedBy ?? "System",
        at: entry.createdAt,
        comment: entry.comment,
      });
    }
  }

  for (const entry of [...approvalHistory].reverse()) {
    const status = String(entry.status).toUpperCase();
    if (status === "PENDING") {
      entries.push({
        action: "SUBMITTED",
        label: "Submitted for approval",
        actor: entry.requestedBy,
        at: entry.createdAt,
        comment: entry.comment,
      });
    } else if (status === "APPROVED") {
      entries.push({
        action: "APPROVED",
        label: "Approved by",
        actor: entry.approvedBy ?? entry.assignedApprover ?? "System",
        at: entry.createdAt,
        comment: entry.comment,
      });
    } else if (status === "REJECTED") {
      entries.push({
        action: "REJECTED",
        label: "Rejected by",
        actor: entry.approvedBy ?? entry.assignedApprover ?? "System",
        at: entry.createdAt,
        comment: entry.comment,
      });
    }
  }

  return entries.sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
}

export function ProcurementDocumentDetail({
  title,
  subtitle,
  breadcrumbs,
  listHref,
  status,
  informationTitle = "Document Information",
  itemsTitle = "Items",
  summary,
  items,
  itemColumns,
  totals,
  relatedDocuments = [],
  relatedActions = [],
  approvalHistory = [],
  documentHistory = [],
  editHref,
  printHref,
  postEndpoint,
  submitEndpoint,
  approveEndpoint,
  rejectEndpoint,
  cancelEndpoint,
  afterActionHref,
  recordKind,
}: {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  listHref?: string;
  status: string;
  informationTitle?: string;
  itemsTitle?: string;
  summary: Array<{ label: string; value: string; href?: string }>;
  items: Array<Record<string, string | number | null | undefined>>;
  itemColumns: DocumentItemColumn[];
  totals?: Array<{ label: string; value: string | number }>;
  relatedDocuments?: RelatedDocument[];
  relatedActions?: RelatedAction[];
  approvalHistory?: Array<{ status: string; requestedBy: string; assignedApprover?: string; approvedBy?: string; comment?: string; createdAt: string }>;
  documentHistory?: Array<{ action: string; performedBy?: string; comment?: string; createdAt: string }>;
  auditTrail?: Array<{ action: string; user?: string; timestamp: string }>;
  editHref?: string;
  printHref?: string;
  postEndpoint?: string;
  submitEndpoint?: string;
  approveEndpoint?: string;
  rejectEndpoint?: string;
  cancelEndpoint?: string;
  afterActionHref?: string;
  recordKind?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { canPath } = useAccess();
  const { currencyCode } = useSystemPreferences();
  const [pendingAction, setPendingAction] = useState<ApprovalActionKey | null>(null);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"approve" | "reject" | "submit" | null>(null);
  const [dialogError, setDialogError] = useState("");

  const approvalTrail = useMemo(
    () => buildApprovalTrail(documentHistory, approvalHistory),
    [approvalHistory, documentHistory],
  );

  const visibleColumns = useMemo(() => {
    if (isPreApprovalStatus(status)) {
      return itemColumns.filter((column) => !["approvedQty", "receivedQty", "acceptedQty", "rejectedQty"].includes(column.key));
    }
    return itemColumns;
  }, [itemColumns, status]);

  const showApprovalTrail = !isPreApprovalStatus(status) && approvalTrail.length > 0;
  const backHref = listHref ?? breadcrumbs.find((crumb, index) => crumb.href && index === breadcrumbs.length - 2)?.href;

  function finishAction() {
    setDialog(null);
    router.push(afterActionHref ?? pathname);
    router.refresh();
  }

  function runAction(endpoint: string, body?: { comment?: string }) {
    const actionKey = approvalActionKeyFromEndpoint(endpoint);
    setMessage("");
    setDialogError("");
    setPendingAction(actionKey);
    startTransition(async () => {
      try {
        await postProcurementApproval(endpoint, body);
        notifyFromEndpoint(endpoint);
        finishAction();
      } catch (caught) {
        const error = caught instanceof Error ? caught.message : "Action failed";
        setMessage(error);
        setDialogError(error);
        notifyActionError(error);
      } finally {
        setPendingAction(null);
      }
    });
  }

  const isPending = pendingAction != null;

  const visibleRelatedDocuments = relatedDocuments.filter((doc) => canPath(doc.href));
  const visibleRelatedActions = relatedActions.filter((action) => canPath(action.href));

  const isActionLoading = (key: ApprovalActionKey) => pendingAction === key;

  const relatedActionButtons: Action[] = visibleRelatedActions.map((action) => ({
    label: action.label,
    href: action.href,
    variant: action.variant ?? ("primary" as const),
    icon: action.label.toLowerCase().includes("grn")
      ? <PackagePlus size={16} />
      : action.label.toLowerCase().includes("invoice")
        ? <FileText size={16} />
        : action.label.toLowerCase().includes("payment")
          ? <Wallet size={16} />
          : action.label.toLowerCase().includes("po")
            ? <Send size={16} />
            : <Eye size={16} />,
    onClick: () => router.push(action.href),
    disabled: isPending,
  }));

  const actions: Action[] = [
    ...(editHref ? [{ label: "Edit", icon: <Pencil size={16} />, variant: "secondary" as const, onClick: () => router.push(editHref), disabled: isPending }] : []),
    ...(submitEndpoint ? [{ label: "Submit for Approval", icon: <Send size={16} />, variant: "primary" as const, onClick: () => { setDialogError(""); setDialog("submit"); }, loading: isActionLoading("submit"), disabled: isPending }] : []),
    ...(approveEndpoint ? [{ label: "Approve", icon: <Check size={16} />, variant: "primary" as const, onClick: () => { setDialogError(""); setDialog("approve"); }, disabled: isPending }] : []),
    ...(rejectEndpoint ? [{ label: "Reject", icon: <Ban size={16} />, variant: "danger" as const, onClick: () => { setDialogError(""); setDialog("reject"); }, disabled: isPending }] : []),
    ...(postEndpoint ? [{ label: "Post", icon: <Send size={16} />, variant: "primary" as const, onClick: () => runAction(postEndpoint), loading: isActionLoading("post"), disabled: isPending }] : []),
    ...relatedActionButtons,
    ...(printHref ? [{ label: "Print", icon: <Printer size={16} />, variant: "secondary" as const, onClick: () => window.open(printHref, "_blank", "noopener,noreferrer"), disabled: isPending }] : []),
    ...(cancelEndpoint ? [{ label: "Cancel Doc", icon: <Ban size={16} />, variant: "warning" as const, onClick: () => runAction(cancelEndpoint), loading: isActionLoading("cancel"), disabled: isPending }] : []),
  ];

  const itemsCountBadge = (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.18)",
      color: colors.text.inverse,
      fontSize: typography.sizes.caption.fontSize,
      fontWeight: 700,
      letterSpacing: "0.04em",
    }}
    >
      {items.length} {items.length === 1 ? "ITEM" : "ITEMS"}
    </span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        padding: `${spacing.card.padding}px`,
        backgroundColor: colors.surface,
        borderRadius: radius.components.card,
        border: `1px solid ${colors.border}`,
      }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", minWidth: 0 }}>
          {backHref ? (
            <button
              type="button"
              onClick={() => router.push(backHref)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: radius.components.button,
                backgroundColor: colors.surface,
                color: colors.text.primary,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {recordKind ? <RecordDetailIcon kind={recordKind} /> : null}
            <h1 style={{
              margin: 0,
              fontSize: typography.sizes.h4.fontSize,
              fontWeight: typography.weights.bold,
              color: colors.text.primary,
            }}
            >
              {title}
            </h1>
            <StatusBadge
              status={badgeForStatus(status) as never}
              label={formatStatusLabel(status)}
            />
          </div>
        </div>
        <ActionButtons actions={actions} />
      </div>

      {subtitle ? (
        <p style={{ margin: 0, color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
          {subtitle}
        </p>
      ) : null}

      {message ? (
        <p style={{ margin: 0, color: colors.danger[600] }}>{message}</p>
      ) : null}

      <FormCard title={informationTitle} variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px 24px" }}>
          {summary.map((entry) => (
            <div key={entry.label} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span style={{ color: colors.text.secondary, fontSize: typography.sizes.caption.fontSize, fontWeight: 600, textTransform: "uppercase" }}>
                {entry.label}
              </span>
              {entry.href && canPath(entry.href) ? (
                <a href={entry.href} style={{ color: colors.primary[600], fontWeight: 700, textDecoration: "none" }}>
                  {entry.value || "-"}
                </a>
              ) : (
                <strong style={{ fontWeight: 600 }}>{entry.value || "-"}</strong>
              )}
            </div>
          ))}
        </div>
      </FormCard>

      <FormCard title={itemsTitle} headerExtra={itemsCountBadge} variant="teal-header">
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: Math.max(visibleColumns.length * 120, 720) }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={thStyle}>#</th>
                {visibleColumns.map((column) => (
                  <th key={column.key} style={{ ...thStyle, textAlign: column.align ?? "left" }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} style={{ ...tdStyle, color: colors.text.secondary, textAlign: "center" }}>
                    No line items on this document.
                  </td>
                </tr>
              ) : items.map((item, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#fcfdfe" }}>
                  <td style={tdStyle}>{index + 1}</td>
                  {visibleColumns.map((column) => (
                    <td key={column.key} style={{ ...tdStyle, textAlign: column.align ?? "left", fontVariantNumeric: column.format ? "tabular-nums" : undefined }}>
                      {cellValue(column, item[column.key], currencyCode)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totals && totals.length > 0 ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
            <div style={{ minWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
              {totals.map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "center" }}>
                  <span style={{ color: colors.text.secondary, fontWeight: 700, textTransform: "uppercase", fontSize: typography.sizes.caption.fontSize }}>
                    {row.label}
                  </span>
                  <strong style={{ fontVariantNumeric: "tabular-nums", fontSize: typography.sizes.h6.fontSize }}>
                    {typeof row.value === "number" ? formatMoney(row.value, currencyCode) : row.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </FormCard>

      {visibleRelatedDocuments.length > 0 ? (
        <FormCard title="Related Documents" variant="teal-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleRelatedDocuments.map((doc) => (
              <div key={doc.href} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <a href={doc.href} style={{ color: colors.primary[600], fontWeight: 700, textDecoration: "none" }}>{doc.label}</a>
                {doc.status ? <StatusBadge status={badgeForStatus(doc.status) as never} /> : null}
              </div>
            ))}
          </div>
        </FormCard>
      ) : null}

      {showApprovalTrail ? (
      <FormCard title="Approval Trail" variant="teal-header">
        {approvalTrail.length === 0 ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>No approval activity recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {approvalTrail.map((entry, index) => (
              <div
                key={`${entry.label}-${entry.at}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr",
                  gap: 12,
                  paddingBottom: index < approvalTrail.length - 1 ? 18 : 0,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: colors.primary[600],
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                  />
                  {index < approvalTrail.length - 1 ? (
                    <span style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 6 }} />
                  ) : null}
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <HistoryActionBadge action={entry.action} label={`${entry.label} ${entry.actor}`} />
                  </div>
                  <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize, marginTop: 4 }}>
                    {formatDateTime(entry.at)}
                  </div>
                  {entry.comment ? (
                    <div style={{ marginTop: 8, color: colors.text.primary, fontSize: typography.sizes.small.fontSize }}>
                      {entry.comment}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </FormCard>
      ) : null}

      <ApprovalDialog
        open={dialog !== null}
        onClose={() => { if (!isPending) setDialog(null); }}
        intent={dialog ?? "approve"}
        title={
          dialog === "submit"
            ? "Submit for Approval"
            : dialog === "reject"
              ? "Reject Document"
              : "Approve Document"
        }
        recordInfo={title}
        pendingAction={
          pendingAction === "approve" || pendingAction === "reject"
            ? pendingAction
            : pendingAction === "submit"
              ? "approve"
              : null
        }
        error={dialogError}
        approveLabel={dialog === "submit" ? "Submit for Approval" : "Approve"}
        rejectLabel="Reject"
        onApprove={
          dialog === "reject"
            ? undefined
            : (comment) => {
                if (dialog === "submit" && submitEndpoint) {
                  runAction(submitEndpoint, { comment });
                  return;
                }
                if (approveEndpoint) {
                  runAction(approveEndpoint, { comment });
                }
              }
        }
        onReject={
          dialog === "reject" && rejectEndpoint
            ? (comment) => runAction(rejectEndpoint, { comment })
            : undefined
        }
      />
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: "#f8fafc",
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  color: colors.text.secondary,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: `1px solid ${colors.border}`,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
};
