import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  DEFAULT_DOCUMENT_NUMBERING,
  formatDocumentNumber,
  syncDocumentSequenceFromColumn,
} from "@/lib/document-numbering";

export type ProcurementStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_CONVERTED"
  | "CONVERTED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "PARTIALLY_RETURNED"
  | "RETURNED"
  | "PARTIAL_PAID"
  | "PAID"
  | "POSTED"
  | "CANCELLED"
  | "CLOSED";

export type ProcurementDocumentType =
  | "requisition"
  | "purchase-order"
  | "grn"
  | "supplier-return"
  | "invoice"
  | "payment";

export type Tx = typeof sql;

export function assertCanSubmitProcurementStatus(status: string) {
  const current = String(status).toUpperCase();
  if (current !== "DRAFT" && current !== "REJECTED") {
    throw new Error(`Only draft or rejected documents can be submitted. Current status: ${status}`);
  }
}

export function normalizeProcurementStatus(value?: string): ProcurementStatus {
  const normalized = String(value ?? "DRAFT").trim().toUpperCase();
  switch (normalized) {
    case "SUBMITTED":
    case "APPROVED":
    case "REJECTED":
    case "PARTIALLY_CONVERTED":
    case "CONVERTED":
    case "PARTIALLY_RECEIVED":
    case "RECEIVED":
    case "PARTIALLY_RETURNED":
    case "RETURNED":
    case "PARTIAL_PAID":
    case "PAID":
    case "POSTED":
    case "CANCELLED":
    case "CLOSED":
      return normalized;
    default:
      return "DRAFT";
  }
}

type ProcurementNumberingConfig = {
  id: string;
  prefix: string;
  prefixFormat: string;
  separator: string;
  yearFormat: string;
  monthFormat: string;
  dayFormat: string;
  sequenceLength: number;
  currentSequence: number;
};

function formatProcurementDocumentNumber(config: ProcurementNumberingConfig, sequence: number) {
  return formatDocumentNumber(config, sequence);
}

async function syncProcurementSequenceFromRecords(
  tx: Tx,
  config: ProcurementNumberingConfig,
): Promise<number> {
  const tableByPrefix: Record<string, { table: string; column: string }> = {
    PO: { table: "PurchaseOrder", column: "poNo" },
    PR: { table: "PurchaseRequisition", column: "requisitionNo" },
    GRN: { table: "GoodsReceipt", column: "grnNo" },
    SRET: { table: "SupplierReturn", column: "returnNo" },
    SINV: { table: "SupplierInvoice", column: "invoiceNo" },
    SPAY: { table: "SupplierPayment", column: "paymentNo" },
    ARCV: { table: "AssetReceipt", column: "assetReceiptNo" },
  };
  const mapping = tableByPrefix[config.prefix];
  if (!mapping) {
    return Number(config.currentSequence ?? 0);
  }
  return syncDocumentSequenceFromColumn(tx, config, mapping.table, mapping.column);
}

async function ensureProcurementNumbering(tx: Tx, prefix: string, description: string) {
  await tx`
    INSERT INTO "DocumentNumbering" (
      id, prefix, description, "prefixFormat", separator,
      "yearFormat", "monthFormat", "dayFormat", "sequenceLength",
      "currentSequence", "isActive", "isArchived"
    )
    VALUES (
      ${`docnum-${prefix.toLowerCase()}`},
      ${prefix},
      ${description},
      ${DEFAULT_DOCUMENT_NUMBERING.prefixFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.separator},
      ${DEFAULT_DOCUMENT_NUMBERING.yearFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.monthFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.dayFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.sequenceLength},
      ${DEFAULT_DOCUMENT_NUMBERING.currentSequence},
      true,
      false
    )
    ON CONFLICT ("prefix") DO NOTHING
  `;

  const currentRows = await tx<ProcurementNumberingConfig[]>`
    SELECT
      id,
      prefix,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence"
    FROM "DocumentNumbering"
    WHERE prefix = ${prefix}
    LIMIT 1
  `;

  return currentRows[0];
}

export async function nextProcurementDocumentNumber(
  tx: Tx,
  prefix: string,
  description: string,
) {
  const config = await ensureProcurementNumbering(tx, prefix, description);
  const lockedRows = await tx<ProcurementNumberingConfig[]>`
    SELECT
      id,
      prefix,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence"
    FROM "DocumentNumbering"
    WHERE id = ${config.id}
    LIMIT 1
    FOR UPDATE
  `;
  const locked = lockedRows[0] ?? config;
  const syncedSequence = await syncProcurementSequenceFromRecords(tx, locked);
  const nextSequence = syncedSequence + 1;

  await tx`
    UPDATE "DocumentNumbering"
    SET "currentSequence" = ${nextSequence}
    WHERE id = ${locked.id}
  `;

  return formatProcurementDocumentNumber(locked, nextSequence);
}

export async function peekProcurementDocumentNumber(prefix: string, description: string, tx: Tx = sql) {
  const config = await ensureProcurementNumbering(tx, prefix, description);
  if (!config) {
    return formatDocumentNumber(
      {
        prefix,
        prefixFormat: DEFAULT_DOCUMENT_NUMBERING.prefixFormat,
        separator: DEFAULT_DOCUMENT_NUMBERING.separator,
        yearFormat: DEFAULT_DOCUMENT_NUMBERING.yearFormat,
        monthFormat: DEFAULT_DOCUMENT_NUMBERING.monthFormat,
        dayFormat: DEFAULT_DOCUMENT_NUMBERING.dayFormat,
        sequenceLength: DEFAULT_DOCUMENT_NUMBERING.sequenceLength,
      },
      1,
    );
  }
  const syncedSequence = await syncProcurementSequenceFromRecords(tx, config);
  return formatProcurementDocumentNumber(config, syncedSequence + 1);
}

