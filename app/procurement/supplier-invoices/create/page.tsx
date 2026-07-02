import { getAccountsPayableReferenceData } from "@/app/procurement/_lib/ap-reference-data";
import { SupplierInvoiceEditor } from "@/features/procurement/ap-pages";

export default async function CreateSupplierInvoicePage(
  { searchParams }: { searchParams: Promise<{ poId?: string; grnId?: string }> },
) {
  const { poId, grnId } = await searchParams;
  const referenceData = await getAccountsPayableReferenceData({ poId, grnId });
  const prefillHeader = referenceData.invoicePrefill?.header;
  const prefillPoId = prefillHeader?.poId ?? poId ?? "";
  const prefillGrnId = prefillHeader && "grnId" in prefillHeader ? prefillHeader.grnId : grnId ?? "";
  const prefillRemarks =
    prefillHeader && "grnNo" in prefillHeader
      ? `Generated from ${String(prefillHeader.grnNo ?? "")}`
      : prefillHeader && "poNo" in prefillHeader
        ? `Generated from ${String(prefillHeader.poNo ?? "")}`
        : "";

  return (
    <SupplierInvoiceEditor
      title="Create Supplier Invoice"
      subtitle="Record supplier payables directly from approved PO lines or posted GRN receipts."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Invoices", href: "/procurement/supplier-invoices" },
        { label: "Create" },
      ]}
      apiBasePath="/api/procurement/supplier-invoices"
      cancelHref="/procurement/supplier-invoices"
      successHref="/procurement/supplier-invoices"
      suppliers={referenceData.suppliers}
      purchaseOrders={referenceData.purchaseOrders}
      goodsReceipts={referenceData.goodsReceipts}
      initialValue={{
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        supplierId: prefillHeader?.supplierId ?? "",
        poId: String(prefillPoId),
        grnId: String(prefillGrnId),
        supplierInvoiceNo: "",
        remarks: prefillRemarks,
        items: (referenceData.invoicePrefill?.items ?? []).map((item) => ({
          itemId: item.itemId,
          itemLabel: `${item.itemCode} - ${item.itemName}`,
          uomId: item.uomId ?? undefined,
          uomName: item.uomName ?? "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount,
          remarks: "",
        })),
      }}
    />
  );
}
