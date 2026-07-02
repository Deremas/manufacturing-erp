import {
  approveSupplierReturn,
  cancelSupplierReturn,
  createSupplierReturn,
  getSupplierReturnById,
  getSupplierReturnPrefillFromReceipt,
  listSupplierReturns,
  postSupplierReturn,
  rejectSupplierReturn,
  updateSupplierReturn,
} from "@/services/procurement/supplier-return.service";

export async function listReturns() {
  return listSupplierReturns();
}

export async function getReturn(id: string) {
  return getSupplierReturnById(id);
}

export async function getReturnPrefill(grnId: string) {
  return getSupplierReturnPrefillFromReceipt(grnId);
}

export async function createReturn(body: Record<string, unknown>, userId: string) {
  return createSupplierReturn({
    returnDate: String(body.returnDate ?? new Date().toISOString()),
    supplierId: String(body.supplierId ?? ""),
    grnId: body.grnId ? String(body.grnId) : null,
    returnLocationId: String(body.returnLocationId ?? ""),
    reason: String(body.reason ?? ""),
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function updateReturn(id: string, body: Record<string, unknown>, userId: string) {
  return updateSupplierReturn(id, {
    returnDate: String(body.returnDate ?? new Date().toISOString()),
    supplierId: String(body.supplierId ?? ""),
    grnId: body.grnId ? String(body.grnId) : null,
    returnLocationId: String(body.returnLocationId ?? ""),
    reason: String(body.reason ?? ""),
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    updatedById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function approveReturn(id: string, userId: string) {
  return approveSupplierReturn(id, userId);
}

export async function rejectReturn(id: string, userId: string) {
  return rejectSupplierReturn(id, userId);
}

export async function cancelReturn(id: string, userId: string) {
  return cancelSupplierReturn(id, userId);
}

export async function postReturn(id: string, userId: string) {
  return postSupplierReturn(id, userId);
}
