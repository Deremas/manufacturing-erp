import { notFound } from "next/navigation";

import { ProcurementDocumentDetail } from "@/features/procurement/document-detail";
import {
  procurementEditUrl,
  procurementPrintUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { getApprovalHistory } from "@/services/approval/approvalService";
import {
  getInventoryAuditTrail,
  getInventoryDocumentHistory,
} from "@/services/inventory/inventory-insights.service";
import { getSupplierPaymentById } from "@/services/procurement/supplier-payment.service";

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function renderSupplierPaymentDetail(documentKey: string) {
  const payment = await getSupplierPaymentById(documentKey);
  if (!payment) {
    notFound();
  }

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getApprovalHistory("procurement.payment", payment.id),
    getInventoryDocumentHistory("procurement.payment", payment.id),
    getInventoryAuditTrail(payment.id, "procurement.payment"),
  ]);

  const invoiceHref =
    payment.invoicePublicId != null
      ? procurementViewUrl("invoice", payment.invoicePublicId)
      : undefined;

  return (
    <ProcurementDocumentDetail
      recordKind="procurement.payment"
      title={payment.paymentNo}
      subtitle=""
      listHref="/procurement/payments"
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Payments", href: "/procurement/payments" },
        { label: payment.paymentNo },
      ]}
      status={payment.status}
      informationTitle="Payment Information"
      itemsTitle="Payment Lines"
      summary={[
        {
          label: "Payment Date",
          value: new Date(payment.paymentDate).toLocaleDateString("en-KE"),
        },
        { label: "Supplier", value: payment.supplierName },
        {
          label: "Invoice No",
          value: payment.invoiceNo,
          href: invoiceHref,
        },
        { label: "Method", value: payment.paymentMethod },
        { label: "Bank Account", value: payment.bankAccountName ?? "-" },
        { label: "Reference No", value: payment.referenceNo || "-" },
        { label: "Amount", value: money(payment.amount) },
        {
          label: "Invoice Balance Before",
          value: money(payment.invoiceBalanceBefore),
        },
        { label: "Remarks", value: payment.remarks || "-" },
      ]}
      items={[
        {
          paymentNo: payment.paymentNo,
          invoiceNo: payment.invoiceNo,
          amount: payment.amount,
          method: payment.paymentMethod,
          referenceNo: payment.referenceNo || "-",
        },
      ]}
      itemColumns={[
        { key: "paymentNo", label: "Payment No" },
        { key: "invoiceNo", label: "Invoice No" },
        { key: "method", label: "Method" },
        { key: "referenceNo", label: "Reference No" },
        { key: "amount", label: "Amount", align: "right", format: "money" },
      ]}
      totals={[{ label: "Payment Amount", value: payment.amount }]}
      relatedDocuments={
        payment.invoicePublicId != null
          ? [
              {
                label: `Invoice ${payment.invoiceNo}`,
                href: procurementViewUrl("invoice", payment.invoicePublicId),
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
        payment.status === "APPROVED" || payment.status === "CANCELLED"
          ? undefined
          : procurementEditUrl("payment", payment.publicId)
      }
      printHref={procurementPrintUrl("payment", payment.publicId)}
      submitEndpoint={
        payment.status === "DRAFT" || payment.status === "REJECTED"
          ? `/api/procurement/payments/${payment.id}/submit`
          : undefined
      }
      approveEndpoint={
        payment.status === "SUBMITTED"
          ? `/api/procurement/payments/${payment.id}/approve`
          : undefined
      }
      rejectEndpoint={
        payment.status === "SUBMITTED"
          ? `/api/procurement/payments/${payment.id}/reject`
          : undefined
      }
      afterActionHref={procurementViewUrl("payment", payment.publicId)}
    />
  );
}
