import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { allocateNextDocumentNumber } from "@/lib/document-numbering";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { validateInventoryApprovalPolicy } from "@/services/inventory/inventory-insights.service";
import { evaluateInventoryApprovalRequirement, type InventoryPolicyDocumentType } from "@/services/inventory/inventory-policy.service";
import { postAdjustment, postStockIssue, postStockReturn, postTransfer } from "@/services/inventory/inventory-posting.service";

type InventoryStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED"
  | "PARTIALLY_ISSUED"
  | "ISSUED";

type Tx = typeof sql;

export interface InventoryLineItemInput {
  itemId: string;
  quantity?: number;
  unitCost?: number;
  condition?: string;
  remarks?: string;
  systemQty?: number;
  physicalQty?: number;
  differenceQty?: number;
  requestedQty?: number;
  approvedQty?: number;
  issuedQty?: number;
}

export interface TransferSummary {
  id: string;
  publicId: number;
  transferNo: string;
  transferDate: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  status: InventoryStatus;
  remarks: string;
  createdById: string;
  createdByName: string;
  itemCount: number;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
}

export interface TransferDetail extends TransferSummary {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomName?: string | null;
    quantity: number;
    unitCost: number;
    remarks: string;
  }>;
}

export interface AdjustmentSummary {
  id: string;
  publicId: number;
  adjustmentNo: string;
  adjustmentDate: string;
  locationId: string;
  locationName: string;
  reason: string;
  status: InventoryStatus;
  remarks: string;
  createdById: string;
  createdByName: string;
  itemCount: number;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
}

export interface AdjustmentDetail extends AdjustmentSummary {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    systemQty: number;
    physicalQty: number;
    differenceQty: number;
    unitCost: number;
    remarks: string;
  }>;
}

export interface IssueSummary {
  id: string;
  publicId: number;
  issueNo: string;
  issueDate: string;
  locationId: string;
  locationName: string;
  issuedToType: string;
  issuedToId: string;
  issuedToName: string;
  purpose: string;
  status: InventoryStatus;
  remarks: string;
  createdById: string;
  createdByName: string;
  itemCount: number;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
}

export interface IssueDetail extends IssueSummary {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomName?: string | null;
    quantity: number;
    alreadyReturnedQty: number;
    remainingReturnableQty: number;
    unitCost: number;
    remarks: string;
  }>;
}

export interface ReturnSummary {
  id: string;
  publicId: number;
  returnNo: string;
  returnDate: string;
  locationId: string;
  locationName: string;
  returnedFromType: string;
  returnedFromId: string;
  returnedFromName: string;
  reason: string;
  status: InventoryStatus;
  remarks: string;
  createdById: string;
  createdByName: string;
  itemCount: number;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
}

export interface ReturnDetail extends ReturnSummary {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomName?: string | null;
    quantity: number;
    unitCost: number;
    condition: string;
    remarks: string;
  }>;
}

export interface RequisitionSummary {
  id: string;
  publicId: number;
  requisitionNo: string;
  requisitionDate: string;
  requestedById: string | null;
  requestedByName: string | null;
  fromLocationId: string | null;
  fromLocationName: string | null;
  toLocationId: string | null;
  toLocationName: string | null;
  toDepartmentId: string | null;
  toDepartmentName: string | null;
  shiftCode: string | null;
  neededByDate: string | null;
  purpose: string;
  status: InventoryStatus;
  remarks: string;
  itemCount: number;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
}

export interface RequisitionDetail extends RequisitionSummary {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomName?: string | null;
    requestedQty: number;
    approvedQty: number;
    issuedQty: number;
    remarks: string;
  }>;
}

interface TransferPayload {
  transferNo?: string;
  transferDate: string;
  fromLocationId: string;
  toLocationId: string;
  approverId?: string;
  remarks?: string;
  status?: InventoryStatus;
  createdById: string;
  lineItems: InventoryLineItemInput[];
}

interface AdjustmentPayload {
  adjustmentNo?: string;
  adjustmentDate: string;
  locationId: string;
  reason: string;
  approverId?: string;
  remarks?: string;
  status?: InventoryStatus;
  createdById: string;
  lineItems: InventoryLineItemInput[];
}

interface IssuePayload {
  issueNo?: string;
  issueDate: string;
  locationId: string;
  issuedToType: string;
  issuedToId: string;
  purpose: string;
  approverId?: string;
  remarks?: string;
  status?: InventoryStatus;
  createdById: string;
  lineItems: InventoryLineItemInput[];
}

interface ReturnPayload {
  returnNo?: string;
  returnDate: string;
  locationId: string;
  returnedFromType: string;
  returnedFromId: string;
  reason: string;
  approverId?: string;
  remarks?: string;
  status?: InventoryStatus;
  createdById: string;
  lineItems: InventoryLineItemInput[];
}

interface RequisitionPayload {
  requisitionNo?: string;
  requisitionDate: string;
  requestedById?: string | null;
  actorId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  toDepartmentId?: string | null;
  shiftCode?: string | null;
  neededByDate?: string | null;
  purpose: string;
  approverId?: string;
  remarks?: string;
  status?: InventoryStatus;
  lineItems: InventoryLineItemInput[];
}

function normalizeStatus(value?: string): InventoryStatus {
  const normalized = String(value ?? "DRAFT").trim().toUpperCase();
  switch (normalized) {
    case "SUBMITTED":
    case "APPROVED":
    case "REJECTED":
    case "POSTED":
    case "CANCELLED":
    case "PARTIALLY_ISSUED":
    case "ISSUED":
      return normalized;
    default:
      return "DRAFT";
  }
}

function validatePositiveLineItems(items: InventoryLineItemInput[]) {
  const filtered = items.filter((item) => item.itemId && Number(item.quantity ?? 0) > 0);
  if (filtered.length === 0) {
    throw new Error("At least one line item with quantity greater than zero is required");
  }
  return filtered;
}

function computeLineTotals(items: InventoryLineItemInput[], quantityField: "quantity" | "differenceQty" | "requestedQty") {
  return items.reduce(
    (totals, item) => {
      const quantity = Math.abs(Number(item[quantityField] ?? 0));
      const unitCost = Number(item.unitCost ?? 0);

      return {
        totalQuantity: totals.totalQuantity + quantity,
        totalValue: totals.totalValue + (quantity * unitCost),
      };
    },
    { totalQuantity: 0, totalValue: 0 },
  );
}

async function nextDocumentNumber(tx: Tx, prefix: string, description: string) {
  return allocateNextDocumentNumber(tx, prefix, description);
}

function normalizeIssueDocumentNumber(value?: string) {
  return normalizePrefixedDocumentNumber(value, "ISS");
}

function normalizeReturnDocumentNumber(value?: string) {
  return normalizePrefixedDocumentNumber(value, "RET");
}

