import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";
import { listGoodsReceipts } from "@/services/procurement/grn.service";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";
import { listPurchaseOrders } from "@/services/procurement/purchase-order.service";
import { getSupplierInvoiceById, getSupplierInvoicePrefill, listSupplierInvoices } from "@/services/procurement/supplier-invoice.service";

export async function getAccountsPayableReferenceData(input?: {
  poPublicId?: string;
  grnPublicId?: string;
  invoicePublicId?: string;
}) {
  const [linkedPo, linkedGrn, linkedInvoice] = await Promise.all([
    input?.poPublicId ? getPurchaseOrderById(input.poPublicId) : Promise.resolve(null),
    input?.grnPublicId ? getGoodsReceiptById(input.grnPublicId) : Promise.resolve(null),
    input?.invoicePublicId ? getSupplierInvoiceById(input.invoicePublicId) : Promise.resolve(null),
  ]);

  const poId = linkedPo?.id;
  const grnId = linkedGrn?.id;
  const invoiceId = linkedInvoice?.id;

  const [referenceData, purchaseOrders, goodsReceipts, invoices, invoicePrefill] = await Promise.all([
    getProcurementReferenceData(),
    listPurchaseOrders(),
    listGoodsReceipts(),
    listSupplierInvoices(),
    poId || grnId
      ? getSupplierInvoicePrefill({ poId, grnId })
      : Promise.resolve(null),
  ]);

  const paymentInvoices = invoices.filter((invoice) => {
    if (invoiceId && invoice.id === invoiceId) {
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
      invoiceId
        ? paymentInvoices.find((invoice) => invoice.id === invoiceId) ?? invoices.find((invoice) => invoice.id === invoiceId) ?? null
        : null,
  };
}
