import {
  approvePurchaseRequisition,
  cancelPurchaseRequisition,
  createPurchaseRequisition,
  getPurchaseRequisitionById,
  listPurchaseRequisitions,
  rejectPurchaseRequisition,
  submitPurchaseRequisition,
  updatePurchaseRequisition,
} from "@/services/procurement/requisition.service";

export async function listRequisitions() {
  return listPurchaseRequisitions();
}

export async function getRequisition(id: string) {
  return getPurchaseRequisitionById(id);
}

export async function createRequisition(body: Record<string, unknown>, userId: string) {
  return createPurchaseRequisition({
    requisitionDate: String(body.requisitionDate ?? new Date().toISOString()),
    requestedById: String(body.requestedById || userId),
    departmentId: String(body.departmentId ?? ""),
    locationId: String(body.locationId ?? ""),
    neededByDate: String(body.neededByDate ?? ""),
    purpose: String(body.purpose ?? ""),
    requestType: String(body.requestType ?? "INVENTORY_PURCHASE") as never,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    requisitionNo: body.requisitionNo ? String(body.requisitionNo) : undefined,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function updateRequisition(id: string, body: Record<string, unknown>, userId: string) {
  return updatePurchaseRequisition(id, {
    requisitionDate: String(body.requisitionDate ?? new Date().toISOString()),
    requestedById: String(body.requestedById || userId),
    departmentId: String(body.departmentId ?? ""),
    locationId: String(body.locationId ?? ""),
    neededByDate: String(body.neededByDate ?? ""),
    purpose: String(body.purpose ?? ""),
    requestType: String(body.requestType ?? "INVENTORY_PURCHASE") as never,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    requisitionNo: body.requisitionNo ? String(body.requisitionNo) : undefined,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    updatedById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function approveRequisition(id: string, userId: string, comment?: string) {
  return approvePurchaseRequisition(id, userId, comment);
}

export async function rejectRequisition(id: string, userId: string, comment?: string) {
  return rejectPurchaseRequisition(id, userId, comment);
}

export async function submitRequisition(id: string, userId: string, input?: { approverId?: string; comment?: string }) {
  return submitPurchaseRequisition(id, userId, input);
}

export async function cancelRequisition(id: string, userId: string) {
  return cancelPurchaseRequisition(id, userId);
}
