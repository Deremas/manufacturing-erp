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
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";

export async function renderPurchaseOrderDetail(documentKey: string) {
  const order = await getPurchaseOrderById(documentKey);
  if (!order) {
    notFound();
  }

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getApprovalHistory("procurement.po", order.id),
    getInventoryDocumentHistory("procurement.po", order.id),
    getInventoryAuditTrail(order.id, "procurement.po"),
  ]);

  const canReceive =
    order.status === "APPROVED" || order.status === "PARTIALLY_RECEIVED";
  const canInvoice = ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "POSTED"].includes(
    order.status,
  );
  const subtotal = Number(order.subtotal ?? 0);
  const taxTotal = Number(order.taxAmount ?? 0);
  const vatRate = order.items[0]?.taxRate ?? 0;

  return (
    <ProcurementDocumentDetail
      recordKind="procurement.po"
      title={order.poNo}
      subtitle=""
      listHref="/procurement/purchase-orders"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Orders", href: "/procurement/purchase-orders" },
        { label: order.poNo },
      ]}
      status={order.status}
      informationTitle="Purchase Order Information"
      itemsTitle="Order Items"
      summary={[
        { label: "PO Number", value: order.poNo },
        {
          label: "Date",
          value: new Date(order.poDate).toLocaleDateString("en-KE"),
        },
        { label: "Supplier", value: order.supplierName },
        { label: "Receiving Location", value: order.deliveryLocationName },
        {
          label: "PR Reference",
          value: order.requisitionNo ?? "-",
          href:
            order.prPublicId != null
              ? procurementViewUrl("pr", order.prPublicId)
              : undefined,
        },
        {
          label: "Expected Delivery",
          value: order.expectedDeliveryDate
            ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-KE")
            : "-",
        },
        { label: "Payment Terms", value: order.paymentTerms || "-" },
        {
          label: "Purchase Type",
          value: order.requestType.replaceAll("_", " "),
        },
        { label: "Remarks", value: order.remarks || "-" },
      ]}
      items={order.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uomName ?? "-",
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
        returnedQty: item.returnedQty,
        unitPrice: item.unitPrice,
        vat: `${item.taxRate}%`,
        lineTotal: item.lineTotal,
      }))}
      itemColumns={[
        { key: "itemCode", label: "Item Code" },
        { key: "itemName", label: "Description" },
        { key: "uom", label: "UOM" },
        {
          key: "orderedQty",
          label: "Ordered Qty",
          align: "right",
          format: "qty",
        },
        {
          key: "receivedQty",
          label: "Received Qty",
          align: "right",
          format: "qty",
        },
        {
          key: "returnedQty",
          label: "Returned Qty",
          align: "right",
          format: "qty",
        },
        {
          key: "unitPrice",
          label: "Unit Price",
          align: "right",
          format: "money",
        },
        { key: "vat", label: "VAT", align: "right" },
        {
          key: "lineTotal",
          label: "Line Total",
          align: "right",
          format: "money",
        },
      ]}
      totals={[
        { label: "Subtotal", value: subtotal },
        { label: `VAT (${vatRate}%)`, value: taxTotal },
        { label: "Total Amount", value: order.totalAmount },
      ]}
      relatedDocuments={order.relatedGrns.map((receipt) => ({
        label: receipt.grnNo,
        href: procurementViewUrl("grn", receipt.publicId),
        status: receipt.status,
      }))}
      relatedActions={[
        ...(canReceive
          ? [
              {
                label: "Create GRN",
                href: procurementCreateUrl("grn", { poPublicId: order.publicId }),
                variant: "primary" as const,
              },
            ]
          : []),
        ...(canInvoice
          ? [
              {
                label: "Create Invoice",
                href: procurementCreateUrl("invoice", { poPublicId: order.publicId }),
              },
            ]
          : []),
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
      editHref={
        order.status === "RECEIVED" ||
        order.status === "POSTED" ||
        order.status === "CANCELLED"
          ? undefined
          : procurementEditUrl("po", order.publicId)
      }
      submitEndpoint={
        order.status === "DRAFT" || order.status === "REJECTED"
          ? `/api/procurement/purchase-orders/${order.id}/submit`
          : undefined
      }
      approveEndpoint={
        order.status === "SUBMITTED"
          ? `/api/procurement/purchase-orders/${order.id}/approve`
          : undefined
      }
      rejectEndpoint={
        order.status === "SUBMITTED"
          ? `/api/procurement/purchase-orders/${order.id}/reject`
          : undefined
      }
      afterActionHref={procurementViewUrl("po", order.publicId)}
    />
  );
}
