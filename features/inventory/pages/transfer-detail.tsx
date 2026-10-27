import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, FileText, Package } from "lucide-react";

import { HistoryActionBadge, RecordDetailIcon, SectionHeading, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import {
  getInventoryApprovalHistory,
  getInventoryAuditTrail,
} from "@/services/inventory/inventory-insights.service";
import { getTransferById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.transfer" as const;

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusVariant(status: string) {
  switch (String(status).toUpperCase()) {
    case "DRAFT":
      return "draft";
    case "SUBMITTED":
    case "APPROVED":
      return "pending";
    case "POSTED":
      return "posted";
    case "CANCELLED":
    case "REJECTED":
      return "voided";
    default:
      return "completed";
  }
}

function SectionCard({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.components.card,
        padding: 22,
        minWidth: 0,
      }}
    >
      <SectionHeading title={title} icon={icon} extra={right} />
      {children}
    </section>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: colors.text.secondary, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

function EventCard({
  action,
  actor,
  timestamp,
  comment,
}: {
  action: string;
  actor?: string | null;
  timestamp: string;
  comment?: string | null;
}) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${colors.border}`,
        paddingBottom: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <HistoryActionBadge action={action} />
        <span style={{ fontSize: 13, color: colors.text.secondary }}>{actor ?? "System"}</span>
        <span style={{ fontSize: 13, color: colors.text.secondary }}>{formatDateTime(timestamp)}</span>
      </div>
      {comment ? <div style={{ marginTop: 6, fontSize: 13, color: colors.text.primary }}>{comment}</div> : null}
    </div>
  );
}

export async function renderTransferDetail(documentKey: string) {
  const transfer = await getTransferById(documentKey);
  if (!transfer) notFound();

  const [approvalHistory, auditTrail] = await Promise.all([
    getInventoryApprovalHistory(ROUTE_KEY, transfer.id),
    getInventoryAuditTrail(transfer.id, ROUTE_KEY),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px`, maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.components.card,
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <RecordDetailIcon kind="inventory.transfer" />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.text.primary }}>{transfer.transferNo}</h1>
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: colors.text.secondary }}>Stock Transfer Details</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={statusVariant(transfer.status) as never} label={String(transfer.status).replace(/_/g, " ")} />
          <Link
            href="/inventory/transfers"
            style={{
              minHeight: 40,
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 9,
              border: `1px solid ${colors.primary[200]}`,
              backgroundColor: colors.primary[50],
              color: colors.primary[700],
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </div>

      <SectionCard title="Summary" icon={<FileText size={16} />} right={<StatusBadge status={statusVariant(transfer.status) as never} label={String(transfer.status).replace(/_/g, " ")} />}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
          <DetailField label="Transfer Date" value={new Date(transfer.transferDate).toLocaleDateString("en-KE")} />
          <DetailField label="From Location" value={transfer.fromLocationName} />
          <DetailField label="To Location" value={transfer.toLocationName} />
          <DetailField label="Created By" value={transfer.createdByName} />
          <DetailField label="Assigned Approver" value={transfer.assignedApproverName ?? "-"} />
          <DetailField label="Remarks" value={transfer.remarks || "-"} />
          <DetailField label="Item Count" value={transfer.itemCount} />
          <DetailField label="Status" value={String(transfer.status).replace(/_/g, " ")} />
        </div>
      </SectionCard>

      <SectionCard
        title="Transfer Items"
        icon={<Package size={16} />}
        right={<span style={{ fontSize: 12, color: colors.text.secondary, fontWeight: 700 }}>{transfer.items.length} {transfer.items.length === 1 ? "item" : "items"}</span>}
      >
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontFamily: typography.fontFamily,
            }}
          >
            <thead>
              <tr>
                {["#", "Item Code", "Item", "UOM", "Quantity", "Remarks"].map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: label === "#" ? "center" : label === "Quantity" ? "right" : "left",
                      width: label === "Item" ? "260px" : label === "Item Code" ? "160px" : label === "#" ? "48px" : label === "UOM" ? "90px" : label === "Quantity" ? "92px" : "auto",
                      padding: "12px 10px",
                      backgroundColor: "#f9fafb",
                      borderBottom: `1px solid ${colors.border}`,
                      color: colors.text.secondary,
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item, index) => (
                <tr key={item.id}>
                  <td style={tableCellStyle("center")}>{index + 1}</td>
                  <td style={tableCellStyle("left")}>{item.itemCode}</td>
                  <td style={tableCellStyle("left")}>
                    <span
                      title={item.itemName}
                      style={{
                        display: "block",
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 260,
                      }}
                    >
                      {item.itemName}
                    </span>
                  </td>
                  <td style={tableCellStyle("left")}>{item.uomName ?? "-"}</td>
                  <td style={tableCellStyle("right")}>{Number(item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={tableCellStyle("left")}>{item.remarks || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Approval History" icon={<CircleCheck size={16} />}>
        {approvalHistory.length === 0 ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>No approval history recorded.</p>
        ) : (
          approvalHistory.map((entry) => (
            <EventCard
              key={entry.id}
              action={entry.status}
              actor={entry.approvedByName ?? entry.assignedApproverName ?? entry.requestedByName}
              timestamp={entry.createdAt}
              comment={entry.comment}
            />
          ))
        )}
      </SectionCard>

      <details
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.components.card,
          padding: 22,
        }}
      >
        <summary style={{ cursor: "pointer", fontSize: 17, fontWeight: 700, color: colors.text.primary }}>Audit Trail</summary>
        <div style={{ marginTop: 16 }}>
          {auditTrail.length === 0 ? (
            <p style={{ margin: 0, color: colors.text.secondary }}>No audit entries recorded.</p>
          ) : (
            auditTrail.map((entry) => (
              <EventCard key={entry.id} action={entry.action} actor={entry.userName} timestamp={entry.timestamp} />
            ))
          )}
        </div>
      </details>
    </div>
  );
}

function tableCellStyle(align: "left" | "right" | "center"): CSSProperties {
  return {
    padding: "12px 10px",
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text.primary,
    textAlign: align,
    verticalAlign: "top",
  };
}
