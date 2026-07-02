import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { listGoodsReceipts } from "@/services/procurement/grn.service";
import { listPurchaseOrders } from "@/services/procurement/purchase-order.service";
import { getSupplierInvoicePrefill, listSupplierInvoices } from "@/services/procurement/supplier-invoice.service";

export async function getAccountsPayableReferenceData(input?: {
  poId?: string;
  grnId?: string;
  invoiceId?: string;
}) {
  const [referenceData, purchaseOrders, goodsReceipts, invoices, invoicePrefill] = await Promise.all([
    getProcurementReferenceData(),
    listPurchaseOrders(),
    listGoodsReceipts(),
    listSupplierInvoices(),
    input?.poId || input?.grnId
      ? getSupplierInvoicePrefill({ poId: input?.poId, grnId: input?.grnId })
      : Promise.resolve(null),
  ]);

  const paymentInvoices = invoices.filter((invoice) => {
    if (input?.invoiceId && invoice.id === input.invoiceId) {
      return true;
    }
    return invoice.status !== "PAID" && invoice.status !== "CANCELLED" && Number(invoice.balanceDue ?? 0) > 0;
  });

  return {
    ...referenceData,
    purchaseOrders: purchaseOrders
      .filter((order) => ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(order.status))
      .map((order) => ({
        value: order.id,
        label: `${order.poNo} - ${order.supplierName}`,
      })),
    goodsReceipts: goodsReceipts
      .filter((receipt) => receipt.status === "POSTED")
      .map((receipt) => ({
        value: receipt.id,
        label: `${receipt.grnNo} - ${receipt.supplierName}`,
      })),
    invoices: paymentInvoices.map((invoice) => ({
      value: invoice.id,
      label: `${invoice.invoiceNo} - ${invoice.supplierName}`,
      supplierId: invoice.supplierId,
      balanceDue: invoice.balanceDue,
    })),
    invoicePrefill,
    selectedInvoice:
      input?.invoiceId
        ? paymentInvoices.find((invoice) => invoice.id === input.invoiceId) ?? invoices.find((invoice) => invoice.id === input.invoiceId) ?? null
        : null,
  };
}