function normalizePrefixedDocumentNumber(value: string | undefined, prefix: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  const formatted = trimmed.match(/^([A-Z]+)\/RAW\/(\d{4})\/(\d{4,})$/i);
  if (formatted) {
    return `${prefix}-${formatted[2]}-${formatted[3]}`;
  }

  return trimmed.replace(/\//g, "-");
}

async function resolveStoreRequisitionNumber(tx: Tx, value: string | undefined, currentId?: string) {
  const trimmed = String(value ?? "").trim();
  const display = trimmed.match(/^SR\/RAW\/(\d{4})\/(\d+)$/i);
  const stored = trimmed.match(/^SRV-(\d{4})-(\d+)$/i);
  const supplied = display
    ? `SRV-${display[1]}-${display[2].padStart(4, "0")}`
    : stored
      ? `SRV-${stored[1]}-${stored[2].padStart(4, "0")}`
      : "";
  if (!supplied) {
    if (!trimmed && currentId) {
      const current = await tx<Array<{ requisitionNo: string }>>`
        SELECT "requisitionNo" FROM "StoreRequisition" WHERE id = ${currentId} LIMIT 1
      `;
      if (current[0]?.requisitionNo) return current[0].requisitionNo;
    }
    if (!trimmed) return nextDocumentNumber(tx, "SRV", "Store Requisition");
    throw new Error("Use the format SR/RAW/2026/0250");
  }

  const duplicates = currentId
    ? await tx<Array<{ id: string }>>`
        SELECT id FROM "StoreRequisition"
        WHERE "requisitionNo" = ${supplied} AND id <> ${currentId}
        LIMIT 1
      `
    : await tx<Array<{ id: string }>>`
        SELECT id FROM "StoreRequisition"
        WHERE "requisitionNo" = ${supplied}
        LIMIT 1
      `;
  if (duplicates.length > 0) {
    throw new Error("Requisition number already exists");
  }

  const sequence = supplied.match(/^SRV-\d{4}-(\d+)$/i);
  if (sequence) {
    await tx`
      UPDATE "DocumentNumbering"
      SET "currentSequence" = GREATEST("currentSequence", ${Number(sequence[1])})
      WHERE prefix = 'SRV' AND "isArchived" = false
    `;
  }

  return supplied;
}

async function nextTransferNumber(tx: Tx) {
  const number = await nextDocumentNumber(tx, "TRF", "Stock Transfer");
  return number.replace(/-/g, "/");
}

async function writeDocumentAudit(tx: Tx, userId: string, action: string, module: string, recordId: string, newValue?: unknown, oldValue?: unknown) {
  await tx`
    INSERT INTO "AuditLog" (
      id,
      "userId",
      action,
      module,
      "recordId",
      "oldValue",
      "newValue",
      "isArchived",
      timestamp
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      ${action},
      ${module},
      ${recordId},
      ${oldValue ? JSON.stringify(oldValue) : null},
      ${newValue ? JSON.stringify(newValue) : null},
      false,
      NOW()
    )
  `;
}

async function writeHistory(tx: Tx, referenceType: string, referenceId: string, action: string, performedById: string, comment?: string) {
  await tx`
    INSERT INTO "DocumentHistory" (
      id,
      "referenceType",
      "referenceId",
      action,
      comment,
      "performedById",
      "isArchived",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${referenceType},
      ${referenceId},
      ${action},
      ${comment ?? null},
      ${performedById},
      false,
      NOW()
    )
  `;
}

async function getAssignedApprover(referenceType: string, referenceId: string) {
  const rows = await sql<Array<{ assignedApproverId: string | null; assignedApproverName: string | null }>>`
    SELECT
      a."assignedApproverId",
      u.name AS "assignedApproverName"
    FROM "Approval" a
    LEFT JOIN "User" u ON u.id = a."assignedApproverId"
    WHERE a."referenceType" = ${referenceType}
      AND a."referenceId" = ${referenceId}
      AND a."isArchived" = false
    ORDER BY a."createdAt" DESC
    LIMIT 1
  `;

  return rows[0] ?? { assignedApproverId: null, assignedApproverName: null };
}

async function syncApprovalState(
  tx: Tx,
  referenceType: string,
  referenceId: string,
  status: InventoryStatus,
  requestedById: string,
  assignedApproverId?: string | null,
  comment?: string,
) {
  if (status === "SUBMITTED") {
    if (!assignedApproverId) {
      await tx`
        UPDATE "Approval"
        SET status = 'CANCELLED', "updatedAt" = NOW()
        WHERE "referenceType" = ${referenceType}
          AND "referenceId" = ${referenceId}
          AND status = 'PENDING'
          AND "isArchived" = false
      `;
      return;
    }

    const latestRows = await tx<Array<{ id: string; status: string; assignedApproverId: string | null }>>`
      SELECT id, status, "assignedApproverId"
      FROM "Approval"
      WHERE "referenceType" = ${referenceType}
        AND "referenceId" = ${referenceId}
        AND "isArchived" = false
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const latest = latestRows[0];
    if (latest?.status === "PENDING" && latest.assignedApproverId === (assignedApproverId ?? null)) {
      return;
    }

    if (latest?.status === "PENDING" && latest.assignedApproverId !== (assignedApproverId ?? null)) {
      await tx`
        UPDATE "Approval"
        SET
          "assignedApproverId" = ${assignedApproverId ?? null},
          comment = ${comment ?? null},
          "updatedAt" = NOW()
        WHERE id = ${latest.id}
      `;
      return;
    }

    await tx`
      INSERT INTO "Approval" (
        id,
        "referenceType",
        "referenceId",
        status,
        "requestedById",
        "assignedApproverId",
        comment,
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${referenceType},
        ${referenceId},
        'PENDING',
        ${requestedById},
        ${assignedApproverId ?? null},
        ${comment ?? null},
        false,
        NOW(),
        NOW()
      )
    `;
    return;
  }

  if (status === "DRAFT" || status === "CANCELLED" || status === "REJECTED") {
    await tx`
      UPDATE "Approval"
      SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE "referenceType" = ${referenceType}
        AND "referenceId" = ${referenceId}
        AND status = 'PENDING'
        AND "isArchived" = false
    `;
  }
}

async function ensureDocumentCanPost(input: {
  documentType: InventoryPolicyDocumentType;
  referenceType: string;
  referenceId: string;
  status: string;
  userId: string;
  totalQuantity: number;
  totalValue: number;
  fromLocationId?: string | null;
}) {
  const requirement = await evaluateInventoryApprovalRequirement({
    documentType: input.documentType,
    totalQuantity: input.totalQuantity,
    totalValue: input.totalValue,
    fromLocationId: input.fromLocationId,
    userId: input.userId,
  });

  if (requirement.approvalRequired && !requirement.autoApprovedForAdmin && input.status !== "APPROVED") {
    throw new Error("Document must be approved before posting under the active inventory approval policy");
  }

  const rows = await sql<Array<{ status: string }>>`
    SELECT status
    FROM "Approval"
    WHERE "referenceType" = ${input.referenceType}
      AND "referenceId" = ${input.referenceId}
      AND "isArchived" = false
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const latest = rows[0];
  if (!latest) {
    if (requirement.approvalRequired && !requirement.autoApprovedForAdmin) {
      throw new Error("Document requires approval before posting, but no approval record was found");
    }
    return;
  }

  if (latest.status === "PENDING") {
    throw new Error("Document is awaiting approval and cannot be posted yet");
  }

  if (latest.status === "REJECTED" || latest.status === "CANCELLED") {
    throw new Error(`Document cannot be posted because approval is ${latest.status.toLowerCase()}`);
  }
}

async function approveApprovalRecord(referenceType: string, referenceId: string, userId: string, comment?: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string; assignedApproverId: string | null }>>`
      SELECT id, status, "assignedApproverId"
      FROM "Approval"
      WHERE "referenceType" = ${referenceType}
        AND "referenceId" = ${referenceId}
        AND "isArchived" = false
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const latest = rows[0];
    if (!latest) {
      throw new Error("Approval request not found for this document");
    }

    if (latest.status === "APPROVED") {
      return latest.id;
    }

    if (latest.status !== "PENDING") {
      throw new Error(`Only pending approvals can be approved. Current status: ${latest.status}`);
    }
    if (latest.assignedApproverId && latest.assignedApproverId !== userId) {
      throw new Error("You are not the assigned approver for this document");
    }

    await tx`
      UPDATE "Approval"
      SET
        status = 'APPROVED',
        "approvedById" = ${userId},
        comment = ${comment ?? null},
        "updatedAt" = NOW()
      WHERE id = ${latest.id}
    `;

    return latest.id;
  });
}

async function rejectApprovalRecord(referenceType: string, referenceId: string, userId: string, comment?: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string; assignedApproverId: string | null }>>`
      SELECT id, status, "assignedApproverId"
      FROM "Approval"
      WHERE "referenceType" = ${referenceType}
        AND "referenceId" = ${referenceId}
        AND "isArchived" = false
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const latest = rows[0];
    if (!latest) {
      throw new Error("Approval request not found for this document");
    }

    if (latest.status !== "PENDING") {
      throw new Error(`Only pending approvals can be rejected. Current status: ${latest.status}`);
    }
    if (latest.assignedApproverId && latest.assignedApproverId !== userId) {
      throw new Error("You are not the assigned approver for this document");
    }

    await tx`
      UPDATE "Approval"
      SET
        status = 'REJECTED',
        "approvedById" = ${userId},
        comment = ${comment ?? null},
        "updatedAt" = NOW()
      WHERE id = ${latest.id}
    `;

    return latest.id;
  });
}

