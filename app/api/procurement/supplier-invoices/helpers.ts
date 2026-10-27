import {
  approveSupplierInvoice,
  cancelSupplierInvoice,
  createSupplierInvoice,
  getSupplierInvoiceById,
  getSupplierInvoicePrefill,
  listSupplierInvoices,
  rejectSupplierInvoice,
  submitSupplierInvoice,
  updateSupplierInvoice,
} from "@/services/procurement/supplier-invoice.service";

export const listInvoices = listSupplierInvoices;
export const getInvoice = getSupplierInvoiceById;
export const getInvoicePrefill = getSupplierInvoicePrefill;

export async function createInvoice(body: Record<string, unknown>, userId: string) {
  return createSupplierInvoice({
    supplierInvoiceNo: String(body.supplierInvoiceNo ?? ""),
    invoiceDate: String(body.invoiceDate ?? new Date().toISOString()),
    dueDate: String(body.dueDate ?? ""),
    supplierId: String(body.supplierId ?? ""),
    poId: body.poId ? String(body.poId) : null,
    grnId: body.grnId ? String(body.grnId) : null,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    approverId: body.approverId ? String(body.approverId) : undefined,
    recordedById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function updateInvoice(id: string, body: Record<string, unknown>, userId: string) {
  return updateSupplierInvoice(id, {
    supplierInvoiceNo: String(body.supplierInvoiceNo ?? ""),
    invoiceDate: String(body.invoiceDate ?? new Date().toISOString()),
    dueDate: String(body.dueDate ?? ""),
    supplierId: String(body.supplierId ?? ""),
    poId: body.poId ? String(body.poId) : null,
    grnId: body.grnId ? String(body.grnId) : null,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    approverId: body.approverId ? String(body.approverId) : undefined,
    recordedById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export const approveInvoice = approveSupplierInvoice;
export const rejectInvoice = rejectSupplierInvoice;
export const submitInvoice = submitSupplierInvoice;
export const cancelInvoice = cancelSupplierInvoice;
