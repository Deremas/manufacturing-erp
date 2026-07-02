import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getApprovalHistory } from "@/services/approval/approvalService";
import { getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";

export default async function GoodsReceiptDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [receipt, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getGoodsReceiptById(id),
    getApprovalHistory("procurement.grn", id),
    getInventoryDocumentHistory("procurement.grn", id),
    getInventoryAuditTrail(id, "procurement.grn"),
  ]);

  if (!receipt) {
    notFound();
  }

  return (
    <InventoryDocumentDetail
      title={receipt.grnNo}
      subtitle="Goods receipt detail"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Goods Receipts / GRN", href: "/procurement/grn" },
        { label: receipt.grnNo },
      ]}
      status={receipt.status}
      summary={[
        { label: "GRN Date", value: new Date(receipt.grnDate).toLocaleDateString("en-KE") },
        { label: "PO Reference", value: receipt.poNo ?? "-" },
        { label: "Supplier", value: receipt.supplierName },
        { label: "Receiving Location", value: receipt.locationName },
        { label: "Received By", value: receipt.receivedByName ?? "-" },
        { label: "Remarks", value: receipt.remarks || "-" },
      ]}
      items={receipt.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        uom: item.uomName ?? "-",
        orderedQty: item.orderedQty,
        previouslyReceivedQty: item.previouslyReceivedQty,
        receivedQty: item.receivedQty,
        acceptedQty: item.acceptedQty,
        rejectedQty: item.rejectedQty,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "uom", label: "UOM" },
        { key: "orderedQty", label: "Ordered Qty" },
        { key: "previouslyReceivedQty", label: "Previously Received" },
        { key: "receivedQty", label: "Received Qty" },
        { key: "acceptedQty", label: "Accepted Qty" },
        { key: "rejectedQty", label: "Rejected Qty" },
        { key: "unitCost", label: "Unit Cost" },
        { key: "lineTotal", label: "Line Total" },
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
      editHref={receipt.status === "POSTED" || receipt.status === "CANCELLED" ? undefined : `/procurement/grn/${receipt.id}/edit`}
      approveEndpoint={receipt.status === "SUBMITTED" ? `/api/procurement/grn/${receipt.id}/approve` : undefined}
      rejectEndpoint={receipt.status === "SUBMITTED" ? `/api/procurement/grn/${receipt.id}/reject` : undefined}
      cancelEndpoint={receipt.status === "DRAFT" || receipt.status === "SUBMITTED" || receipt.status === "APPROVED" ? `/api/procurement/grn/${receipt.id}/cancel` : undefined}
      postEndpoint={receipt.status === "APPROVED" ? `/api/procurement/grn/${receipt.id}/post` : undefined}
      afterActionHref={`/procurement/grn/${receipt.id}`}
    />
  );
}
