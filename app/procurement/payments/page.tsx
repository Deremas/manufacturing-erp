import type { Column } from "@/components/shared";
import { AccountsPayableListPage } from "@/features/procurement/ap-pages";
import { listSupplierPayments } from "@/services/procurement/supplier-payment.service";

function formatMoney(value: string | number) {
  return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SupplierPaymentsPage() {
  const payments = await listSupplierPayments();

  const columns: Column<Record<string, string | number>>[] = [
    { key: "paymentNo", label: "Payment No", sortable: true },
    { key: "paymentDate", label: "Date" },
    { key: "supplierName", label: "Supplier" },
    { key: "invoiceNo", label: "Invoice No" },
    { key: "paymentMethod", label: "Method" },
    { key: "bankAccountName", label: "Bank Account" },
    { key: "referenceNo", label: "Reference No" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  return (
    <AccountsPayableListPage
      title="Supplier Payments"
      subtitle="Apply and approve supplier settlements against live invoice balances."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Payments" },
      ]}
      createHref="/procurement/payments/create"
      baseHref="/procurement/payments"
      columns={columns}
      rows={payments.map((payment) => ({
        id: payment.id,
        paymentNo: payment.paymentNo,
        paymentDate: new Date(payment.paymentDate).toLocaleDateString("en-KE"),
        supplierName: payment.supplierName,
        invoiceNo: payment.invoiceNo,
        paymentMethod: payment.paymentMethod,
        bankAccountName: payment.bankAccountName ?? "-",
        referenceNo: payment.referenceNo || "-",
        amount: formatMoney(payment.amount),
        status: payment.status,
      }))}
    />
  );
}
