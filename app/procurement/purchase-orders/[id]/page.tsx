import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getApprovalHistory } from "@/services/approval/approvalService";
import { getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";

export default async function PurchaseOrderDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [order, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getPurchaseOrderById(id),
    getApprovalHistory("procurement.po", id),
    getInventoryDocumentHistory("procurement.po", id),
    getInventoryAuditTrail(id, "procurement.po"),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <InventoryDocumentDetail
      title={order.poNo}
      subtitle="Purchase order detail"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Orders", href: "/procurement/purchase-orders" },
        { label: order.poNo },
      ]}
      status={order.status}
      summary={[
        { label: "PO Date", value: new Date(order.poDate).toLocaleDateString("en-KE") },
        { label: "Supplier", value: order.supplierName },
        { label: "Delivery Location", value: order.deliveryLocationName },
        { label: "PR Reference", value: order.requisitionNo ?? "-" },
        { label: "Payment Terms", value: order.paymentTerms || "-" },
        { label: "Remarks", value: order.remarks || "-" },
      ]}
      items={order.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        uom: item.uomName ?? "-",
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
        returnedQty: item.returnedQty,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "uom", label: "UOM" },
        { key: "orderedQty", label: "Ordered Qty" },
        { key: "receivedQty", label: "Received Qty" },
        { key: "returnedQty", label: "Returned Qty" },
        { key: "unitPrice", label: "Unit Price" },
        { key: "taxRate", label: "Tax %" },
        { key: "lineTotal", label: "Line Total" },
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
      editHref={order.status === "RECEIVED" || order.status === "POSTED" || order.status === "CANCELLED" ? undefined : `/procurement/purchase-orders/${order.id}/edit`}
      approveEndpoint={order.status === "SUBMITTED" ? `/api/procurement/purchase-orders/${order.id}/approve` : undefined}
      rejectEndpoint={order.status === "SUBMITTED" ? `/api/procurement/purchase-orders/${order.id}/reject` : undefined}
      cancelEndpoint={order.status === "DRAFT" || order.status === "SUBMITTED" || order.status === "APPROVED" ? `/api/procurement/purchase-orders/${order.id}/cancel` : undefined}
      afterActionHref={`/procurement/purchase-orders/${order.id}`}
    />
  );
}
