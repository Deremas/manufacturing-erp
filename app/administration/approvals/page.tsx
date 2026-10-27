import Link from "next/link";

import { PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { listApprovalInboxItems } from "@/services/approval/approval-inbox.service";

export const dynamic = "force-dynamic";

export default async function ApprovalQueuePage() {
  const approvals = await listApprovalInboxItems(["*"], "");

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
            href={approval.href}
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
            <strong>{approval.documentLabel}</strong>
            <span>Reference: {approval.documentNo}</span>
            <span>Requested By: {approval.requestedByName}</span>
            <span>Assigned Approver: {approval.assignedApproverName ?? "Unassigned"}</span>
            <span>Created: {new Date(approval.createdAt).toLocaleString("en-KE")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
