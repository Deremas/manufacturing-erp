import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getInventoryApprovalHistory, getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getTransferById } from "@/services/inventory/inventory-documents.service";

export default async function TransferDetailRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [transfer, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getTransferById(id),
    getInventoryApprovalHistory("inventory.transfer", id),
    getInventoryDocumentHistory("inventory.transfer", id),
    getInventoryAuditTrail(id, "inventory.transfer"),
  ]);
  if (!transfer) notFound();

  return (
    <InventoryDocumentDetail
      title={transfer.transferNo}
      subtitle="Stock transfer detail"
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Transfers", href: "/inventory/transfers" },
        { label: transfer.transferNo },
      ]}
      status={transfer.status}
      summary={[
        { label: "Transfer Date", value: new Date(transfer.transferDate).toLocaleDateString("en-KE") },
        { label: "From Location", value: transfer.fromLocationName },
        { label: "To Location", value: transfer.toLocationName },
        { label: "Created By", value: transfer.createdByName },
        { label: "Assigned Approver", value: transfer.assignedApproverName ?? "-" },
        { label: "Remarks", value: transfer.remarks || "-" },
      ]}
      items={transfer.items.map((item) => ({
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
      editHref={transfer.status === "POSTED" || transfer.status === "CANCELLED" ? undefined : `/inventory/transfers/${transfer.id}/edit`}
      approveEndpoint={transfer.status === "SUBMITTED" ? `/api/inventory/transfers/${transfer.id}/approve` : undefined}
      rejectEndpoint={transfer.status === "SUBMITTED" ? `/api/inventory/transfers/${transfer.id}/reject` : undefined}
      cancelEndpoint={transfer.status === "DRAFT" || transfer.status === "SUBMITTED" || transfer.status === "APPROVED" ? `/api/inventory/transfers/${transfer.id}/cancel` : undefined}
      postEndpoint={transfer.status === "APPROVED" ? `/api/inventory/transfers/${transfer.id}/post` : undefined}
      afterActionHref={`/inventory/transfers/${transfer.id}`}
    />
  );
}
