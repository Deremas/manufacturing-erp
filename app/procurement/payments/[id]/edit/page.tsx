import { notFound } from "next/navigation";

import { getAccountsPayableReferenceData } from "@/app/procurement/_lib/ap-reference-data";
import { SupplierPaymentEditor } from "@/features/procurement/ap-pages";
import { getSupplierPaymentById } from "@/services/procurement/supplier-payment.service";

export default async function EditSupplierPaymentPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [payment, referenceData] = await Promise.all([
    getSupplierPaymentById(id),
    getAccountsPayableReferenceData(),
  ]);

  if (!payment) {
    notFound();
  }

  return (
    <SupplierPaymentEditor
      documentId={payment.id}
      title={`Edit ${payment.paymentNo}`}
      subtitle="Update the supplier payment before it is approved and applied to invoice balances."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Payments", href: "/procurement/payments" },
        { label: payment.paymentNo, href: `/procurement/payments/${payment.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/payments"
      cancelHref={`/procurement/payments/${payment.id}`}
      successHref="/procurement/payments"
      canEdit={payment.status !== "APPROVED" && payment.status !== "CANCELLED"}
      suppliers={referenceData.suppliers}
      invoices={referenceData.invoices}
      bankAccounts={referenceData.bankAccounts}
      initialValue={{
        paymentDate: payment.paymentDate.slice(0, 10),
        supplierId: payment.supplierId,
        invoiceId: payment.invoiceId,
        paymentMethod: payment.paymentMethod,
        bankAccountId: payment.bankAccountId ?? "",
        referenceNo: payment.referenceNo,
        amount: payment.amount,
        remarks: payment.remarks,
      }}
    />
  );
}
