import { notFound } from "next/navigation";

import { ProcurementDocumentDetail } from "@/features/procurement/document-detail";
import {
  procurementCreateUrl,
  procurementEditUrl,
  procurementGrnRegisterAssetsUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { getApprovalHistory } from "@/services/approval/approvalService";
import {
  getInventoryAuditTrail,
  getInventoryDocumentHistory,
} from "@/services/inventory/inventory-insights.service";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";

export async function renderGoodsReceiptDetail(documentKey: string) {
  const receipt = await getGoodsReceiptById(documentKey);
  if (!receipt) {
    notFound();
  }

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getApprovalHistory("procurement.grn", receipt.id),
    getInventoryDocumentHistory("procurement.grn", receipt.id),
    getInventoryAuditTrail(receipt.id, "procurement.grn"),
  ]);

  const posted = receipt.status === "POSTED";
  const hasAssets = receipt.items.some((item) => item.receiptType === "ASSET");

  return (
    <ProcurementDocumentDetail
      recordKind="procurement.grn"
      title={receipt.grnNo}
      subtitle=""
      listHref="/procurement/grn"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Goods Receipts / GRN", href: "/procurement/grn" },
        { label: receipt.grnNo },
      ]}
      status={receipt.status}
      informationTitle="Receipt Information"
      itemsTitle="Received Items"
      summary={[
        { label: "GRN Number", value: receipt.grnNo },
        {
          label: "Date",
          value: new Date(receipt.grnDate).toLocaleDateString("en-KE"),
        },
        {
          label: "PO Reference",
          value: receipt.poNo ?? "-",
          href:
            receipt.poPublicId != null
              ? procurementViewUrl("po", receipt.poPublicId)
              : undefined,
        },
        { label: "Supplier", value: receipt.supplierName },
        { label: "Receiving Location", value: receipt.locationName },
        { label: "Received By", value: receipt.receivedByName ?? "-" },
        { label: "Delivery Note", value: receipt.deliveryNoteNo || "-" },
        {
          label: "Supplier Invoice No",
          value: receipt.supplierInvoiceNo || "-",
        },
        { label: "Vehicle Plate", value: receipt.vehiclePlate || "-" },
        { label: "Delivered By", value: receipt.deliveredBy || "-" },
        { label: "Remarks", value: receipt.remarks || "-" },
      ]}
      items={receipt.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        receiptType:
          item.receiptType === "ASSET"
            ? "Asset"
            : item.receiptType === "SERVICE"
              ? "Service"
              : "Inventory",
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
        { key: "itemCode", label: "Item Code" },
        { key: "itemName", label: "Description" },
        { key: "receiptType", label: "Type" },
        { key: "uom", label: "UOM" },
        { key: "orderedQty", label: "Ordered", align: "right", format: "qty" },
        {
          key: "previouslyReceivedQty",
          label: "Prev. Received",
          align: "right",
          format: "qty",
        },
        {
          key: "receivedQty",
          label: "Received",
          align: "right",
          format: "qty",
        },
        {
          key: "acceptedQty",
          label: "Accepted",
          align: "right",
          format: "qty",
        },
        {
          key: "rejectedQty",
          label: "Rejected",
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
      ]}
      totals={[
        { label: "Subtotal", value: receipt.subtotal },
        { label: "Tax", value: receipt.taxAmount },
        { label: "Grand Total", value: receipt.totalAmount },
      ]}
      relatedActions={[
        ...(posted
          ? [
              {
                label: "Create Invoice",
                href: procurementCreateUrl("invoice", {
                  grnPublicId: receipt.publicId,
                }),
                variant: "primary" as const,
              },
            ]
          : []),
        ...(posted
          ? [
              {
                label: "Create Return",
                href: procurementCreateUrl("return", {
                  grnPublicId: receipt.publicId,
                }),
              },
            ]
          : []),
        ...(posted && hasAssets
          ? [
              {
                label: "Register Assets",
                href: procurementGrnRegisterAssetsUrl(receipt.publicId),
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
        receipt.status === "POSTED" || receipt.status === "CANCELLED"
          ? undefined
          : procurementEditUrl("grn", receipt.publicId)
      }
      submitEndpoint={
        receipt.status === "DRAFT" || receipt.status === "REJECTED"
          ? `/api/procurement/grn/${receipt.id}/submit`
          : undefined
      }
      approveEndpoint={
        receipt.status === "SUBMITTED"
          ? `/api/procurement/grn/${receipt.id}/approve`
          : undefined
      }
      rejectEndpoint={
        receipt.status === "SUBMITTED"
          ? `/api/procurement/grn/${receipt.id}/reject`
          : undefined
      }
      postEndpoint={
        receipt.status === "APPROVED"
          ? `/api/procurement/grn/${receipt.id}/post`
          : undefined
      }
      afterActionHref={procurementViewUrl("grn", receipt.publicId)}
    />
  );
}
