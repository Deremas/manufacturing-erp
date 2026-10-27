import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrderPrefillFromRequisition,
  listPurchaseOrders,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from "@/services/procurement/purchase-order.service";

export async function listOrders() {
  return listPurchaseOrders();
}

export async function getOrder(id: string) {
  return getPurchaseOrderById(id);
}

export async function getOrderPrefill(prId: string) {
  return getPurchaseOrderPrefillFromRequisition(prId);
}

export async function createOrder(body: Record<string, unknown>, userId: string) {
  return createPurchaseOrder({
    poDate: String(body.poDate ?? new Date().toISOString()),
    supplierId: String(body.supplierId ?? ""),
    prId: body.prId ? String(body.prId) : null,
    deliveryLocationId: String(body.deliveryLocationId ?? ""),
    expectedDeliveryDate: String(body.expectedDeliveryDate ?? ""),
    paymentTerms: String(body.paymentTerms ?? ""),
    requestType: String(body.requestType ?? "INVENTORY_PURCHASE") as never,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    poNo: body.poNo ? String(body.poNo) : undefined,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function updateOrder(id: string, body: Record<string, unknown>, userId: string) {
  return updatePurchaseOrder(id, {
    poDate: String(body.poDate ?? new Date().toISOString()),
    supplierId: String(body.supplierId ?? ""),
    prId: body.prId ? String(body.prId) : null,
    deliveryLocationId: String(body.deliveryLocationId ?? ""),
    expectedDeliveryDate: String(body.expectedDeliveryDate ?? ""),
    paymentTerms: String(body.paymentTerms ?? ""),
    requestType: String(body.requestType ?? "INVENTORY_PURCHASE") as never,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    poNo: body.poNo ? String(body.poNo) : undefined,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    updatedById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function approveOrder(id: string, userId: string, comment?: string) {
  return approvePurchaseOrder(id, userId, comment);
}

export async function rejectOrder(id: string, userId: string, comment?: string) {
  return rejectPurchaseOrder(id, userId, comment);
}

export async function submitOrder(id: string, userId: string, input?: { approverId?: string; comment?: string }) {
  return submitPurchaseOrder(id, userId, input);
}

export async function cancelOrder(id: string, userId: string) {
  return cancelPurchaseOrder(id, userId);
}
