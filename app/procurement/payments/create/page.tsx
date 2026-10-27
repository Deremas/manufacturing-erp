import { getAccountsPayableReferenceData } from "@/app/procurement/_lib/ap-reference-data";
import { SupplierPaymentEditor } from "@/features/procurement/ap-pages";

export default async function CreateSupplierPaymentPage(
  { searchParams }: { searchParams: Promise<{ invoicePublicId?: string }> },
) {
  const { invoicePublicId } = await searchParams;
  const referenceData = await getAccountsPayableReferenceData({ invoicePublicId });

  return (
    <SupplierPaymentEditor
      title="Create Supplier Payment"
      subtitle="Apply a supplier payment against a live invoice balance from the database."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Payments", href: "/procurement/payments" },
        { label: "Create" },
      ]}
      apiBasePath="/api/procurement/payments"
      cancelHref="/procurement/payments"
      successHref="/procurement/payments"
      suppliers={referenceData.suppliers}
      invoices={referenceData.invoices}
      bankAccounts={referenceData.bankAccounts}
      initialValue={{
        paymentDate: new Date().toISOString().slice(0, 10),
        supplierId: referenceData.selectedInvoice?.supplierId ?? "",
        invoiceId: referenceData.selectedInvoice?.id ?? "",
        paymentMethod: "BANK",
        bankAccountId: "",
        referenceNo: "",
        amount: referenceData.selectedInvoice?.balanceDue ?? 0,
        remarks: referenceData.selectedInvoice ? `Settlement for ${referenceData.selectedInvoice.invoiceNo}` : "",
      }}
    />
  );
}