async function cancelOpenApprovalRecord(referenceType: string, referenceId: string, userId: string, comment?: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string; requestedById: string }>>`
      SELECT id, status, "requestedById"
      FROM "Approval"
      WHERE "referenceType" = ${referenceType}
        AND "referenceId" = ${referenceId}
        AND "isArchived" = false
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const latest = rows[0];
    if (!latest) {
      return null;
    }
    if (latest.status !== "PENDING") {
      return latest.id;
    }
    if (latest.requestedById !== userId) {
      throw new Error("Only the requestor can cancel a pending approval");
    }

    await tx`
      UPDATE "Approval"
      SET
        status = 'CANCELLED',
        comment = ${comment ?? null},
        "updatedAt" = NOW()
      WHERE id = ${latest.id}
    `;

    return latest.id;
  });
}

export async function listTransfers(): Promise<TransferSummary[]> {
  try {
    const rows = await sql<Array<TransferSummary>>`
      SELECT
        st.id,
        st."publicId",
        st."transferNo",
        st."transferDate"::text,
        st."fromLocationId",
        fl."locationName" AS "fromLocationName",
        st."toLocationId",
        tl."locationName" AS "toLocationName",
        st.status,
        COALESCE(st.remarks, '') AS remarks,
        st."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sti.id), 0)::int AS "itemCount"
      FROM "StockTransfer" st
      INNER JOIN "Location" fl ON fl.id = st."fromLocationId"
      INNER JOIN "Location" tl ON tl.id = st."toLocationId"
      INNER JOIN "User" u ON u.id = st."createdById"
      LEFT JOIN "StockTransferItem" sti ON sti."transferId" = st.id
      GROUP BY st.id, fl."locationName", tl."locationName", u.name
      ORDER BY st."transferDate" DESC, st."createdAt" DESC
    `;
    return rows;
  } catch {
    return [];
  }
}

export async function getTransferById(key: string): Promise<TransferDetail | null> {
  try {
    const rows = await sql<Array<TransferSummary>>`
      SELECT
        st.id,
        st."publicId",
        st."transferNo",
        st."transferDate"::text,
        st."fromLocationId",
        fl."locationName" AS "fromLocationName",
        st."toLocationId",
        tl."locationName" AS "toLocationName",
        st.status,
        COALESCE(st.remarks, '') AS remarks,
        st."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sti.id), 0)::int AS "itemCount"
      FROM "StockTransfer" st
      INNER JOIN "Location" fl ON fl.id = st."fromLocationId"
      INNER JOIN "Location" tl ON tl.id = st."toLocationId"
      INNER JOIN "User" u ON u.id = st."createdById"
      LEFT JOIN "StockTransferItem" sti ON sti."transferId" = st.id
      WHERE ${isPublicIdParam(key) ? sql`st."publicId" = ${Number(key)}` : sql`st.id = ${key}`}
      GROUP BY st.id, fl."locationName", tl."locationName", u.name
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;
    const approval = await getAssignedApprover("inventory.transfer", header.id);
    const items = await sql<TransferDetail["items"]>`
      SELECT
        sti.id,
        sti."itemId",
        i."itemCode",
        i."itemName",
        u.name AS "uomName",
        sti.quantity,
        sti."unitCost",
        COALESCE(sti.remarks, '') AS remarks
      FROM "StockTransferItem" sti
      INNER JOIN "Item" i ON i.id = sti."itemId"
      LEFT JOIN "Unit" u ON u.id = i."uomId"
      WHERE sti."transferId" = ${header.id}
      ORDER BY i."itemCode" ASC
    `;
    return { ...header, ...approval, items };
  } catch {
    return null;
  }
}