export function normalizeRequestedDocumentNo(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || /^assigned on save$/i.test(trimmed)) return "";
  return trimmed;
}

export async function resolveProcurementDocumentNumber(
  tx: Tx,
  prefix: string,
  description: string,
  requested?: string | null,
  options?: { isTaken?: (documentNo: string) => Promise<boolean> },
) {
  const requestedNo = normalizeRequestedDocumentNo(requested);
  const peeked = await peekProcurementDocumentNumber(prefix, description, tx);
  const isTaken = options?.isTaken ?? (async () => false);

  // Honor a user-edited number only when it is still available.
  if (requestedNo && requestedNo !== peeked && !(await isTaken(requestedNo))) {
    return requestedNo;
  }

  // Allocate the next sequence value, skipping numbers already used in the database.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = await nextProcurementDocumentNumber(tx, prefix, description);
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error(`${prefix} number could not be allocated`);
}

export async function writeProcurementAudit(
  tx: Tx,
  userId: string,
  module: string,
  action: string,
  recordId: string,
  newValue?: unknown,
  oldValue?: unknown,
) {
  await tx`
    INSERT INTO "AuditLog" (
      id, "userId", action, module, "recordId", "oldValue", "newValue", "isArchived", timestamp
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

export async function writeProcurementHistory(
  tx: Tx,
  referenceType: string,
  referenceId: string,
  action: string,
  performedById: string,
  comment?: string,
) {
  await tx`
    INSERT INTO "DocumentHistory" (
      id, "referenceType", "referenceId", action, comment, "performedById", "isArchived", "createdAt"
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

async function getApprovalSetting(documentType: ProcurementDocumentType, tx: Tx = sql) {
  const keyMap: Record<ProcurementDocumentType, string> = {
    requisition: "pr.requireApproval",
    "purchase-order": "po.requireApproval",
    grn: "grn.requireApproval",
    "supplier-return": "supplierReturn.requireApproval",
    invoice: "invoice.requireApproval",
    payment: "payment.requireApproval",
  };

  const rows = await tx<Array<{ value: string }>>`
    SELECT value
    FROM "ModuleSetting"
    WHERE module = 'procurement'
      AND key = ${keyMap[documentType]}
      AND "isArchived" = false
    LIMIT 1
  `;

  const value = String(rows[0]?.value ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export async function syncProcurementApproval(
  tx: Tx,
  input: {
    referenceType: string;
    referenceId: string;
    documentType: ProcurementDocumentType;
    status: ProcurementStatus;
    requestedById: string;
    assignedApproverId?: string | null;
    comment?: string;
  },
) {
  const approvalRequired = await getApprovalSetting(input.documentType, tx);

  if (input.status === "SUBMITTED" && approvalRequired) {
    const latestRows = await tx<Array<{ id: string; status: string; assignedApproverId: string | null }>>`
      SELECT id, status, "assignedApproverId"
      FROM "Approval"
      WHERE "referenceType" = ${input.referenceType}
        AND "referenceId" = ${input.referenceId}
        AND "isArchived" = false
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const latest = latestRows[0];
    if (latest?.status === "PENDING" && latest.assignedApproverId === (input.assignedApproverId ?? null)) {
      return;
    }

    if (latest?.status === "PENDING" && latest.assignedApproverId !== (input.assignedApproverId ?? null)) {
      await tx`
        UPDATE "Approval"
        SET
          "assignedApproverId" = ${input.assignedApproverId ?? null},
          comment = ${input.comment ?? null},
          "updatedAt" = NOW()
        WHERE id = ${latest.id}
      `;
      return;
    }

    await tx`
      INSERT INTO "Approval" (
        id, "referenceType", "referenceId", status, "requestedById",
        "assignedApproverId", comment, "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.referenceType},
        ${input.referenceId},
        'PENDING',
        ${input.requestedById},
        ${input.assignedApproverId ?? null},
        ${input.comment ?? null},
        false,
        NOW(),
        NOW()
      )
    `;
    return;
  }

  if (
    input.status === "DRAFT" ||
    input.status === "CANCELLED" ||
    input.status === "REJECTED" ||
    (input.status === "SUBMITTED" && !approvalRequired)
  ) {
    await tx`
      UPDATE "Approval"
      SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE "referenceType" = ${input.referenceType}
        AND "referenceId" = ${input.referenceId}
        AND status = 'PENDING'
        AND "isArchived" = false
    `;
  }
}

export async function ensureProcurementCanPost(input: {
  documentType: ProcurementDocumentType;
  referenceType: string;
  referenceId: string;
  status: ProcurementStatus;
}) {
  const approvalRequired = await getApprovalSetting(input.documentType);
  if (!approvalRequired) {
    return;
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
    throw new Error("Document requires approval before posting, but no approval record was found");
  }
  if (latest.status === "PENDING") {
    throw new Error("Document is awaiting approval and cannot be posted yet");
  }
  if (latest.status === "REJECTED" || latest.status === "CANCELLED") {
    throw new Error(`Document cannot be posted because approval is ${latest.status.toLowerCase()}`);
  }
}

export async function approveProcurementApproval(
  referenceType: string,
  referenceId: string,
  userId: string,
  comment?: string,
) {
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
      return null;
    }
    if (latest.status === "APPROVED") {
      return latest.id;
    }
    if (latest.status !== "PENDING") {
      throw new Error(`Only pending approvals can be approved. Current status: ${latest.status}`);
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

export async function rejectProcurementApproval(
  referenceType: string,
  referenceId: string,
  userId: string,
  comment?: string,
) {
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
      return null;
    }
    if (latest.status !== "PENDING") {
      throw new Error(`Only pending approvals can be rejected. Current status: ${latest.status}`);
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
