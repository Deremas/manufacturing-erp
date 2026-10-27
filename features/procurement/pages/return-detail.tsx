import { notFound } from "next/navigation";

import { ProcurementDocumentDetail } from "@/features/procurement/document-detail";
import { procurementEditUrl, procurementViewUrl } from "@/lib/procurement/routes";
import { getApprovalHistory } from "@/services/approval/approvalService";
import {
  getInventoryAuditTrail,
  getInventoryDocumentHistory,
} from "@/services/inventory/inventory-insights.service";
import { getSupplierReturnById } from "@/services/procurement/supplier-return.service";

export async function renderSupplierReturnDetail(documentKey: string) {
  const document = await getSupplierReturnById(documentKey);
  if (!document) {
    notFound();
  }

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getApprovalHistory("procurement.supplier-return", document.id),
    getInventoryDocumentHistory("procurement.supplier-return", document.id),
    getInventoryAuditTrail(document.id, "procurement.supplier-return"),
  ]);

  return (
    <ProcurementDocumentDetail
      recordKind="procurement.return"
      title={document.returnNo}
      subtitle=""
      listHref="/procurement/supplier-returns"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Returns", href: "/procurement/supplier-returns" },
        { label: document.returnNo },
      ]}
      status={document.status}
      informationTitle="Return Information"
      itemsTitle="Returned Items"
      summary={[
        {
          label: "Return Date",
          value: new Date(document.returnDate).toLocaleDateString("en-KE"),
        },
        { label: "Supplier", value: document.supplierName },
        {
          label: "GRN Reference",
          value: document.grnNo ?? "-",
          href:
            document.grnPublicId != null
              ? procurementViewUrl("grn", document.grnPublicId)
              : undefined,
        },
        { label: "Return Location", value: document.returnLocationName },
        { label: "Reason", value: document.reason },
        { label: "Remarks", value: document.remarks || "-" },
      ]}
      items={document.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uomName ?? "-",
        receivedQty: item.receivedQty,
        availableReturnQty: item.availableReturnQty,
        returnQty: item.returnQty,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
        reason: item.reason || "-",
      }))}
      itemColumns={[
        { key: "itemCode", label: "Item Code" },
        { key: "itemName", label: "Description" },
        { key: "uom", label: "UOM" },
        {
          key: "receivedQty",
          label: "Received Qty",
          align: "right",
          format: "qty",
        },
        {
          key: "availableReturnQty",
          label: "Available Return",
          align: "right",
          format: "qty",
        },
        {
          key: "returnQty",
          label: "Return Qty",
          align: "right",
          format: "qty",
        },
        {
          key: "unitCost",
          label: "Unit Cost",
          align: "right",
          format: "money",
        },
        {
          key: "lineTotal",
          label: "Line Total",
          align: "right",
          format: "money",
        },
        { key: "reason", label: "Reason" },
      ]}
      totals={[{ label: "Return Total", value: document.totalAmount }]}
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
      editHref={
        document.status === "POSTED" || document.status === "CANCELLED"
          ? undefined
          : procurementEditUrl("return", document.publicId)
      }
      submitEndpoint={
        document.status === "DRAFT" || document.status === "REJECTED"
          ? `/api/procurement/supplier-returns/${document.id}/submit`
          : undefined
      }
      approveEndpoint={
        document.status === "SUBMITTED"
          ? `/api/procurement/supplier-returns/${document.id}/approve`
          : undefined
      }
      rejectEndpoint={
        document.status === "SUBMITTED"
          ? `/api/procurement/supplier-returns/${document.id}/reject`
          : undefined
      }
      postEndpoint={
        document.status === "APPROVED"
          ? `/api/procurement/supplier-returns/${document.id}/post`
          : undefined
      }
      afterActionHref={procurementViewUrl("return", document.publicId)}
    />
  );
}
