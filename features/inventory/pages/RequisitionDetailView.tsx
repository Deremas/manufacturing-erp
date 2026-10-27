"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Printer, CircleCheck, ClipboardList, RotateCcw } from "lucide-react";

import { ActionButtons, ApprovalDialog, FormCard, HistoryActionBadge, RecordDetailIcon, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";

type ApprovalHistoryRow = {
  status: string;
  requestedBy: string;
  assignedApprover?: string;
  approvedBy?: string;
  comment?: string;
  createdAt: string;
};

type DocumentHistoryRow = {
  action: string;
  performedBy?: string;
  comment?: string;
  createdAt: string;
};

type AuditTrailRow = {
  action: string;
  user?: string;
  timestamp: string;
};

type RequisitionItem = {
  itemCode: string;
  itemName: string;
  uomName?: string | null;
  requestedQty: number;
  approvedQty: number;
  issuedQty: number;
  remarks: string;
};

type RelatedIssueVoucher = {
  id: string;
  publicId: number;
  issueNo: string;
  status: string;
  issueDate: string;
  createdByName: string;
};

type RequisitionDetailViewProps = {
  requisition: {
    id: string;
    publicId: number;
    requisitionNo: string;
    requisitionDate: string;
    requestedByName: string;
    fromLocationName: string | null;
    toLocationName: string | null;
    toDepartmentName: string | null;
    purpose: string;
    assignedApproverName?: string | null;
    remarks: string;
    status: string;
    items: RequisitionItem[];
  };
  approvalHistory: ApprovalHistoryRow[];
  documentHistory: DocumentHistoryRow[];
  auditTrail: AuditTrailRow[];
  relatedIssues: RelatedIssueVoucher[];
  approveEndpoint?: string;
  rejectEndpoint?: string;
  cancelEndpoint?: string;
  generateIssueEndpoint?: string;
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

function badgeVariant(status: string) {
  switch (String(status).toUpperCase()) {
    case "DRAFT":
      return "draft";
    case "SUBMITTED":
      return "pending";
    case "APPROVED":
      return "approved";
    case "ISSUED":
    case "PARTIALLY_ISSUED":
      return "completed";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
      return "voided";
    default:
      return "inactive";
  }
}

export default function RequisitionDetailView({
  requisition,
  approvalHistory,
  documentHistory,
  auditTrail,
  relatedIssues,
  approveEndpoint,
  rejectEndpoint,
  cancelEndpoint,
  generateIssueEndpoint,
}: RequisitionDetailViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [dialogError, setDialogError] = useState("");

  const topActions = useMemo(
    () => [
      ...(approveEndpoint
        ? [{ label: "Approve", variant: "primary" as const, onClick: () => setDialog("approve") }]
        : []),
      ...(rejectEndpoint
        ? [{ label: "Reject", variant: "danger" as const, onClick: () => setDialog("reject") }]
        : []),
      ...(generateIssueEndpoint
        ? [{ label: "Generate Issue", variant: "primary" as const, onClick: () => runAction(generateIssueEndpoint, "GENERATE_ISSUE") }]
        : []),
    ],
    [approveEndpoint, rejectEndpoint, generateIssueEndpoint],
  );

  const hasWorkflowApproval = approvalHistory.some((entry) => String(entry.status).toUpperCase() === "APPROVED");
  const documentHistoryForDisplay = hasWorkflowApproval
    ? documentHistory.filter((entry) => entry.action !== "APPROVE")
    : documentHistory;

  function runAction(endpoint: string, key: string, body?: Record<string, unknown>) {
    setMessage("");
    setPendingAction(key);
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(result.error ?? "Action failed");
          return;
        }
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="print-content" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "nowrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <RecordDetailIcon kind="inventory.requisition" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1.1,
              fontWeight: 700,
              color: colors.text.primary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {requisition.requisitionNo}
          </h1>
          <div
            style={{
              color: colors.text.secondary,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Store Requisition Details
          </div>
          </div>
        </div>

        <div className="no-print" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
            <Link
              href="/inventory/requisitions"
              className="no-print"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                color: colors.text.secondary,
                textDecoration: "none",
                fontSize: typography.sizes.small.fontSize,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                color: colors.text.primary,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Printer size={16} />
              Print
            </button>
          </div>
          {topActions.length > 0 ? <ActionButtons actions={topActions} /> : null}
        </div>
      </div>

      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}

      <FormCard
        title="Requisition Information"
        icon={<ClipboardList size={18} />}
        headerExtra={<StatusBadge status={badgeVariant(requisition.status) as never} label={String(requisition.status).replace(/_/g, " ")} />}
      >
        <div className="requisition-info-grid">
          {[
            ["Requisition No.", requisition.requisitionNo],
            ["Date", formatDate(requisition.requisitionDate)],
            ["Shift", requisition.shiftCode || "-"],
            ["Request From (Location)", requisition.fromLocationName ?? "-"],
            ["For Department", requisition.toDepartmentName ?? "-"],
            ["Needed By Date", requisition.neededByDate ? formatDate(requisition.neededByDate) : "-"],
            ["Remarks / Purpose", requisition.remarks || "-"],
          ].map(([label, value]) => (
            <div key={String(label)} style={fieldStyle}>
              <span style={labelStyle}>{label}</span>
              <strong style={valueStyle}>{String(value)}</strong>
            </div>
          ))}
        </div>
      </FormCard>

      <FormCard
        title="Requested Items"
        icon={<ClipboardList size={18} />}
        headerExtra={<span style={pillStyle}>{requisition.items.length} items</span>}
      >
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={headRowStyle}>
                {["#", "Item Code", "Description", "Source", "UOM", "Requested", "Approved", "Issued"].map((label) => (
                  <th key={label} style={thStyle}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requisition.items.map((item, index) => (
                <tr key={`${item.itemCode}-${index}`}>
                  <td style={tdStyleCenter}>{index + 1}</td>
                  <td style={tdStyle}>{item.itemCode}</td>
                  <td style={tdStyle}>{item.itemName}</td>
                  <td style={tdStyle}>{requisition.fromLocationName ?? "-"}</td>
                  <td style={tdStyle}>{item.uomName ?? "-"}</td>
                  <td style={tdStyleNumber}>{Number(item.requestedQty).toLocaleString()}</td>
                  <td style={tdStyleNumber}>{Number(item.approvedQty).toLocaleString()}</td>
                  <td style={tdStyleNumber}>{Number(item.issuedQty).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <FormCard title="Line Lifecycle & Usage" icon={<ClipboardList size={18} />}>
        <div style={tableScrollStyle}>
          <table style={{ ...tableStyle, minWidth: 0, tableLayout: "fixed" }}>
            <thead>
              <tr style={headRowStyle}>
                {[
                  ["Item", 180],
                  ["Source", 100],
                  ["Issued", 70],
                  ["Exp BOM", 82],
                  ["Recv", 64],
                  ["Actual", 78],
                  ["Waste", 64],
                  ["Return", 70],
                  ["Remain", 74],
                  ["Return To", 120],
                ].map(([label, width]) => (
                  <th
                    key={String(label)}
                    style={{
                      ...thStyle,
                      width: Number(width),
                      padding: "10px 8px",
                      fontSize: 11,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requisition.items.map((item, index) => {
                const issued = Number(item.issuedQty ?? item.approvedQty ?? item.requestedQty ?? 0);
                const actualUsed = 0;
                const wasted = 0;
                const returned = 0;
                const remaining = Math.max(0, issued - actualUsed - wasted - returned);
                return (
                  <tr key={`life-${item.itemCode}-${index}`}>
                    <td style={{ ...tdStyle, whiteSpace: "normal", wordBreak: "break-word" }}>
                      <div style={{ fontWeight: 700, lineHeight: 1.3 }} title={item.itemName}>
                        {item.itemName}
                      </div>
                    </td>
                    <td style={tdStyle}>{requisition.fromLocationName ?? "-"}</td>
                    <td style={tdStyleNumber}>{issued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={tdStyleNumber}>0.00</td>
                    <td style={tdStyleNumber}>0.000</td>
                    <td style={tdStyle}>
                      <input style={smallInputStyle} value={actualUsed} readOnly />
                    </td>
                    <td style={tdStyle}>
                      <input style={smallInputStyle} value={wasted} readOnly />
                    </td>
                    <td style={tdStyleNumber}>0.000</td>
                    <td style={tdStyleNumber}>{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={tdStyle}>
                      <span style={{ ...pillStyle, whiteSpace: "nowrap" }}>{requisition.toLocationName ?? requisition.fromLocationName ?? "-"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FormCard>

      <FormCard
        title="Related Issue Vouchers"
        icon={<ClipboardList size={18} />}
        headerExtra={<span style={pillStyle}>{relatedIssues.length} records</span>}
      >
        {relatedIssues.length === 0 ? (
          <div style={{ color: colors.text.secondary }}>No related issue vouchers recorded yet.</div>
        ) : (
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={headRowStyle}>
                  {["Issue No.", "Date", "Status", "Created By", "Action"].map((label) => (
                    <th key={label} style={thStyle}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relatedIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td style={tdStyle}>
                      <Link href={publicViewUrl("inventory.issue", issue.publicId)} style={linkStyle}>
                        {issue.issueNo}
                      </Link>
                    </td>
                    <td style={tdStyle}>{formatDate(issue.issueDate)}</td>
                    <td style={tdStyle}>
                      <StatusBadge status={badgeVariant(issue.status) as never} label={String(issue.status).replace(/_/g, " ")} size="sm" />
                    </td>
                    <td style={tdStyle}>{issue.createdByName}</td>
                    <td style={tdStyleCenter}>
                      <Link href={publicViewUrl("inventory.issue", issue.publicId)} title="View" aria-label="View" style={viewButtonStyle}>
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>

      <FormCard
        title="Requisition History"
        icon={<CircleCheck size={18} />}
        headerExtra={<span style={pillStyle}>{approvalHistory.length + documentHistoryForDisplay.length} events</span>}
      >
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={headRowStyle}>
                {["When", "Event", "By", "What Changed"].map((label) => (
                  <th key={label} style={thStyle}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ...approvalHistory.map((entry) => ({
                  key: `approval-${entry.createdAt}-${entry.status}`,
                  when: entry.createdAt,
                  event: entry.status,
                  actor: entry.approvedBy ?? entry.requestedBy,
                  comment: entry.comment,
                })),
                ...documentHistoryForDisplay.map((entry) => ({
                  key: `doc-${entry.createdAt}-${entry.action}`,
                  when: entry.createdAt,
                  event: entry.action,
                  actor: entry.performedBy ?? "System",
                  comment: entry.comment,
                })),
              ]
                .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
                .map((entry) => (
                  <tr key={entry.key}>
                    <td style={tdStyle}>{formatDateTime(entry.when)}</td>
                    <td style={tdStyle}>
                      <HistoryActionBadge action={entry.event} />
                    </td>
                    <td style={tdStyle}>{entry.actor}</td>
                    <td style={tdStyle}>{entry.comment ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <ApprovalDialog
        open={dialog !== null}
        onClose={() => {
          if (!pendingAction) {
            setDialog(null);
            setDialogError("");
          }
        }}
        intent={dialog ?? "approve"}
        title={dialog === "reject" ? "Reject Requisition" : "Approve Requisition"}
        recordInfo={requisition.requisitionNo}
        pendingAction={pendingAction === "APPROVE" ? "approve" : pendingAction === "REJECT" ? "reject" : null}
        error={dialogError || undefined}
        approveLabel="Approve"
        rejectLabel="Reject Requisition"
        onApprove={
          dialog === "approve" && approveEndpoint
            ? (comment) => {
                setDialogError("");
                runAction(approveEndpoint, "APPROVE", comment ? { comment } : undefined);
                setDialog(null);
              }
            : undefined
        }
        onReject={
          dialog === "reject" && rejectEndpoint
            ? (comment) => {
                setDialogError("");
                runAction(rejectEndpoint, "REJECT", comment ? { comment } : undefined);
                setDialog(null);
              }
            : undefined
        }
      />

      <style jsx>{`
        .requisition-info-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        @media (max-width: 900px) {
          .requisition-info-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
        }

        @media (max-width: 520px) {
          .requisition-info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: colors.text.primary,
  wordBreak: "break-word",
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 24,
  padding: "0 10px",
  borderRadius: 999,
  backgroundColor: colors.primary[600],
  color: colors.text.inverse,
  fontSize: 12,
  fontWeight: 700,
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 860,
};

const headRowStyle: React.CSSProperties = {
  backgroundColor: "#f9fafb",
};

const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 700,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: `1px solid ${colors.border}`,
  color: colors.text.primary,
  fontSize: 14,
  verticalAlign: "top",
};

const tdStyleCenter: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};

const tdStyleNumber: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const smallInputStyle: React.CSSProperties = {
  width: "100%",
  height: 24,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: "0 8px",
  fontFamily: typography.fontFamily,
  fontSize: 12,
  textAlign: "right",
  boxSizing: "border-box",
  color: colors.text.primary,
  backgroundColor: colors.surface,
};

const linkStyle: React.CSSProperties = {
  color: colors.primary[700],
  fontWeight: 700,
  textDecoration: "none",
};

const viewButtonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: colors.text.secondary,
  backgroundColor: colors.surface,
  textDecoration: "none",
};

const historyRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "12px 0",
  borderBottom: `1px solid ${colors.border}`,
};

const historyDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  marginTop: 5,
  backgroundColor: colors.primary[600],
  flexShrink: 0,
};

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 110,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 10,
  padding: "12px 14px",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
  resize: "vertical",
};

const bottomActionBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 14,
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 18px",
  borderRadius: 9,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.text.secondary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 18px",
  borderRadius: 9,
  border: "none",
  backgroundColor: "#ef4444",
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: 700,
  cursor: "pointer",
};

const warningButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 18px",
  borderRadius: 9,
  border: "none",
  backgroundColor: "#f59e0b",
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: 700,
  cursor: "pointer",
};
