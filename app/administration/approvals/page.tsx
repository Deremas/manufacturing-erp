import Link from "next/link";

import { PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { getPendingApprovals } from "@/services/approval/approvalService";

function resolveHref(referenceType: string, referenceId: string) {
  const map: Record<string, string> = {
    "inventory.transfer": `/inventory/transfers/${referenceId}`,
    "inventory.adjustment": `/inventory/adjustments/${referenceId}`,
    "inventory.issue": `/inventory/issues/${referenceId}`,
    "inventory.return": `/inventory/returns/${referenceId}`,
    "inventory.requisition": `/inventory/srv/${referenceId}`,
  };
  return map[referenceType] ?? "#";
}

export default async function ApprovalQueuePage() {
  const approvals = await getPendingApprovals();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px`, padding: `${spacing.page.padding}px` }}>
      <PageHeader
        title="Approval Queue"
        subtitle="Pending approvals assigned across inventory workflows."
        breadcrumbs={[
          { label: "Administration", href: "/administration" },
          { label: "Approvals" },
        ]}
      />

      <div style={{ display: "grid", gap: "12px" }}>
        {approvals.length === 0 ? (
          <div style={{ padding: "20px", border: `1px solid ${colors.border}`, borderRadius: radius.components.card }}>
            All approvals are up to date.
          </div>
        ) : approvals.map((approval) => (
          <Link
            key={approval.id}
            href={resolveHref(approval.referenceType, approval.referenceId)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "16px",
              textDecoration: "none",
              color: colors.text.primary,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.components.card,
              backgroundColor: colors.surface,
            }}
          >
            <strong>{approval.referenceType}</strong>
            <span>Reference: {approval.referenceId}</span>
            <span>Requested By: {approval.requestedByName}</span>
            <span>Assigned Approver: {approval.assignedApproverName ?? "Unassigned"}</span>
            <span>Created: {new Date(approval.createdAt).toLocaleString("en-KE")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
