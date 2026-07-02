import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getApprovalHistory } from "@/services/approval/approvalService";
import { getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getPurchaseRequisitionById } from "@/services/procurement/requisition.service";

export default async function PurchaseRequisitionDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [requisition, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getPurchaseRequisitionById(id),
    getApprovalHistory("procurement.pr", id),
    getInventoryDocumentHistory("procurement.pr", id),
    getInventoryAuditTrail(id, "procurement.pr"),
  ]);

  if (!requisition) {
    notFound();
  }

  return (
    <InventoryDocumentDetail
      title={requisition.requisitionNo}
      subtitle="Purchase requisition detail"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Requisitions", href: "/procurement/requisitions" },
        { label: requisition.requisitionNo },
      ]}
      status={requisition.status}
      summary={[
        { label: "PR Date", value: new Date(requisition.requisitionDate).toLocaleDateString("en-KE") },
        { label: "Department", value: requisition.departmentName },
        { label: "Location", value: requisition.locationName },
        { label: "Requested By", value: requisition.requestedByName },
        { label: "Purpose", value: requisition.purpose },
        { label: "Remarks", value: requisition.remarks || "-" },
      ]}
      items={requisition.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        uom: item.uomName ?? "-",
        requestedQty: item.requestedQty,
        approvedQty: item.approvedQty,
        estimatedUnitPrice: item.estimatedUnitPrice,
        estimatedTotal: item.estimatedTotal,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "uom", label: "UOM" },
        { key: "requestedQty", label: "Requested Qty" },
        { key: "approvedQty", label: "Approved Qty" },
        { key: "estimatedUnitPrice", label: "Est. Unit Price" },
        { key: "estimatedTotal", label: "Est. Total" },
        { key: "remarks", label: "Remarks" },
      ]}
      approvalHistory={approvalHistory.map((entry) => ({
        status: entry.status,
        requestedBy: entry.requestedByName,
        assignedApprover: entry.assignedApproverName,
        approvedBy: entry.approverName,
        comment: entry.comment,
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
      editHref={requisition.status === "CONVERTED" || requisition.status === "CANCELLED" ? undefined : `/procurement/requisitions/${requisition.id}/edit`}
      approveEndpoint={requisition.status === "SUBMITTED" ? `/api/procurement/requisitions/${requisition.id}/approve` : undefined}
      rejectEndpoint={requisition.status === "SUBMITTED" ? `/api/procurement/requisitions/${requisition.id}/reject` : undefined}
      cancelEndpoint={requisition.status === "DRAFT" || requisition.status === "SUBMITTED" || requisition.status === "APPROVED" ? `/api/procurement/requisitions/${requisition.id}/cancel` : undefined}
      afterActionHref={`/procurement/requisitions/${requisition.id}`}
    />
  );
}
