import {
  approveSupplierPayment,
  cancelSupplierPayment,
  createSupplierPayment,
  getSupplierPaymentById,
  listSupplierPayments,
  rejectSupplierPayment,
  updateSupplierPayment,
} from "@/services/procurement/supplier-payment.service";

export const listPayments = listSupplierPayments;
export const getPayment = getSupplierPaymentById;

export async function createPayment(body: Record<string, unknown>, userId: string) {
  return createSupplierPayment({
    paymentDate: String(body.paymentDate ?? new Date().toISOString()),
    supplierId: String(body.supplierId ?? ""),
    invoiceId: String(body.invoiceId ?? ""),
    paymentMethod: String(body.paymentMethod ?? "BANK"),
    bankAccountId: body.bankAccountId ? String(body.bankAccountId) : null,
    cashAccountId: body.cashAccountId ? String(body.cashAccountId) : null,
    referenceNo: String(body.referenceNo ?? ""),
    amount: Number(body.amount ?? 0),
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    createdById: userId,
  });
}

export async function updatePayment(id: string, body: Record<string, unknown>, userId: string) {
  return updateSupplierPayment(id, {
    paymentDate: String(body.paymentDate ?? new Date().toISOString()),
    supplierId: String(body.supplierId ?? ""),
    invoiceId: String(body.invoiceId ?? ""),
    paymentMethod: String(body.paymentMethod ?? "BANK"),
    bankAccountId: body.bankAccountId ? String(body.bankAccountId) : null,
    cashAccountId: body.cashAccountId ? String(body.cashAccountId) : null,
    referenceNo: String(body.referenceNo ?? ""),
    amount: Number(body.amount ?? 0),
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    createdById: userId,
  });
}

export const approvePayment = approveSupplierPayment;
export const rejectPayment = rejectSupplierPayment;
export const cancelPayment = cancelSupplierPayment;
