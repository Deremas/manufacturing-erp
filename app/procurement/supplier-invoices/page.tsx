import type { Column } from "@/components/shared";
import { AccountsPayableListPage } from "@/features/procurement/ap-pages";
import { listSupplierInvoices } from "@/services/procurement/supplier-invoice.service";

function formatMoney(value: string | number) {
  return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SupplierInvoicesPage() {
  const invoices = await listSupplierInvoices();

  const columns: Column<Record<string, string | number>>[] = [
    { key: "invoiceNo", label: "Invoice No", sortable: true },
    { key: "supplierInvoiceNo", label: "Supplier Invoice No" },
    { key: "invoiceDate", label: "Date" },
    { key: "supplierName", label: "Supplier" },
    { key: "poNo", label: "PO Reference" },
    { key: "grnNo", label: "GRN Reference" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "amountPaid", label: "Amount Paid" },
    { key: "balanceDue", label: "Balance Due" },
    { key: "status", label: "Status" },
  ];

  return (
    <AccountsPayableListPage
      title="Supplier Invoices"
      subtitle="Track supplier liabilities from approved purchase orders and posted receipts."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Invoices" },
      ]}
      createHref="/procurement/supplier-invoices/create"
      baseHref="/procurement/supplier-invoices"
      columns={columns}
      rows={invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        supplierInvoiceNo: invoice.supplierInvoiceNo,
        invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString("en-KE"),
        supplierName: invoice.supplierName,
        poNo: invoice.poNo ?? "-",
        grnNo: invoice.grnNo ?? "-",
        totalAmount: formatMoney(invoice.totalAmount),
        amountPaid: formatMoney(invoice.amountPaid),
        balanceDue: formatMoney(invoice.balanceDue),
        status: invoice.status,
      }))}
    />
  );
}
