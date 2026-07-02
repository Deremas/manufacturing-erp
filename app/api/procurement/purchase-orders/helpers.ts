import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrderPrefillFromRequisition,
  listPurchaseOrders,
  rejectPurchaseOrder,
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
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
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
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    updatedById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function approveOrder(id: string, userId: string) {
  return approvePurchaseOrder(id, userId);
}

export async function rejectOrder(id: string, userId: string) {
  return rejectPurchaseOrder(id, userId);
}

export async function cancelOrder(id: string, userId: string) {
  return cancelPurchaseOrder(id, userId);
}
