import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getInventoryApprovalHistory, getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getIssueById } from "@/services/inventory/inventory-documents.service";

export default async function IssueDetailRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [issue, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getIssueById(id),
    getInventoryApprovalHistory("inventory.issue", id),
    getInventoryDocumentHistory("inventory.issue", id),
    getInventoryAuditTrail(id, "inventory.issue"),
  ]);
  if (!issue) notFound();

  return (
    <InventoryDocumentDetail
      title={issue.issueNo}
      subtitle="Stock issue detail"
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Issues", href: "/inventory/issues" },
        { label: issue.issueNo },
      ]}
      status={issue.status}
      summary={[
        { label: "Issue Date", value: new Date(issue.issueDate).toLocaleDateString("en-KE") },
        { label: "Location", value: issue.locationName },
        { label: "Issued To Type", value: issue.issuedToType },
        { label: "Issued To", value: issue.issuedToName },
        { label: "Purpose", value: issue.purpose },
        { label: "Assigned Approver", value: issue.assignedApproverName ?? "-" },
        { label: "Remarks", value: issue.remarks || "-" },
      ]}
      items={issue.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        quantity: item.quantity,
        unitCost: item.unitCost,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "quantity", label: "Quantity" },
        { key: "unitCost", label: "Unit Cost" },
        { key: "remarks", label: "Remarks" },
      ]}
      approvalHistory={approvalHistory.map((entry) => ({
        status: entry.status,
        requestedBy: entry.requestedByName,
        assignedApprover: entry.assignedApproverName ?? undefined,
        approvedBy: entry.approvedByName ?? undefined,
        comment: entry.comment ?? undefined,
        createdAt: entry.createdAt,
      }))}
      documentHistory={documentHistory.map((entry) => ({
        action: entry.action,
        performedBy: entry.performedByName ?? undefined,
        comment: entry.comment ?? undefined,
        createdAt: entry.createdAt,
      }))}
      auditTrail={auditTrail.map((entry) => ({
        action: entry.action,
        user: entry.userName ?? undefined,
        timestamp: entry.timestamp,
      }))}
      editHref={issue.status === "POSTED" || issue.status === "CANCELLED" ? undefined : `/inventory/issues/${issue.id}/edit`}
      approveEndpoint={issue.status === "SUBMITTED" ? `/api/inventory/issues/${issue.id}/approve` : undefined}
      rejectEndpoint={issue.status === "SUBMITTED" ? `/api/inventory/issues/${issue.id}/reject` : undefined}
      cancelEndpoint={issue.status === "DRAFT" || issue.status === "SUBMITTED" || issue.status === "APPROVED" ? `/api/inventory/issues/${issue.id}/cancel` : undefined}
      postEndpoint={issue.status === "APPROVED" ? `/api/inventory/issues/${issue.id}/post` : undefined}
      afterActionHref={`/inventory/issues/${issue.id}`}
    />
  );
}
