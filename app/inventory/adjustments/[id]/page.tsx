import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getInventoryApprovalHistory, getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getAdjustmentById } from "@/services/inventory/inventory-documents.service";

export default async function AdjustmentDetailRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [adjustment, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getAdjustmentById(id),
    getInventoryApprovalHistory("inventory.adjustment", id),
    getInventoryDocumentHistory("inventory.adjustment", id),
    getInventoryAuditTrail(id, "inventory.adjustment"),
  ]);
  if (!adjustment) notFound();

  return (
    <InventoryDocumentDetail
      title={adjustment.adjustmentNo}
      subtitle="Stock adjustment detail"
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Adjustments", href: "/inventory/adjustments" },
        { label: adjustment.adjustmentNo },
      ]}
      status={adjustment.status}
      summary={[
        { label: "Adjustment Date", value: new Date(adjustment.adjustmentDate).toLocaleDateString("en-KE") },
        { label: "Location", value: adjustment.locationName },
        { label: "Reason", value: adjustment.reason },
        { label: "Created By", value: adjustment.createdByName },
        { label: "Assigned Approver", value: adjustment.assignedApproverName ?? "-" },
        { label: "Remarks", value: adjustment.remarks || "-" },
      ]}
      items={adjustment.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        systemQty: item.systemQty,
        physicalQty: item.physicalQty,
        differenceQty: item.differenceQty,
        unitCost: item.unitCost,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "systemQty", label: "System Qty" },
        { key: "physicalQty", label: "Physical Qty" },
        { key: "differenceQty", label: "Difference" },
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
      editHref={adjustment.status === "POSTED" || adjustment.status === "CANCELLED" ? undefined : `/inventory/adjustments/${adjustment.id}/edit`}
      approveEndpoint={adjustment.status === "SUBMITTED" ? `/api/inventory/adjustments/${adjustment.id}/approve` : undefined}
      rejectEndpoint={adjustment.status === "SUBMITTED" ? `/api/inventory/adjustments/${adjustment.id}/reject` : undefined}
      cancelEndpoint={adjustment.status === "DRAFT" || adjustment.status === "SUBMITTED" || adjustment.status === "APPROVED" ? `/api/inventory/adjustments/${adjustment.id}/cancel` : undefined}
      postEndpoint={adjustment.status === "APPROVED" ? `/api/inventory/adjustments/${adjustment.id}/post` : undefined}
      afterActionHref={`/inventory/adjustments/${adjustment.id}`}
    />
  );
}
