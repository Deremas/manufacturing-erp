import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getApprovalHistory } from "@/services/approval/approvalService";
import { getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getSupplierReturnById } from "@/services/procurement/supplier-return.service";

export default async function SupplierReturnDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [document, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getSupplierReturnById(id),
    getApprovalHistory("procurement.supplier-return", id),
    getInventoryDocumentHistory("procurement.supplier-return", id),
    getInventoryAuditTrail(id, "procurement.supplier-return"),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <InventoryDocumentDetail
      title={document.returnNo}
      subtitle="Supplier return detail"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Returns", href: "/procurement/supplier-returns" },
        { label: document.returnNo },
      ]}
      status={document.status}
      summary={[
        { label: "Return Date", value: new Date(document.returnDate).toLocaleDateString("en-KE") },
        { label: "Supplier", value: document.supplierName },
        { label: "GRN Reference", value: document.grnNo ?? "-" },
        { label: "Return Location", value: document.returnLocationName },
        { label: "Reason", value: document.reason },
        { label: "Remarks", value: document.remarks || "-" },
      ]}
      items={document.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        uom: item.uomName ?? "-",
        receivedQty: item.receivedQty ?? "-",
        availableReturnQty: item.availableReturnQty ?? "-",
        returnQty: item.returnQty,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
        reason: item.reason || "-",
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "uom", label: "UOM" },
        { key: "receivedQty", label: "Received Qty" },
        { key: "availableReturnQty", label: "Available Return Qty" },
        { key: "returnQty", label: "Return Qty" },
        { key: "unitCost", label: "Unit Cost" },
        { key: "lineTotal", label: "Line Total" },
        { key: "reason", label: "Reason" },
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
      editHref={document.status === "POSTED" || document.status === "CANCELLED" ? undefined : `/procurement/supplier-returns/${document.id}/edit`}
      approveEndpoint={document.status === "SUBMITTED" ? `/api/procurement/supplier-returns/${document.id}/approve` : undefined}
      rejectEndpoint={document.status === "SUBMITTED" ? `/api/procurement/supplier-returns/${document.id}/reject` : undefined}
      cancelEndpoint={document.status === "DRAFT" || document.status === "SUBMITTED" || document.status === "APPROVED" ? `/api/procurement/supplier-returns/${document.id}/cancel` : undefined}
      postEndpoint={document.status === "APPROVED" ? `/api/procurement/supplier-returns/${document.id}/post` : undefined}
      afterActionHref={`/procurement/supplier-returns/${document.id}`}
    />
  );
}
