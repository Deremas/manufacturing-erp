import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getInventoryApprovalHistory, getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getReturnById } from "@/services/inventory/inventory-documents.service";

export default async function ReturnDetailRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [returnDoc, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getReturnById(id),
    getInventoryApprovalHistory("inventory.return", id),
    getInventoryDocumentHistory("inventory.return", id),
    getInventoryAuditTrail(id, "inventory.return"),
  ]);
  if (!returnDoc) notFound();

  return (
    <InventoryDocumentDetail
      title={returnDoc.returnNo}
      subtitle="Stock return detail"
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns", href: "/inventory/returns" },
        { label: returnDoc.returnNo },
      ]}
      status={returnDoc.status}
      summary={[
        { label: "Return Date", value: new Date(returnDoc.returnDate).toLocaleDateString("en-KE") },
        { label: "Location", value: returnDoc.locationName },
        { label: "Returned From Type", value: returnDoc.returnedFromType },
        { label: "Returned From", value: returnDoc.returnedFromName },
        { label: "Reason", value: returnDoc.reason },
        { label: "Assigned Approver", value: returnDoc.assignedApproverName ?? "-" },
        { label: "Remarks", value: returnDoc.remarks || "-" },
      ]}
      items={returnDoc.items.map((item) => ({
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
      editHref={returnDoc.status === "POSTED" || returnDoc.status === "CANCELLED" ? undefined : `/inventory/returns/${returnDoc.id}/edit`}
      approveEndpoint={returnDoc.status === "SUBMITTED" ? `/api/inventory/returns/${returnDoc.id}/approve` : undefined}
      rejectEndpoint={returnDoc.status === "SUBMITTED" ? `/api/inventory/returns/${returnDoc.id}/reject` : undefined}
      cancelEndpoint={returnDoc.status === "DRAFT" || returnDoc.status === "SUBMITTED" || returnDoc.status === "APPROVED" ? `/api/inventory/returns/${returnDoc.id}/cancel` : undefined}
      postEndpoint={returnDoc.status === "APPROVED" ? `/api/inventory/returns/${returnDoc.id}/post` : undefined}
      afterActionHref={`/inventory/returns/${returnDoc.id}`}
    />
  );
}
