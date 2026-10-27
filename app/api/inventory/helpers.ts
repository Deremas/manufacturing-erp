import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import { assertUserScope, type ApiScope } from "@/lib/auth/api-authorization";
import {
  approveAdjustmentDocument,
  approveIssueDocument,
  approveReturnDocument,
  approveTransferDocument,
  approveRequisition,
  cancelAdjustmentDocument,
  cancelIssueDocument,
  cancelRequisition,
  cancelReturnDocument,
  cancelTransferDocument,
  createAdjustment,
  createIssue,
  createRequisition,
  createReturn,
  createTransfer,
  generateIssueFromRequisition,
  getAdjustmentById,
  getIssueById,
  getRequisitionById,
  getReturnById,
  getTransferById,
  listAdjustments,
  listIssues,
  listRequisitions,
  listReturns,
  listTransfers,
  postAdjustmentDocument,
  postIssueDocument,
  postReturnDocument,
  postTransferDocument,
  rejectAdjustmentDocument,
  rejectIssueDocument,
  rejectRequisition,
  rejectReturnDocument,
  rejectTransferDocument,
  updateAdjustment,
  updateIssue,
  updateRequisition,
  updateReturn,
  updateTransfer,
} from "@/services/inventory/inventory-documents.service";

export type InventoryDocumentKey =
  | "transfers"
  | "adjustments"
  | "issues"
  | "returns"
  | "srv"
  | "requisitions";

function normalizeKey(value: string): InventoryDocumentKey | null {
  switch (value) {
    case "transfers":
    case "adjustments":
    case "issues":
    case "returns":
    case "srv":
    case "requisitions":
      return value;
    default:
      return null;
  }
}

