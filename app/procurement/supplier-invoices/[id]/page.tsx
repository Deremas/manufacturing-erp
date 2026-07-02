import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getApprovalHistory } from "@/services/approval/approvalService";
import { getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getSupplierInvoiceById } from "@/services/procurement/supplier-invoice.service";

export default async function SupplierInvoiceDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [invoice, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getSupplierInvoiceById(id),
    getApprovalHistory("procurement.invoice", id),
    getInventoryDocumentHistory("procurement.invoice", id),
    getInventoryAuditTrail(id, "procurement.invoice"),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <InventoryDocumentDetail
      title={invoice.invoiceNo}
      subtitle="Supplier invoice detail"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Invoices", href: "/procurement/supplier-invoices" },
        { label: invoice.invoiceNo },
      ]}
      status={invoice.status}
      summary={[
        { label: "Invoice Date", value: new Date(invoice.invoiceDate).toLocaleDateString("en-KE") },
        { label: "Supplier", value: invoice.supplierName },
        { label: "Supplier Invoice No", value: invoice.supplierInvoiceNo || "-" },
        { label: "PO Reference", value: invoice.poNo ?? "-" },
        { label: "GRN Reference", value: invoice.grnNo ?? "-" },
        { label: "Due Date", value: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-KE") : "-" },
        { label: "Total Amount", value: invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: "Amount Paid", value: invoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: "Balance Due", value: invoice.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: "Remarks", value: invoice.remarks || "-" },
      ]}
      items={invoice.items.map((item) => ({
        item: `${item.itemCode} - ${item.itemName}`,
        uom: item.uomName ?? "-",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        { key: "item", label: "Item" },
        { key: "uom", label: "UOM" },
        { key: "quantity", label: "Quantity" },
        { key: "unitPrice", label: "Unit Price" },
        { key: "taxAmount", label: "Tax Amount" },
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
      editHref={invoice.status === "PAID" || invoice.status === "CANCELLED" ? undefined : `/procurement/supplier-invoices/${invoice.id}/edit`}
      approveEndpoint={invoice.status === "SUBMITTED" ? `/api/procurement/supplier-invoices/${invoice.id}/approve` : undefined}
      rejectEndpoint={invoice.status === "SUBMITTED" ? `/api/procurement/supplier-invoices/${invoice.id}/reject` : undefined}
      cancelEndpoint={invoice.status === "DRAFT" || invoice.status === "SUBMITTED" || invoice.status === "APPROVED" ? `/api/procurement/supplier-invoices/${invoice.id}/cancel` : undefined}
      afterActionHref={`/procurement/supplier-invoices/${invoice.id}`}
    />
  );
}
