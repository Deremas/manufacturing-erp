import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getInventoryApprovalHistory, getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getRequisitionById } from "@/services/inventory/inventory-documents.service";

export default async function StoreRequisitionDetailRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [requisition, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getRequisitionById(id),
    getInventoryApprovalHistory("inventory.requisition", id),
    getInventoryDocumentHistory("inventory.requisition", id),
    getInventoryAuditTrail(id, "inventory.requisition"),
  ]);
  if (!requisition) notFound();

  return (
    <InventoryDocumentDetail
      title={requisition.requisitionNo}
      subtitle="Store requisition detail"
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Store Requisitions", href: "/inventory/srv" },
        { label: requisition.requisitionNo },
      ]}
      status={requisition.status}
      summary={[
        { label: "Requisition Date", value: new Date(requisition.requisitionDate).toLocaleDateString("en-KE") },
        { label: "Requested By", value: requisition.requestedByName },
        { label: "From Location", value: requisition.fromLocationName ?? "-" },
        { label: "To Location", value: requisition.toLocationName ?? "-" },
        { label: "To Department", value: requisition.toDepartmentName ?? "-" },
        { label: "Purpose", value: requisition.purpose },
        { label: "Assigned Approver", value: requisition.assignedApproverName ?? "-" },
        { label: "Remarks", value: requisition.remarks || "-" },
      ]}
      items={requisition.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        requestedQty: item.requestedQty,
        approvedQty: item.approvedQty,
        issuedQty: item.issuedQty,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "requestedQty", label: "Requested Qty" },
        { key: "approvedQty", label: "Approved Qty" },
        { key: "issuedQty", label: "Issued Qty" },
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
      editHref={requisition.status === "CANCELLED" || requisition.status === "ISSUED" ? undefined : `/inventory/srv/${requisition.id}/edit`}
      approveEndpoint={requisition.status === "SUBMITTED" ? `/api/inventory/srv/${requisition.id}/approve` : undefined}
      rejectEndpoint={requisition.status === "SUBMITTED" ? `/api/inventory/srv/${requisition.id}/reject` : undefined}
      cancelEndpoint={requisition.status === "DRAFT" || requisition.status === "SUBMITTED" || requisition.status === "APPROVED" ? `/api/inventory/srv/${requisition.id}/cancel` : undefined}
      generateIssueEndpoint={requisition.status === "APPROVED" || requisition.status === "PARTIALLY_ISSUED" ? `/api/inventory/srv/${requisition.id}/generate-issue` : undefined}
      afterActionHref={`/inventory/srv/${requisition.id}`}
    />
  );
}
