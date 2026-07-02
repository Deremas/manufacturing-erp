import { notFound } from "next/navigation";

import { getAccountsPayableReferenceData } from "@/app/procurement/_lib/ap-reference-data";
import { SupplierInvoiceEditor } from "@/features/procurement/ap-pages";
import { getSupplierInvoiceById } from "@/services/procurement/supplier-invoice.service";

export default async function EditSupplierInvoicePage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [invoice, referenceData] = await Promise.all([
    getSupplierInvoiceById(id),
    getAccountsPayableReferenceData(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <SupplierInvoiceEditor
      documentId={invoice.id}
      title={`Edit ${invoice.invoiceNo}`}
      subtitle="Update the supplier invoice before it is fully approved and settled."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Invoices", href: "/procurement/supplier-invoices" },
        { label: invoice.invoiceNo, href: `/procurement/supplier-invoices/${invoice.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/supplier-invoices"
      cancelHref={`/procurement/supplier-invoices/${invoice.id}`}
      successHref="/procurement/supplier-invoices"
      canEdit={invoice.status !== "PAID" && invoice.status !== "CANCELLED"}
      suppliers={referenceData.suppliers}
      purchaseOrders={referenceData.purchaseOrders}
      goodsReceipts={referenceData.goodsReceipts}
      initialValue={{
        invoiceDate: invoice.invoiceDate.slice(0, 10),
        dueDate: invoice.dueDate?.slice(0, 10) ?? "",
        supplierId: invoice.supplierId,
        poId: invoice.poId ?? "",
        grnId: invoice.grnId ?? "",
        supplierInvoiceNo: invoice.supplierInvoiceNo,
        remarks: invoice.remarks,
        items: invoice.items.map((item) => ({
          itemId: item.itemId,
          itemLabel: `${item.itemCode} - ${item.itemName}`,
          uomId: item.uomId ?? undefined,
          uomName: item.uomName ?? "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount,
          remarks: item.remarks,
        })),
      }}
    />
  );
}
