import { notFound } from "next/navigation";

import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { getApprovalHistory } from "@/services/approval/approvalService";
import { getInventoryAuditTrail, getInventoryDocumentHistory } from "@/services/inventory/inventory-insights.service";
import { getSupplierPaymentById } from "@/services/procurement/supplier-payment.service";

export default async function SupplierPaymentDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [payment, approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getSupplierPaymentById(id),
    getApprovalHistory("procurement.payment", id),
    getInventoryDocumentHistory("procurement.payment", id),
    getInventoryAuditTrail(id, "procurement.payment"),
  ]);

  if (!payment) {
    notFound();
  }

  return (
    <InventoryDocumentDetail
      title={payment.paymentNo}
      subtitle="Supplier payment detail"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Payments", href: "/procurement/payments" },
        { label: payment.paymentNo },
      ]}
      status={payment.status}
      summary={[
        { label: "Payment Date", value: new Date(payment.paymentDate).toLocaleDateString("en-KE") },
        { label: "Supplier", value: payment.supplierName },
        { label: "Invoice No", value: payment.invoiceNo },
        { label: "Method", value: payment.paymentMethod },
        { label: "Bank Account", value: payment.bankAccountName ?? "-" },
        { label: "Reference No", value: payment.referenceNo || "-" },
        { label: "Amount", value: payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: "Invoice Balance Before", value: payment.invoiceBalanceBefore.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: "Remarks", value: payment.remarks || "-" },
      ]}
      items={[{
        paymentNo: payment.paymentNo,
        invoiceNo: payment.invoiceNo,
        amount: payment.amount,
        method: payment.paymentMethod,
        referenceNo: payment.referenceNo || "-",
      }]}
      itemColumns={[
        { key: "paymentNo", label: "Payment No" },
        { key: "invoiceNo", label: "Invoice No" },
        { key: "amount", label: "Amount" },
        { key: "method", label: "Method" },
        { key: "referenceNo", label: "Reference No" },
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
      editHref={payment.status === "APPROVED" || payment.status === "CANCELLED" ? undefined : `/procurement/payments/${payment.id}/edit`}
      approveEndpoint={payment.status === "SUBMITTED" ? `/api/procurement/payments/${payment.id}/approve` : undefined}
      rejectEndpoint={payment.status === "SUBMITTED" ? `/api/procurement/payments/${payment.id}/reject` : undefined}
      cancelEndpoint={payment.status === "DRAFT" || payment.status === "SUBMITTED" ? `/api/procurement/payments/${payment.id}/cancel` : undefined}
      afterActionHref={`/procurement/payments/${payment.id}`}
    />
  );
}