export async function withInventoryDocument<T>(
  rawKey: string,
  action: (key: InventoryDocumentKey, userId: string) => Promise<T | Response>,
  requiredAction = "view",
  scope: ApiScope = {},
) {
  const key = normalizeKey(rawKey);
  if (!key) {
    return NextResponse.json({ error: "Unsupported inventory document" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resource = key === "transfers" ? "transfer"
    : key === "adjustments" ? "adjustment"
      : key === "issues" ? "issue"
        : key === "returns" ? "return" : "srv";
  const permission = `inventory.${resource}.${requiredAction}`;
  if (!checkPermission(user, permission)) {
    return NextResponse.json({ error: `Forbidden: missing permission ${permission}` }, { status: 403 });
  }
  try {
    assertUserScope(user, scope);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 });
  }

  try {
    const result = await action(key, user.id);
    if (result instanceof Response) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Inventory API failure for ${key}`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inventory request failed" },
      { status: 500 },
    );
  }
}

export async function listDocument(key: InventoryDocumentKey) {
  switch (key) {
    case "transfers":
      return listTransfers();
    case "adjustments":
      return listAdjustments();
    case "issues":
      return listIssues();
    case "returns":
      return listReturns();
    case "srv":
    case "requisitions":
      return listRequisitions();
  }
}

export async function getDocument(key: InventoryDocumentKey, id: string) {
  switch (key) {
    case "transfers":
      return getTransferById(id);
    case "adjustments":
      return getAdjustmentById(id);
    case "issues":
      return getIssueById(id);
    case "returns":
      return getReturnById(id);
    case "srv":
    case "requisitions":
      return getRequisitionById(id);
  }
}

export async function createDocument(
  key: InventoryDocumentKey,
  body: Record<string, unknown>,
  userId: string,
) {
  switch (key) {
    case "transfers":
      return createTransfer({
        transferNo: String(body.transferNo ?? ""),
        transferDate: String(body.transferDate ?? new Date().toISOString()),
        fromLocationId: String(body.fromLocationId ?? ""),
        toLocationId: String(body.toLocationId ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "adjustments":
      return createAdjustment({
        adjustmentNo: String(body.adjustmentNo ?? ""),
        adjustmentDate: String(body.adjustmentDate ?? new Date().toISOString()),
        locationId: String(body.locationId ?? ""),
        reason: String(body.reason ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "issues":
      return createIssue({
        issueNo: String(body.issueNo ?? ""),
        issueDate: String(body.issueDate ?? new Date().toISOString()),
        locationId: String(body.locationId ?? ""),
        issuedToType: String(body.issuedToType ?? ""),
        issuedToId: String(body.issuedToId ?? ""),
        purpose: String(body.purpose ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "returns":
      return createReturn({
        returnNo: String(body.returnNo ?? ""),
        returnDate: String(body.returnDate ?? new Date().toISOString()),
        locationId: String(body.locationId ?? ""),
        returnedFromType: String(body.returnedFromType ?? ""),
        returnedFromId: String(body.returnedFromId ?? ""),
        reason: String(body.reason ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "srv":
    case "requisitions":
      return createRequisition({
        requisitionNo: String(body.requisitionNo ?? ""),
        requisitionDate: String(body.requisitionDate ?? new Date().toISOString()),
        requestedById: String(body.requestedById ?? "").trim() || userId,
        actorId: userId,
        fromLocationId: String(body.fromLocationId ?? "") || null,
        toLocationId: String(body.toLocationId ?? "") || null,
        toDepartmentId: String(body.toDepartmentId ?? "") || null,
        shiftCode: String(body.shiftCode ?? "").trim() || null,
        neededByDate: String(body.neededByDate ?? "").trim() || null,
        purpose: String(body.purpose ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
  }
}

export async function updateDocument(
  key: InventoryDocumentKey,
  id: string,
  body: Record<string, unknown>,
  userId: string,
) {
  switch (key) {
    case "transfers":
      return updateTransfer(id, {
        transferNo: String(body.transferNo ?? ""),
        transferDate: String(body.transferDate ?? new Date().toISOString()),
        fromLocationId: String(body.fromLocationId ?? ""),
        toLocationId: String(body.toLocationId ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "adjustments":
      return updateAdjustment(id, {
        adjustmentNo: String(body.adjustmentNo ?? ""),
        adjustmentDate: String(body.adjustmentDate ?? new Date().toISOString()),
        locationId: String(body.locationId ?? ""),
        reason: String(body.reason ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "issues":
      return updateIssue(id, {
        issueNo: String(body.issueNo ?? ""),
        issueDate: String(body.issueDate ?? new Date().toISOString()),
        locationId: String(body.locationId ?? ""),
        issuedToType: String(body.issuedToType ?? ""),
        issuedToId: String(body.issuedToId ?? ""),
        purpose: String(body.purpose ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "returns":
      return updateReturn(id, {
        returnNo: String(body.returnNo ?? ""),
        returnDate: String(body.returnDate ?? new Date().toISOString()),
        locationId: String(body.locationId ?? ""),
        returnedFromType: String(body.returnedFromType ?? ""),
        returnedFromId: String(body.returnedFromId ?? ""),
        reason: String(body.reason ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        createdById: userId,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
    case "srv":
    case "requisitions":
      return updateRequisition(id, {
        requisitionNo: String(body.requisitionNo ?? ""),
        requisitionDate: String(body.requisitionDate ?? new Date().toISOString()),
        requestedById: String(body.requestedById ?? "").trim() || userId,
        actorId: userId,
        fromLocationId: String(body.fromLocationId ?? "") || null,
        toLocationId: String(body.toLocationId ?? "") || null,
        toDepartmentId: String(body.toDepartmentId ?? "") || null,
        shiftCode: String(body.shiftCode ?? "").trim() || null,
        neededByDate: String(body.neededByDate ?? "").trim() || null,
        purpose: String(body.purpose ?? ""),
        approverId: String(body.approverId ?? "") || undefined,
        remarks: String(body.remarks ?? ""),
        status: body.status as never,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems as never[] : [],
      });
  }
}

export async function postDocument(key: InventoryDocumentKey, id: string, userId: string) {
  switch (key) {
    case "transfers":
      return postTransferDocument(id, userId);
    case "adjustments":
      return postAdjustmentDocument(id, userId);
    case "issues":
      return postIssueDocument(id, userId);
    case "returns":
      return postReturnDocument(id, userId);
    case "srv":
    case "requisitions":
      throw new Error("Store requisitions do not post stock directly");
  }
}

export async function approveDocument(key: InventoryDocumentKey, id: string, userId: string) {
  switch (key) {
    case "transfers":
      return approveTransferDocument(id, userId);
    case "adjustments":
      return approveAdjustmentDocument(id, userId);
    case "issues":
      return approveIssueDocument(id, userId);
    case "returns":
      return approveReturnDocument(id, userId);
    case "srv":
    case "requisitions":
      return approveRequisition(id, userId);
    default:
      throw new Error("Approval is not supported for this document");
  }
}

export async function generateIssue(key: InventoryDocumentKey, id: string, userId: string) {
  switch (key) {
    case "srv":
    case "requisitions":
      return generateIssueFromRequisition(id, userId);
    default:
      throw new Error("Issue generation is not supported for this document");
  }
}

export async function rejectDocument(key: InventoryDocumentKey, id: string, userId: string, comment?: string) {
  switch (key) {
    case "transfers":
      return rejectTransferDocument(id, userId, comment);
    case "adjustments":
      return rejectAdjustmentDocument(id, userId, comment);
    case "issues":
      return rejectIssueDocument(id, userId, comment);
    case "returns":
      return rejectReturnDocument(id, userId, comment);
    case "srv":
    case "requisitions":
      return rejectRequisition(id, userId, comment);
  }
}

export async function cancelDocument(key: InventoryDocumentKey, id: string, userId: string, comment?: string) {
  switch (key) {
    case "transfers":
      return cancelTransferDocument(id, userId, comment);
    case "adjustments":
      return cancelAdjustmentDocument(id, userId, comment);
    case "issues":
      return cancelIssueDocument(id, userId, comment);
    case "returns":
      return cancelReturnDocument(id, userId, comment);
    case "srv":
    case "requisitions":
      return cancelRequisition(id, userId, comment);
  }
}
