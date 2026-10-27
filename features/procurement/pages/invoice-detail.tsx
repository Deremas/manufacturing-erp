import { notFound } from "next/navigation";

import { ProcurementDocumentDetail } from "@/features/procurement/document-detail";
import {
  procurementCreateUrl,
  procurementEditUrl,
  procurementPrintUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { getApprovalHistory } from "@/services/approval/approvalService";
import {
  getInventoryAuditTrail,
  getInventoryDocumentHistory,
} from "@/services/inventory/inventory-insights.service";
import { getSupplierInvoiceById } from "@/services/procurement/supplier-invoice.service";

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function renderSupplierInvoiceDetail(documentKey: string) {
  const invoice = await getSupplierInvoiceById(documentKey);
  if (!invoice) {
    notFound();
  }

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getApprovalHistory("procurement.invoice", invoice.id),
    getInventoryDocumentHistory("procurement.invoice", invoice.id),
    getInventoryAuditTrail(invoice.id, "procurement.invoice"),
  ]);

  const canPay =
    ["APPROVED", "PARTIAL_PAID", "POSTED"].includes(invoice.status) &&
    invoice.balanceDue > 0;
  const taxTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.taxAmount ?? 0),
    0,
  );

  return (
    <ProcurementDocumentDetail
      recordKind="procurement.invoice"
      title={invoice.invoiceNo}
      subtitle=""
      listHref="/procurement/supplier-invoices"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Invoices", href: "/procurement/supplier-invoices" },
        { label: invoice.invoiceNo },
      ]}
      status={invoice.status}
      informationTitle="Invoice Information"
      itemsTitle="Invoice Items"
      summary={[
        {
          label: "Invoice Date",
          value: new Date(invoice.invoiceDate).toLocaleDateString("en-KE"),
        },
        { label: "Supplier", value: invoice.supplierName },
        {
          label: "Supplier Invoice No",
          value: invoice.supplierInvoiceNo || "-",
        },
        {
          label: "PO Reference",
          value: invoice.poNo ?? "-",
          href:
            invoice.poPublicId != null
              ? procurementViewUrl("po", invoice.poPublicId)
              : undefined,
        },
        {
          label: "GRN Reference",
          value: invoice.grnNo ?? "-",
          href:
            invoice.grnPublicId != null
              ? procurementViewUrl("grn", invoice.grnPublicId)
              : undefined,
        },
        {
          label: "Due Date",
          value: invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString("en-KE")
            : "-",
        },
        { label: "Total Amount", value: money(invoice.totalAmount) },
        { label: "Amount Paid", value: money(invoice.amountPaid) },
        { label: "Balance Due", value: money(invoice.balanceDue) },
        { label: "Remarks", value: invoice.remarks || "-" },
      ]}
      items={invoice.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uomName ?? "-",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "itemCode", label: "Item Code" },
        { key: "itemName", label: "Description" },
        { key: "uom", label: "UOM" },
        { key: "quantity", label: "Quantity", align: "right", format: "qty" },
        {
          key: "unitPrice",
          label: "Unit Price",
          align: "right",
          format: "money",
        },
        {
          key: "taxAmount",
          label: "Tax Amount",
          align: "right",
          format: "money",
        },
        {
          key: "lineTotal",
          label: "Line Total",
          align: "right",
          format: "money",
        },
        { key: "remarks", label: "Remarks" },
      ]}
      totals={[
        { label: "Tax", value: taxTotal },
        { label: "Grand Total", value: invoice.totalAmount },
        { label: "Amount Paid", value: invoice.amountPaid },
        { label: "Balance Due", value: invoice.balanceDue },
      ]}
      relatedActions={
        canPay
          ? [
              {
                label: "Record Payment",
                href: procurementCreateUrl("payment", {
                  invoicePublicId: invoice.publicId,
                }),
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
        invoice.status === "PAID" || invoice.status === "CANCELLED"
          ? undefined
          : procurementEditUrl("invoice", invoice.publicId)
      }
      printHref={procurementPrintUrl("invoice", invoice.publicId)}
      submitEndpoint={
        invoice.status === "DRAFT" || invoice.status === "REJECTED"
          ? `/api/procurement/supplier-invoices/${invoice.id}/submit`
          : undefined
      }
      approveEndpoint={
        invoice.status === "SUBMITTED"
          ? `/api/procurement/supplier-invoices/${invoice.id}/approve`
          : undefined
      }
      rejectEndpoint={
        invoice.status === "SUBMITTED"
          ? `/api/procurement/supplier-invoices/${invoice.id}/reject`
          : undefined
      }
      afterActionHref={procurementViewUrl("invoice", invoice.publicId)}
    />
  );
}
