import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import {
  approveGoodsReceipt,
  cancelGoodsReceipt,
  createGoodsReceipt,
  getGoodsReceiptById,
  getGoodsReceiptPrefillFromPurchaseOrder,
  listGoodsReceipts,
  postGoodsReceipt,
  rejectGoodsReceipt,
  submitGoodsReceipt,
  updateGoodsReceipt,
} from "@/services/procurement/grn.service";

export async function withGoodsReceiptAction<T>(
  action: (userId: string) => Promise<T | Response>,
  requiredPermission: string,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkPermission(user, requiredPermission)) return NextResponse.json({ error: `Forbidden: missing permission ${requiredPermission}` }, { status: 403 });

  try {
    const result = await action(user.id);
    if (result instanceof Response) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("GRN API failure", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GRN request failed" },
      { status: 500 },
    );
  }
}

export async function listReceipts() {
  return listGoodsReceipts();
}

export async function getReceipt(id: string) {
  return getGoodsReceiptById(id);
}

export async function getReceiptPrefill(poId: string) {
  return getGoodsReceiptPrefillFromPurchaseOrder(poId);
}

export async function createReceipt(body: Record<string, unknown>, userId: string) {
  return createGoodsReceipt({
    grnDate: String(body.grnDate ?? new Date().toISOString()),
    poId: body.poId ? String(body.poId) : null,
    supplierId: String(body.supplierId ?? ""),
    receivingLocationId: String(body.receivingLocationId ?? ""),
    deliveryNoteNo: String(body.deliveryNoteNo ?? ""),
    supplierInvoiceNo: String(body.supplierInvoiceNo ?? ""),
    vehiclePlate: String(body.vehiclePlate ?? ""),
    deliveredBy: String(body.deliveredBy ?? ""),
    receivedById: body.receivedById ? String(body.receivedById) : null,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function updateReceipt(id: string, body: Record<string, unknown>, userId: string) {
  return updateGoodsReceipt(id, {
    grnDate: String(body.grnDate ?? new Date().toISOString()),
    poId: body.poId ? String(body.poId) : null,
    supplierId: String(body.supplierId ?? ""),
    receivingLocationId: String(body.receivingLocationId ?? ""),
    deliveryNoteNo: String(body.deliveryNoteNo ?? ""),
    supplierInvoiceNo: String(body.supplierInvoiceNo ?? ""),
    vehiclePlate: String(body.vehiclePlate ?? ""),
    deliveredBy: String(body.deliveredBy ?? ""),
    receivedById: body.receivedById ? String(body.receivedById) : null,
    remarks: String(body.remarks ?? ""),
    status: body.status as never,
    approverId: body.approverId ? String(body.approverId) : undefined,
    createdById: userId,
    updatedById: userId,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
  });
}

export async function approveReceipt(id: string, userId: string, comment?: string) {
  return approveGoodsReceipt(id, userId, comment);
}

export async function rejectReceipt(id: string, userId: string, comment?: string) {
  return rejectGoodsReceipt(id, userId, comment);
}

export async function submitReceipt(id: string, userId: string, input?: { approverId?: string; comment?: string }) {
  return submitGoodsReceipt(id, userId, input);
}

export async function cancelReceipt(id: string, userId: string) {
  return cancelGoodsReceipt(id, userId);
}

export async function postReceipt(id: string, userId: string) {
  return postGoodsReceipt(id, userId);
}