export async function createTransfer(payload: TransferPayload) {
  const items = validatePositiveLineItems(payload.lineItems);
  if (payload.fromLocationId === payload.toLocationId) {
    throw new Error("From and To location cannot be the same");
  }
  const totals = computeLineTotals(items, "quantity");
  await validateInventoryApprovalPolicy({
    documentType: "transfer",
    status: payload.status,
    approverId: payload.approverId,
    fromLocationId: payload.fromLocationId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const transferNo = payload.transferNo?.trim() || await nextTransferNumber(tx);
    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "StockTransfer" (
        id, "transferNo", "transferDate", "fromLocationId", "toLocationId",
        status, remarks, "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${transferNo}, ${new Date(payload.transferDate)}, ${payload.fromLocationId}, ${payload.toLocationId},
        ${normalizeStatus(payload.status)}, ${payload.remarks ?? null}, ${payload.createdById}, NOW(), NOW()
      )
      RETURNING "publicId"
    `;
    const publicId = inserted[0]?.publicId ?? 0;
    for (const item of items) {
      await tx`
        INSERT INTO "StockTransferItem" (id, "transferId", "itemId", quantity, "unitCost", remarks)
        VALUES (${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.quantity)}, ${Number(item.unitCost ?? 0)}, ${item.remarks ?? null})
      `;
    }
    await syncApprovalState(tx, "inventory.transfer", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "CREATE", "inventory.transfer", id, payload);
    await writeHistory(tx, "inventory.transfer", id, "CREATE", payload.createdById, payload.remarks);
    return { id, publicId, transferNo };
  });
}

export async function updateTransfer(id: string, payload: TransferPayload) {
  const items = validatePositiveLineItems(payload.lineItems);
  const totals = computeLineTotals(items, "quantity");
  await validateInventoryApprovalPolicy({
    documentType: "transfer",
    status: payload.status,
    approverId: payload.approverId,
    fromLocationId: payload.fromLocationId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const transferNo = payload.transferNo?.trim() || await nextTransferNumber(tx);
    const existingRows = await tx<Array<{ status: string }>>`
      SELECT status FROM "StockTransfer" WHERE id = ${id} LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) throw new Error("Transfer not found");
    if (existing.status === "POSTED" || existing.status === "CANCELLED") {
      throw new Error("Posted or cancelled transfer cannot be edited");
    }

    await tx`
      UPDATE "StockTransfer"
      SET
        "transferNo" = ${transferNo},
        "transferDate" = ${new Date(payload.transferDate)},
        "fromLocationId" = ${payload.fromLocationId},
        "toLocationId" = ${payload.toLocationId},
        status = ${normalizeStatus(payload.status)},
        remarks = ${payload.remarks ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "StockTransferItem" WHERE "transferId" = ${id}`;
    for (const item of items) {
      await tx`
        INSERT INTO "StockTransferItem" (id, "transferId", "itemId", quantity, "unitCost", remarks)
        VALUES (${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.quantity)}, ${Number(item.unitCost ?? 0)}, ${item.remarks ?? null})
      `;
    }
    await syncApprovalState(tx, "inventory.transfer", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "UPDATE", "inventory.transfer", id, payload);
    await writeHistory(tx, "inventory.transfer", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function postTransferDocument(id: string, userId: string) {
  const transfer = await getTransferById(id);
  if (!transfer) throw new Error("Transfer not found");
  if (transfer.status === "POSTED") return { id };
  if (transfer.status === "CANCELLED" || transfer.status === "REJECTED") {
    throw new Error("Cancelled or rejected transfer cannot be posted");
  }
  const totals = computeLineTotals(transfer.items, "quantity");
  await ensureDocumentCanPost({
    documentType: "transfer",
    referenceType: "inventory.transfer",
    referenceId: id,
    status: transfer.status,
    userId,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
    fromLocationId: transfer.fromLocationId,
  });

  await sql.begin(async (tx) => {
    for (const item of transfer.items) {
      await postTransfer({
        itemId: item.itemId,
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        remarks: item.remarks,
        createdById: userId,
        sourceDocumentId: id,
      }, { tx });
    }

    await tx`
      UPDATE "StockTransfer"
      SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeDocumentAudit(tx, userId, "POST", "inventory.transfer", id, {
      transferId: id,
      totalQuantity: totals.totalQuantity,
      totalValue: totals.totalValue,
    });
    await writeHistory(tx, "inventory.transfer", id, "POST", userId, transfer.transferNo);
  });
  return { id };
}

export async function approveTransferDocument(id: string, userId: string) {
  const transfer = await getTransferById(id);
  if (!transfer) throw new Error("Transfer not found");
  await approveApprovalRecord("inventory.transfer", id, userId);
  await sql`
    UPDATE "StockTransfer"
    SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  return { id };
}

export async function rejectTransferDocument(id: string, userId: string, comment?: string) {
  const transfer = await getTransferById(id);
  if (!transfer) throw new Error("Transfer not found");
  await rejectApprovalRecord("inventory.transfer", id, userId, comment);
  await sql`
    UPDATE "StockTransfer"
    SET status = 'REJECTED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.transfer", id, "REJECT", userId, comment);
  return { id };
}

export async function cancelTransferDocument(id: string, userId: string, comment?: string) {
  const transfer = await getTransferById(id);
  if (!transfer) throw new Error("Transfer not found");
  if (transfer.status === "POSTED") throw new Error("Posted transfer cannot be cancelled");
  await cancelOpenApprovalRecord("inventory.transfer", id, userId, comment);
  await sql`
    UPDATE "StockTransfer"
    SET status = 'CANCELLED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.transfer", id, "CANCEL", userId, comment);
  return { id };
}

export async function listAdjustments(): Promise<AdjustmentSummary[]> {
  try {
    return await sql<Array<AdjustmentSummary>>`
      SELECT
        sa.id,
        sa."publicId",
        sa."adjustmentNo",
        sa."adjustmentDate"::text,
        sa."locationId",
        l."locationName" AS "locationName",
        sa.reason,
        sa.status,
        COALESCE(sa.remarks, '') AS remarks,
        sa."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sai.id), 0)::int AS "itemCount"
      FROM "StockAdjustment" sa
      INNER JOIN "Location" l ON l.id = sa."locationId"
      INNER JOIN "User" u ON u.id = sa."createdById"
      LEFT JOIN "StockAdjustmentItem" sai ON sai."adjustmentId" = sa.id
      GROUP BY sa.id, l."locationName", u.name
      ORDER BY sa."adjustmentDate" DESC, sa."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getAdjustmentById(key: string): Promise<AdjustmentDetail | null> {
  try {
    const rows = await sql<Array<AdjustmentSummary>>`
      SELECT
        sa.id,
        sa."publicId",
        sa."adjustmentNo",
        sa."adjustmentDate"::text,
        sa."locationId",
        l."locationName" AS "locationName",
        sa.reason,
        sa.status,
        COALESCE(sa.remarks, '') AS remarks,
        sa."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sai.id), 0)::int AS "itemCount"
      FROM "StockAdjustment" sa
      INNER JOIN "Location" l ON l.id = sa."locationId"
      INNER JOIN "User" u ON u.id = sa."createdById"
      LEFT JOIN "StockAdjustmentItem" sai ON sai."adjustmentId" = sa.id
      WHERE ${isPublicIdParam(key) ? sql`sa."publicId" = ${Number(key)}` : sql`sa.id = ${key}`}
      GROUP BY sa.id, l."locationName", u.name
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;
    const approval = await getAssignedApprover("inventory.adjustment", header.id);
    const items = await sql<AdjustmentDetail["items"]>`
      SELECT
        sai.id,
        sai."itemId",
        i."itemCode",
        i."itemName",
        sai."systemQty",
        sai."physicalQty",
        sai."differenceQty",
        sai."unitCost",
        COALESCE(sai.remarks, '') AS remarks
      FROM "StockAdjustmentItem" sai
      INNER JOIN "Item" i ON i.id = sai."itemId"
      WHERE sai."adjustmentId" = ${header.id}
      ORDER BY i."itemCode" ASC
    `;
    return { ...header, ...approval, items };
  } catch {
    return null;
  }
}

export async function createAdjustment(payload: AdjustmentPayload) {
  const items = payload.lineItems.filter((row) => row.itemId);
  const totals = computeLineTotals(items, "differenceQty");
  await validateInventoryApprovalPolicy({
    documentType: "adjustment",
    status: payload.status,
    approverId: payload.approverId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const adjustmentNo = payload.adjustmentNo?.trim() || await nextDocumentNumber(tx, "ADJ", "Stock Adjustment");
    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "StockAdjustment" (
        id, "adjustmentNo", "adjustmentDate", "locationId", reason,
        status, remarks, "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${adjustmentNo}, ${new Date(payload.adjustmentDate)}, ${payload.locationId}, ${payload.reason},
        ${normalizeStatus(payload.status)}, ${payload.remarks ?? null}, ${payload.createdById}, NOW(), NOW()
      )
      RETURNING "publicId"
    `;
    const publicId = inserted[0]?.publicId ?? 0;
    for (const item of items) {
      const systemQty = Number(item.systemQty ?? 0);
      const physicalQty = Number(item.physicalQty ?? 0);
      const differenceQty = Number(item.differenceQty ?? physicalQty - systemQty);
      await tx`
        INSERT INTO "StockAdjustmentItem" (
          id, "adjustmentId", "itemId", "systemQty", "physicalQty", "differenceQty", "unitCost", remarks
        )
        VALUES (
          ${randomUUID()}, ${id}, ${item.itemId}, ${systemQty}, ${physicalQty}, ${differenceQty}, ${Number(item.unitCost ?? 0)}, ${item.remarks ?? null}
        )
      `;
    }
    await syncApprovalState(tx, "inventory.adjustment", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "CREATE", "inventory.adjustment", id, payload);
    await writeHistory(tx, "inventory.adjustment", id, "CREATE", payload.createdById, payload.remarks);
    return { id, publicId, adjustmentNo };
  });
}

export async function updateAdjustment(id: string, payload: AdjustmentPayload) {
  const items = payload.lineItems.filter((row) => row.itemId);
  const totals = computeLineTotals(items, "differenceQty");
  await validateInventoryApprovalPolicy({
    documentType: "adjustment",
    status: payload.status,
    approverId: payload.approverId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: string; adjustmentNo: string }>>`SELECT status, "adjustmentNo" FROM "StockAdjustment" WHERE id = ${id} LIMIT 1`;
    const existing = existingRows[0];
    if (!existing) throw new Error("Adjustment not found");
    if (existing.status === "POSTED" || existing.status === "CANCELLED") throw new Error("Posted or cancelled adjustment cannot be edited");

    await tx`
      UPDATE "StockAdjustment"
      SET
        "adjustmentNo" = ${payload.adjustmentNo?.trim() || existing.adjustmentNo},
        "adjustmentDate" = ${new Date(payload.adjustmentDate)},
        "locationId" = ${payload.locationId},
        reason = ${payload.reason},
        status = ${normalizeStatus(payload.status)},
        remarks = ${payload.remarks ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "StockAdjustmentItem" WHERE "adjustmentId" = ${id}`;
    for (const item of items) {
      const systemQty = Number(item.systemQty ?? 0);
      const physicalQty = Number(item.physicalQty ?? 0);
      const differenceQty = Number(item.differenceQty ?? physicalQty - systemQty);
      await tx`
        INSERT INTO "StockAdjustmentItem" (
          id, "adjustmentId", "itemId", "systemQty", "physicalQty", "differenceQty", "unitCost", remarks
        )
        VALUES (
          ${randomUUID()}, ${id}, ${item.itemId}, ${systemQty}, ${physicalQty}, ${differenceQty}, ${Number(item.unitCost ?? 0)}, ${item.remarks ?? null}
        )
      `;
    }
    await syncApprovalState(tx, "inventory.adjustment", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "UPDATE", "inventory.adjustment", id, payload);
    await writeHistory(tx, "inventory.adjustment", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function postAdjustmentDocument(id: string, userId: string) {
  const adjustment = await getAdjustmentById(id);
  if (!adjustment) throw new Error("Adjustment not found");
  if (adjustment.status === "POSTED") return { id };
  if (adjustment.status === "CANCELLED" || adjustment.status === "REJECTED") throw new Error("Cancelled or rejected adjustment cannot be posted");
  const totals = computeLineTotals(adjustment.items, "differenceQty");
  await ensureDocumentCanPost({
    documentType: "adjustment",
    referenceType: "inventory.adjustment",
    referenceId: id,
    status: adjustment.status,
    userId,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });

  await sql.begin(async (tx) => {
    for (const item of adjustment.items) {
      await postAdjustment({
        itemId: item.itemId,
        locationId: adjustment.locationId,
        differenceQty: item.differenceQty,
        unitCost: item.unitCost,
        remarks: item.remarks,
        createdById: userId,
        sourceDocumentId: id,
      }, { tx });
    }

    await tx`UPDATE "StockAdjustment" SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${id}`;
    await writeDocumentAudit(tx, userId, "POST", "inventory.adjustment", id, {
      adjustmentId: id,
      totalQuantity: totals.totalQuantity,
      totalValue: totals.totalValue,
    });
    await writeHistory(tx, "inventory.adjustment", id, "POST", userId, adjustment.adjustmentNo);
  });
  return { id };
}

export async function approveAdjustmentDocument(id: string, userId: string) {
  const adjustment = await getAdjustmentById(id);
  if (!adjustment) throw new Error("Adjustment not found");
  await approveApprovalRecord("inventory.adjustment", id, userId);
  await sql`
    UPDATE "StockAdjustment"
    SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  return { id };
}

export async function rejectAdjustmentDocument(id: string, userId: string, comment?: string) {
  const adjustment = await getAdjustmentById(id);
  if (!adjustment) throw new Error("Adjustment not found");
  await rejectApprovalRecord("inventory.adjustment", id, userId, comment);
  await sql`
    UPDATE "StockAdjustment"
    SET status = 'REJECTED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.adjustment", id, "REJECT", userId, comment);
  return { id };
}

export async function cancelAdjustmentDocument(id: string, userId: string, comment?: string) {
  const adjustment = await getAdjustmentById(id);
  if (!adjustment) throw new Error("Adjustment not found");
  if (adjustment.status === "POSTED") throw new Error("Posted adjustment cannot be cancelled");
  await cancelOpenApprovalRecord("inventory.adjustment", id, userId, comment);
  await sql`
    UPDATE "StockAdjustment"
    SET status = 'CANCELLED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.adjustment", id, "CANCEL", userId, comment);
  return { id };
}

export async function listIssues(): Promise<IssueSummary[]> {
  try {
    return await sql<Array<IssueSummary>>`
      SELECT
        si.id,
        si."publicId",
        si."issueNo",
        si."issueDate"::text,
        si."locationId",
        l."locationName" AS "locationName",
        si."issuedToType",
        si."issuedToId",
        COALESCE(d.name, u2.name, si."issuedToId") AS "issuedToName",
        si.purpose,
        si.status,
        COALESCE(si.remarks, '') AS remarks,
        si."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sii.id), 0)::int AS "itemCount"
      FROM "StockIssue" si
      INNER JOIN "Location" l ON l.id = si."locationId"
      INNER JOIN "User" u ON u.id = si."createdById"
      LEFT JOIN "Department" d ON d.id = si."issuedToId"
      LEFT JOIN "User" u2 ON u2.id = si."issuedToId"
      LEFT JOIN "StockIssueItem" sii ON sii."issueId" = si.id
      GROUP BY si.id, l."locationName", d.name, u2.name, u.name
      ORDER BY si."issueDate" DESC, si."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getIssueById(key: string): Promise<IssueDetail | null> {
  try {
    const rows = await sql<Array<IssueSummary>>`
      SELECT
        si.id,
        si."publicId",
        si."issueNo",
        si."issueDate"::text,
        si."locationId",
        l."locationName" AS "locationName",
        si."issuedToType",
        si."issuedToId",
        COALESCE(d.name, u2.name, si."issuedToId") AS "issuedToName",
        si.purpose,
        si.status,
        COALESCE(si.remarks, '') AS remarks,
        si."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sii.id), 0)::int AS "itemCount"
      FROM "StockIssue" si
      INNER JOIN "Location" l ON l.id = si."locationId"
      INNER JOIN "User" u ON u.id = si."createdById"
      LEFT JOIN "Department" d ON d.id = si."issuedToId"
      LEFT JOIN "User" u2 ON u2.id = si."issuedToId"
      LEFT JOIN "StockIssueItem" sii ON sii."issueId" = si.id
      WHERE ${isPublicIdParam(key) ? sql`si."publicId" = ${Number(key)}` : sql`si.id = ${key}`}
      GROUP BY si.id, l."locationName", d.name, u2.name, u.name
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;
    const approval = await getAssignedApprover("inventory.issue", header.id);
    const items = await sql<IssueDetail["items"]>`
      SELECT
        sii.id,
        sii."itemId",
        i."itemCode",
        i."itemName",
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' - ', NULLIF(UPPER(TRIM(COALESCE(uom.code, uom.abbreviation))), ''), NULLIF(TRIM(uom.name), ''))), ''),
          uom.name,
          uom.abbreviation,
          uom.code
        ) AS "uomName",
        sii.quantity,
        COALESCE(returned.quantity, 0) AS "alreadyReturnedQty",
        GREATEST(sii.quantity - COALESCE(returned.quantity, 0), 0) AS "remainingReturnableQty",
        sii."unitCost",
        COALESCE(sii.remarks, '') AS remarks
      FROM "StockIssueItem" sii
      INNER JOIN "Item" i ON i.id = sii."itemId"
      LEFT JOIN "Unit" uom ON uom.id = i."uomId"
      LEFT JOIN LATERAL (
        SELECT SUM(sri.quantity) AS quantity
        FROM "StockReturn" sr
        INNER JOIN "StockReturnItem" sri ON sri."returnId" = sr.id
        WHERE sr.reason = ${header.id}
          AND sri."itemId" = sii."itemId"
          AND sr.status IN ('SUBMITTED', 'APPROVED', 'POSTED')
      ) returned ON true
      WHERE sii."issueId" = ${header.id}
      ORDER BY i."itemCode" ASC
    `;
    return { ...header, ...approval, items };
  } catch {
    return null;
  }
}

export async function createIssue(payload: IssuePayload) {
  const items = validatePositiveLineItems(payload.lineItems);
  const totals = computeLineTotals(items, "quantity");
  await validateInventoryApprovalPolicy({
    documentType: "issue",
    status: payload.status,
    approverId: payload.approverId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const issueNo = normalizeIssueDocumentNumber(payload.issueNo) || await nextDocumentNumber(tx, "ISS", "Stock Issue");
    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "StockIssue" (
        id, "issueNo", "issueDate", "locationId", "issuedToType", "issuedToId",
        purpose, status, remarks, "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${issueNo}, ${new Date(payload.issueDate)}, ${payload.locationId}, ${payload.issuedToType}, ${payload.issuedToId},
        ${payload.purpose}, ${normalizeStatus(payload.status)}, ${payload.remarks ?? null}, ${payload.createdById}, NOW(), NOW()
      )
      RETURNING "publicId"
    `;
    const publicId = inserted[0]?.publicId ?? 0;
    for (const item of items) {
      await tx`
        INSERT INTO "StockIssueItem" (id, "issueId", "itemId", quantity, "unitCost", remarks)
        VALUES (${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.quantity)}, ${Number(item.unitCost ?? 0)}, ${item.remarks ?? null})
      `;
    }
    await syncApprovalState(tx, "inventory.issue", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "CREATE", "inventory.issue", id, payload);
    await writeHistory(tx, "inventory.issue", id, "CREATE", payload.createdById, payload.remarks);
    return { id, publicId, issueNo };
  });
}

export async function updateIssue(id: string, payload: IssuePayload) {
  const items = validatePositiveLineItems(payload.lineItems);
  const totals = computeLineTotals(items, "quantity");
  await validateInventoryApprovalPolicy({
    documentType: "issue",
    status: payload.status,
    approverId: payload.approverId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: string; issueNo: string }>>`SELECT status, "issueNo" FROM "StockIssue" WHERE id = ${id} LIMIT 1`;
    const existing = existingRows[0];
    if (!existing) throw new Error("Issue not found");
    if (existing.status === "POSTED" || existing.status === "CANCELLED") throw new Error("Posted or cancelled issue cannot be edited");

    await tx`
      UPDATE "StockIssue"
      SET
        "issueNo" = ${normalizeIssueDocumentNumber(payload.issueNo) || existing.issueNo},
        "issueDate" = ${new Date(payload.issueDate)},
        "locationId" = ${payload.locationId},
        "issuedToType" = ${payload.issuedToType},
        "issuedToId" = ${payload.issuedToId},
        purpose = ${payload.purpose},
        status = ${normalizeStatus(payload.status)},
        remarks = ${payload.remarks ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "StockIssueItem" WHERE "issueId" = ${id}`;
    for (const item of items) {
      await tx`
        INSERT INTO "StockIssueItem" (id, "issueId", "itemId", quantity, "unitCost", remarks)
        VALUES (${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.quantity)}, ${Number(item.unitCost ?? 0)}, ${item.remarks ?? null})
      `;
    }
    await syncApprovalState(tx, "inventory.issue", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "UPDATE", "inventory.issue", id, payload);
    await writeHistory(tx, "inventory.issue", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function postIssueDocument(id: string, userId: string) {
  const issue = await getIssueById(id);
  if (!issue) throw new Error("Issue not found");
  if (issue.status === "POSTED") return { id };
  if (issue.status === "CANCELLED" || issue.status === "REJECTED") throw new Error("Cancelled or rejected issue cannot be posted");
  const totals = computeLineTotals(issue.items, "quantity");
  await ensureDocumentCanPost({
    documentType: "issue",
    referenceType: "inventory.issue",
    referenceId: id,
    status: issue.status,
    userId,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });

  await sql.begin(async (tx) => {
    for (const item of issue.items) {
      await postStockIssue({
        itemId: item.itemId,
        locationId: issue.locationId,
        sourceModule: "inventory.issue",
        sourceDocumentId: id,
        qtyIn: item.quantity,
        qtyOut: item.quantity,
        unitCost: item.unitCost,
        remarks: item.remarks,
        createdById: userId,
      }, { tx });
    }
    await tx`UPDATE "StockIssue" SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${id}`;
    await writeDocumentAudit(tx, userId, "POST", "inventory.issue", id, {
      issueId: id,
      totalQuantity: totals.totalQuantity,
      totalValue: totals.totalValue,
    });
    await writeHistory(tx, "inventory.issue", id, "POST", userId, issue.issueNo);
  });
  return { id };
}

export async function approveIssueDocument(id: string, userId: string) {
  const issue = await getIssueById(id);
  if (!issue) throw new Error("Issue not found");
  await approveApprovalRecord("inventory.issue", id, userId);
  await sql`
    UPDATE "StockIssue"
    SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  return { id };
}

export async function rejectIssueDocument(id: string, userId: string, comment?: string) {
  const issue = await getIssueById(id);
  if (!issue) throw new Error("Issue not found");
  await rejectApprovalRecord("inventory.issue", id, userId, comment);
  await sql`
    UPDATE "StockIssue"
    SET status = 'REJECTED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.issue", id, "REJECT", userId, comment);
  return { id };
}

export async function cancelIssueDocument(id: string, userId: string, comment?: string) {
  const issue = await getIssueById(id);
  if (!issue) throw new Error("Issue not found");
  if (issue.status === "POSTED") throw new Error("Posted issue cannot be cancelled");
  await cancelOpenApprovalRecord("inventory.issue", id, userId, comment);
  await sql`
    UPDATE "StockIssue"
    SET status = 'CANCELLED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.issue", id, "CANCEL", userId, comment);
  return { id };
}

export async function listReturns(): Promise<ReturnSummary[]> {
  try {
    return await sql<Array<ReturnSummary>>`
      SELECT
        sr.id,
        sr."publicId",
        sr."returnNo",
        sr."returnDate"::text,
        sr."locationId",
        l."locationName" AS "locationName",
        sr."returnedFromType",
        sr."returnedFromId",
        COALESCE(d.name, u2.name, sr."returnedFromId") AS "returnedFromName",
        sr.reason,
        sr.status,
        COALESCE(sr.remarks, '') AS remarks,
        sr."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sri.id), 0)::int AS "itemCount"
      FROM "StockReturn" sr
      INNER JOIN "Location" l ON l.id = sr."locationId"
      INNER JOIN "User" u ON u.id = sr."createdById"
      LEFT JOIN "Department" d ON d.id = sr."returnedFromId"
      LEFT JOIN "User" u2 ON u2.id = sr."returnedFromId"
      LEFT JOIN "StockReturnItem" sri ON sri."returnId" = sr.id
      GROUP BY sr.id, l."locationName", d.name, u2.name, u.name
      ORDER BY sr."returnDate" DESC, sr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getReturnById(key: string): Promise<ReturnDetail | null> {
  try {
    const rows = await sql<Array<ReturnSummary>>`
      SELECT
        sr.id,
        sr."publicId",
        sr."returnNo",
        sr."returnDate"::text,
        sr."locationId",
        l."locationName" AS "locationName",
        sr."returnedFromType",
        sr."returnedFromId",
        COALESCE(d.name, u2.name, sr."returnedFromId") AS "returnedFromName",
        sr.reason,
        sr.status,
        COALESCE(sr.remarks, '') AS remarks,
        sr."createdById",
        u.name AS "createdByName",
        COALESCE(COUNT(sri.id), 0)::int AS "itemCount"
      FROM "StockReturn" sr
      INNER JOIN "Location" l ON l.id = sr."locationId"
      INNER JOIN "User" u ON u.id = sr."createdById"
      LEFT JOIN "Department" d ON d.id = sr."returnedFromId"
      LEFT JOIN "User" u2 ON u2.id = sr."returnedFromId"
      LEFT JOIN "StockReturnItem" sri ON sri."returnId" = sr.id
      WHERE ${isPublicIdParam(key) ? sql`sr."publicId" = ${Number(key)}` : sql`sr.id = ${key}`}
      GROUP BY sr.id, l."locationName", d.name, u2.name, u.name
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;
    const approval = await getAssignedApprover("inventory.return", header.id);
    const items = await sql<ReturnDetail["items"]>`
      SELECT
        sri.id,
        sri."itemId",
        i."itemCode",
        i."itemName",
        uom.name AS "uomName",
        sri.quantity,
        sri."unitCost",
        COALESCE(NULLIF(sri.condition, ''), 'Excess') AS condition,
        COALESCE(sri.remarks, '') AS remarks
      FROM "StockReturnItem" sri
      INNER JOIN "Item" i ON i.id = sri."itemId"
      LEFT JOIN "Unit" uom ON uom.id = i."uomId"
      WHERE sri."returnId" = ${header.id}
      ORDER BY i."itemCode" ASC
    `;
    return { ...header, ...approval, items };
  } catch {
    return null;
  }
}

export async function createReturn(payload: ReturnPayload) {
  const items = validatePositiveLineItems(payload.lineItems);
  const totals = computeLineTotals(items, "quantity");
  await validateInventoryApprovalPolicy({
    documentType: "return",
    status: payload.status,
    approverId: payload.approverId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const returnNo = normalizeReturnDocumentNumber(payload.returnNo) || await nextDocumentNumber(tx, "RET", "Stock Return");
    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "StockReturn" (
        id, "returnNo", "returnDate", "locationId", "returnedFromType", "returnedFromId",
        reason, status, remarks, "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${returnNo}, ${new Date(payload.returnDate)}, ${payload.locationId}, ${payload.returnedFromType}, ${payload.returnedFromId},
        ${payload.reason}, ${normalizeStatus(payload.status)}, ${payload.remarks ?? null}, ${payload.createdById}, NOW(), NOW()
      )
      RETURNING "publicId"
    `;
    const publicId = inserted[0]?.publicId ?? 0;
    for (const item of items) {
      await tx`
        INSERT INTO "StockReturnItem" (id, "returnId", "itemId", quantity, "unitCost", condition, remarks)
        VALUES (${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.quantity)}, ${Number(item.unitCost ?? 0)}, ${item.condition?.trim() || "Excess"}, ${item.remarks ?? null})
      `;
    }
    await syncApprovalState(tx, "inventory.return", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "CREATE", "inventory.return", id, payload);
    await writeHistory(tx, "inventory.return", id, "CREATE", payload.createdById, payload.remarks);
    return { id, publicId, returnNo };
  });
}

export async function updateReturn(id: string, payload: ReturnPayload) {
  const items = validatePositiveLineItems(payload.lineItems);
  const totals = computeLineTotals(items, "quantity");
  await validateInventoryApprovalPolicy({
    documentType: "return",
    status: payload.status,
    approverId: payload.approverId,
    createdById: payload.createdById,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: string; returnNo: string }>>`SELECT status, "returnNo" FROM "StockReturn" WHERE id = ${id} LIMIT 1`;
    const existing = existingRows[0];
    if (!existing) throw new Error("Return not found");
    if (existing.status === "POSTED" || existing.status === "CANCELLED") throw new Error("Posted or cancelled return cannot be edited");

    await tx`
      UPDATE "StockReturn"
      SET
        "returnNo" = ${normalizeReturnDocumentNumber(payload.returnNo) || existing.returnNo},
        "returnDate" = ${new Date(payload.returnDate)},
        "locationId" = ${payload.locationId},
        "returnedFromType" = ${payload.returnedFromType},
        "returnedFromId" = ${payload.returnedFromId},
        reason = ${payload.reason},
        status = ${normalizeStatus(payload.status)},
        remarks = ${payload.remarks ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "StockReturnItem" WHERE "returnId" = ${id}`;
    for (const item of items) {
      await tx`
        INSERT INTO "StockReturnItem" (id, "returnId", "itemId", quantity, "unitCost", condition, remarks)
        VALUES (${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.quantity)}, ${Number(item.unitCost ?? 0)}, ${item.condition?.trim() || "Excess"}, ${item.remarks ?? null})
      `;
    }
    await syncApprovalState(tx, "inventory.return", id, normalizeStatus(payload.status), payload.createdById, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.createdById, "UPDATE", "inventory.return", id, payload);
    await writeHistory(tx, "inventory.return", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function postReturnDocument(id: string, userId: string) {
  const returnDoc = await getReturnById(id);
  if (!returnDoc) throw new Error("Return not found");
  if (returnDoc.status === "POSTED") return { id };
  if (returnDoc.status === "CANCELLED" || returnDoc.status === "REJECTED") throw new Error("Cancelled or rejected return cannot be posted");
  const totals = computeLineTotals(returnDoc.items, "quantity");
  await ensureDocumentCanPost({
    documentType: "return",
    referenceType: "inventory.return",
    referenceId: id,
    status: returnDoc.status,
    userId,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  await sql.begin(async (tx) => {
    for (const item of returnDoc.items) {
      await postStockReturn({
        itemId: item.itemId,
        locationId: returnDoc.locationId,
        sourceModule: "inventory.return",
        sourceDocumentId: id,
        qtyIn: item.quantity,
        qtyOut: 0,
        unitCost: item.unitCost,
        remarks: item.remarks,
        createdById: userId,
      }, { tx });
    }
    await tx`UPDATE "StockReturn" SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${id}`;
    await writeDocumentAudit(tx, userId, "POST", "inventory.return", id, {
      returnId: id,
      totalQuantity: totals.totalQuantity,
      totalValue: totals.totalValue,
    });
    await writeHistory(tx, "inventory.return", id, "POST", userId, returnDoc.returnNo);
  });
  return { id };
}

export async function approveReturnDocument(id: string, userId: string) {
  const returnDoc = await getReturnById(id);
  if (!returnDoc) throw new Error("Return not found");
  await approveApprovalRecord("inventory.return", id, userId);
  await sql`
    UPDATE "StockReturn"
    SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  return { id };
}

export async function rejectReturnDocument(id: string, userId: string, comment?: string) {
  const returnDoc = await getReturnById(id);
  if (!returnDoc) throw new Error("Return not found");
  await rejectApprovalRecord("inventory.return", id, userId, comment);
  await sql`
    UPDATE "StockReturn"
    SET status = 'REJECTED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.return", id, "REJECT", userId, comment);
  return { id };
}

export async function cancelReturnDocument(id: string, userId: string, comment?: string) {
  const returnDoc = await getReturnById(id);
  if (!returnDoc) throw new Error("Return not found");
  if (returnDoc.status === "POSTED") throw new Error("Posted return cannot be cancelled");
  await cancelOpenApprovalRecord("inventory.return", id, userId, comment);
  await sql`
    UPDATE "StockReturn"
    SET status = 'CANCELLED', "updatedAt" = NOW()
    WHERE id = ${id}
  `;
  await writeHistory(sql, "inventory.return", id, "CANCEL", userId, comment);
  return { id };
}

export async function listRequisitions(): Promise<RequisitionSummary[]> {
  try {
    return await sql<Array<RequisitionSummary>>`
      SELECT
        sr.id,
        sr."publicId",
        sr."requisitionNo",
        sr."requisitionDate"::text,
        sr."requestedById",
        u.name AS "requestedByName",
        sr."fromLocationId",
        fl."locationName" AS "fromLocationName",
        sr."toLocationId",
        tl."locationName" AS "toLocationName",
        sr."toDepartmentId",
        d.name AS "toDepartmentName",
        sr."shiftCode",
        sr."neededByDate"::text AS "neededByDate",
        sr.purpose,
        sr.status,
        COALESCE(sr.remarks, '') AS remarks,
        COALESCE(COUNT(sri.id), 0)::int AS "itemCount"
      FROM "StoreRequisition" sr
      LEFT JOIN "User" u ON u.id = sr."requestedById"
      LEFT JOIN "Location" fl ON fl.id = sr."fromLocationId"
      LEFT JOIN "Location" tl ON tl.id = sr."toLocationId"
      LEFT JOIN "Department" d ON d.id = sr."toDepartmentId"
      LEFT JOIN "StoreRequisitionItem" sri ON sri."requisitionId" = sr.id
      GROUP BY sr.id, u.name, fl."locationName", tl."locationName", d.name
      ORDER BY sr."requisitionDate" DESC, sr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getRequisitionById(key: string): Promise<RequisitionDetail | null> {
  try {
    const rows = await sql<Array<RequisitionSummary>>`
      SELECT
        sr.id,
        sr."publicId",
        sr."requisitionNo",
        sr."requisitionDate"::text,
        sr."requestedById",
        u.name AS "requestedByName",
        sr."fromLocationId",
        fl."locationName" AS "fromLocationName",
        sr."toLocationId",
        tl."locationName" AS "toLocationName",
        sr."toDepartmentId",
        d.name AS "toDepartmentName",
        sr."shiftCode",
        sr."neededByDate"::text AS "neededByDate",
        sr.purpose,
        sr.status,
        COALESCE(sr.remarks, '') AS remarks,
        COALESCE(COUNT(sri.id), 0)::int AS "itemCount"
      FROM "StoreRequisition" sr
      LEFT JOIN "User" u ON u.id = sr."requestedById"
      LEFT JOIN "Location" fl ON fl.id = sr."fromLocationId"
      LEFT JOIN "Location" tl ON tl.id = sr."toLocationId"
      LEFT JOIN "Department" d ON d.id = sr."toDepartmentId"
      LEFT JOIN "StoreRequisitionItem" sri ON sri."requisitionId" = sr.id
      WHERE ${isPublicIdParam(key) ? sql`sr."publicId" = ${Number(key)}` : sql`sr.id = ${key}`}
      GROUP BY sr.id, u.name, fl."locationName", tl."locationName", d.name
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;
    const approval = await getAssignedApprover("inventory.requisition", header.id);
    const items = await sql<RequisitionDetail["items"]>`
      SELECT
        sri.id,
        sri."itemId",
        i."itemCode",
        i."itemName",
        u.name AS "uomName",
        sri."requestedQty",
        sri."approvedQty",
        sri."issuedQty",
        COALESCE(sri.remarks, '') AS remarks
      FROM "StoreRequisitionItem" sri
      INNER JOIN "Item" i ON i.id = sri."itemId"
      LEFT JOIN "Unit" u ON u.id = i."uomId"
      WHERE sri."requisitionId" = ${header.id}
      ORDER BY i."itemCode" ASC
    `;
    return { ...header, ...approval, items };
  } catch {
    return null;
  }
}

export async function createRequisition(payload: RequisitionPayload) {
  const items = payload.lineItems.filter((row) => row.itemId);
  const totals = computeLineTotals(items, "requestedQty");
  await validateInventoryApprovalPolicy({
    documentType: "requisition",
    status: payload.status,
    approverId: payload.approverId,
    fromLocationId: payload.fromLocationId ?? undefined,
    createdById: payload.actorId,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const requisitionNo = await resolveStoreRequisitionNumber(tx, payload.requisitionNo);
    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "StoreRequisition" (
        id, "requisitionNo", "requisitionDate", "requestedById", "fromLocationId", "toLocationId",
        "toDepartmentId", "shiftCode", "neededByDate", purpose, status, remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${requisitionNo}, ${new Date(payload.requisitionDate)}, ${payload.requestedById}, ${payload.fromLocationId ?? null}, ${payload.toLocationId ?? null},
        ${payload.toDepartmentId ?? null}, ${payload.shiftCode ?? null}, ${payload.neededByDate ? new Date(payload.neededByDate) : null}, ${payload.purpose}, ${normalizeStatus(payload.status)}, ${payload.remarks ?? null}, NOW(), NOW()
      )
      RETURNING "publicId"
    `;
    const publicId = inserted[0]?.publicId ?? 0;
    for (const item of items) {
      await tx`
        INSERT INTO "StoreRequisitionItem" (
          id, "requisitionId", "itemId", "requestedQty", "approvedQty", "issuedQty", remarks
        )
        VALUES (
          ${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.requestedQty ?? 0)}, ${Number(item.approvedQty ?? 0)}, ${Number(item.issuedQty ?? 0)}, ${item.remarks ?? null}
        )
      `;
    }
    await syncApprovalState(tx, "inventory.requisition", id, normalizeStatus(payload.status), payload.actorId, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.actorId, "CREATE", "inventory.requisition", id, payload);
    await writeHistory(tx, "inventory.requisition", id, "CREATE", payload.actorId, payload.remarks);
    return { id, publicId, requisitionNo };
  });
}

export async function updateRequisition(id: string, payload: RequisitionPayload) {
  const items = payload.lineItems.filter((row) => row.itemId);
  const totals = computeLineTotals(items, "requestedQty");
  await validateInventoryApprovalPolicy({
    documentType: "requisition",
    status: payload.status,
    approverId: payload.approverId,
    fromLocationId: payload.fromLocationId ?? undefined,
    createdById: payload.actorId,
    totalQuantity: totals.totalQuantity,
    totalValue: totals.totalValue,
  });
  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ status: string }>>`SELECT status FROM "StoreRequisition" WHERE id = ${id} LIMIT 1`;
    const existing = existingRows[0];
    if (!existing) throw new Error("Store requisition not found");
    if (existing.status === "CANCELLED" || existing.status === "ISSUED") throw new Error("Cancelled or issued requisition cannot be edited");

    const requisitionNo = await resolveStoreRequisitionNumber(tx, payload.requisitionNo, id);
    await tx`
      UPDATE "StoreRequisition"
      SET
        "requisitionNo" = ${requisitionNo},
        "requisitionDate" = ${new Date(payload.requisitionDate)},
        "requestedById" = ${payload.requestedById},
        "fromLocationId" = ${payload.fromLocationId ?? null},
        "toLocationId" = ${payload.toLocationId ?? null},
        "toDepartmentId" = ${payload.toDepartmentId ?? null},
        "shiftCode" = ${payload.shiftCode ?? null},
        "neededByDate" = ${payload.neededByDate ? new Date(payload.neededByDate) : null},
        purpose = ${payload.purpose},
        status = ${normalizeStatus(payload.status)},
        remarks = ${payload.remarks ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "StoreRequisitionItem" WHERE "requisitionId" = ${id}`;
    for (const item of items) {
      await tx`
        INSERT INTO "StoreRequisitionItem" (
          id, "requisitionId", "itemId", "requestedQty", "approvedQty", "issuedQty", remarks
        )
        VALUES (
          ${randomUUID()}, ${id}, ${item.itemId}, ${Number(item.requestedQty ?? 0)}, ${Number(item.approvedQty ?? 0)}, ${Number(item.issuedQty ?? 0)}, ${item.remarks ?? null}
        )
      `;
    }
    await syncApprovalState(tx, "inventory.requisition", id, normalizeStatus(payload.status), payload.actorId, payload.approverId, payload.remarks);
    await writeDocumentAudit(tx, payload.actorId, "UPDATE", "inventory.requisition", id, payload);
    await writeHistory(tx, "inventory.requisition", id, "UPDATE", payload.actorId, payload.remarks);
    return { id };
  });
}

export async function approveRequisition(id: string, userId: string) {
  const requisition = await getRequisitionById(id);
  if (!requisition) throw new Error("Store requisition not found");
  await approveApprovalRecord("inventory.requisition", id, userId);
  await sql`UPDATE "StoreRequisition" SET status = 'APPROVED', "updatedAt" = NOW() WHERE id = ${id}`;
  await writeHistory(sql, "inventory.requisition", id, "APPROVE", userId);
  return { id };
}

export async function rejectRequisition(id: string, userId: string, comment?: string) {
  const requisition = await getRequisitionById(id);
  if (!requisition) throw new Error("Store requisition not found");
  await rejectApprovalRecord("inventory.requisition", id, userId, comment);
  await sql`UPDATE "StoreRequisition" SET status = 'REJECTED', "updatedAt" = NOW() WHERE id = ${id}`;
  await writeHistory(sql, "inventory.requisition", id, "REJECT", userId, comment);
  return { id };
}

export async function cancelRequisition(id: string, userId: string, comment?: string) {
  const requisition = await getRequisitionById(id);
  if (!requisition) throw new Error("Store requisition not found");
  if (requisition.status === "ISSUED") throw new Error("Issued requisition cannot be cancelled");
  await cancelOpenApprovalRecord("inventory.requisition", id, userId, comment);
  await sql`UPDATE "StoreRequisition" SET status = 'CANCELLED', "updatedAt" = NOW() WHERE id = ${id}`;
  await writeHistory(sql, "inventory.requisition", id, "CANCEL", userId, comment);
  return { id };
}

export async function generateIssueFromRequisition(id: string, userId: string) {
  const requisition = await getRequisitionById(id);
  if (!requisition) {
    throw new Error("Store requisition not found");
  }

  if (requisition.status !== "APPROVED" && requisition.status !== "PARTIALLY_ISSUED") {
    throw new Error("Only approved requisitions can generate stock issues");
  }

  if (!requisition.fromLocationId) {
    throw new Error("Requisition source location is required before generating an issue");
  }

  const lineItems = requisition.items
    .map((item) => {
      const quantity = Number(item.approvedQty || item.requestedQty || 0);
      return {
        itemId: item.itemId,
        quantity,
        unitCost: 0,
        remarks: item.remarks,
      };
    })
    .filter((item) => item.quantity > 0);

  if (lineItems.length === 0) {
    throw new Error("Requisition has no approved quantities to issue");
  }

  const issuedToType = requisition.toDepartmentId ? "Department" : requisition.toLocationId ? "Location" : "Other";
  const issuedToId = requisition.toDepartmentId ?? requisition.toLocationId ?? requisition.requestedById;

  const issue = await createIssue({
    issueDate: new Date().toISOString(),
    locationId: requisition.fromLocationId,
    issuedToType,
    issuedToId,
    purpose: requisition.purpose,
    remarks: `Generated from ${requisition.requisitionNo}`,
    status: "APPROVED",
    createdById: userId,
    lineItems,
  });

  await postIssueDocument(issue.id, userId);

  await sql.begin(async (tx) => {
    for (const item of requisition.items) {
      const quantity = Number(item.approvedQty || item.requestedQty || 0);
      await tx`
        UPDATE "StoreRequisitionItem"
        SET "issuedQty" = ${quantity}
        WHERE id = ${item.id}
      `;
    }

    await tx`
      UPDATE "StoreRequisition"
      SET status = 'ISSUED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeDocumentAudit(tx, userId, "GENERATE_ISSUE", "inventory.requisition", id, {
      requisitionId: id,
      issueId: issue.id,
      lineItems,
    });
    await writeHistory(tx, "inventory.requisition", id, "GENERATE_ISSUE", userId, issue.id);
  });

  return { id, issueId: issue.id };
}
