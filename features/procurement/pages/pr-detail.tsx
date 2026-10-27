import { notFound } from "next/navigation";

import { ProcurementDocumentDetail } from "@/features/procurement/document-detail";
import {
  procurementCreateUrl,
  procurementEditUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { getApprovalHistory } from "@/services/approval/approvalService";
import {
  getInventoryAuditTrail,
  getInventoryDocumentHistory,
} from "@/services/inventory/inventory-insights.service";
import { getPurchaseRequisitionById } from "@/services/procurement/requisition.service";

export async function renderPurchaseRequisitionDetail(documentKey: string) {
  const requisition = await getPurchaseRequisitionById(documentKey);
  if (!requisition) {
    notFound();
  }

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getApprovalHistory("procurement.pr", requisition.id),
    getInventoryDocumentHistory("procurement.pr", requisition.id),
    getInventoryAuditTrail(requisition.id, "procurement.pr"),
  ]);

  const canConvert =
    requisition.status === "APPROVED" ||
    requisition.status === "PARTIALLY_CONVERTED";

  return (
    <ProcurementDocumentDetail
      recordKind="procurement.pr"
      title={requisition.requisitionNo}
      subtitle=""
      listHref="/procurement/requisitions"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Requisitions", href: "/procurement/requisitions" },
        { label: requisition.requisitionNo },
      ]}
      status={requisition.status}
      informationTitle="Requisition Information"
      itemsTitle="Requested Items"
      summary={[
        { label: "PR Number", value: requisition.requisitionNo },
        {
          label: "Date",
          value: new Date(requisition.requisitionDate).toLocaleDateString(
            "en-KE",
          ),
        },
        { label: "Department", value: requisition.departmentName || "-" },
        { label: "Requested By", value: requisition.requestedByName },
        { label: "Receiving Location", value: requisition.locationName },
        {
          label: "Needed By",
          value: requisition.neededByDate
            ? new Date(requisition.neededByDate).toLocaleDateString("en-KE")
            : "-",
        },
      ]}
      items={requisition.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uomName ?? "-",
        requestedQty: item.requestedQty,
        approvedQty: item.approvedQty,
        estimatedUnitPrice: item.estimatedUnitPrice,
        estimatedTotal: item.estimatedTotal,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "itemCode", label: "Item Code" },
        { key: "itemName", label: "Item Name" },
        {
          key: "requestedQty",
          label: "Quantity",
          align: "right",
          format: "qty",
        },
        { key: "uom", label: "UOM" },
        {
          key: "estimatedUnitPrice",
          label: "Est. Price",
          align: "right",
          format: "money",
        },
        {
          key: "estimatedTotal",
          label: "Line Total",
          align: "right",
          format: "money",
        },
        { key: "remarks", label: "Remarks" },
      ]}
      totals={[
        { label: "Total Estimated Value", value: requisition.estimatedTotal },
      ]}
      relatedDocuments={requisition.relatedPurchaseOrders.map((order) => ({
        label: `${order.poNo} — ${order.supplierName}`,
        href: procurementViewUrl("po", order.publicId),
        status: order.status,
      }))}
      relatedActions={
        canConvert
          ? [
              {
                label: "Create Purchase Order",
                href: procurementCreateUrl("po", { prPublicId: requisition.publicId }),
                variant: "primary",
              },
            ]
          : []
      }
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
        requisition.status === "CONVERTED" || requisition.status === "CANCELLED"
          ? undefined
          : procurementEditUrl("pr", requisition.publicId)
      }
      submitEndpoint={
        requisition.status === "DRAFT" || requisition.status === "REJECTED"
          ? `/api/procurement/requisitions/${requisition.id}/submit`
          : undefined
      }
      approveEndpoint={
        requisition.status === "SUBMITTED"
          ? `/api/procurement/requisitions/${requisition.id}/approve`
          : undefined
      }
      rejectEndpoint={
        requisition.status === "SUBMITTED"
          ? `/api/procurement/requisitions/${requisition.id}/reject`
          : undefined
      }
      afterActionHref={procurementViewUrl("pr", requisition.publicId)}
    />
  );
}
