import { sql } from "@/lib/db";
import type {
  DocumentAttachmentEntry,
  DocumentCommentEntry,
  DocumentHistoryEntry,
  DocumentStatus,
} from "./types";
import type {
  AddAttachmentInput,
  AddCommentInput,
  AddHistoryInput,
} from "@/validators/transactions";

const TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["POSTED", "REJECTED"],
  REJECTED: ["DRAFT"],
  POSTED: ["VOIDED"],
  VOIDED: [],
  CANCELLED: [],
  ARCHIVED: [],
};

export function canTransition(
  from: DocumentStatus,
  to: DocumentStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatus(
  current: DocumentStatus,
  action: string,
): DocumentStatus | null {
  const map: Record<string, DocumentStatus> = {
    SUBMIT: "PENDING",
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    POST: "POSTED",
    VOID: "VOIDED",
    CANCEL: "CANCELLED",
    ARCHIVE: "ARCHIVED",
    RESUBMIT: "PENDING",
  };
  const next = map[action.toUpperCase()] ?? null;
  if (next && canTransition(current, next)) return next;
  return null;
}

export function getAvailableActions(status: DocumentStatus): string[] {
  const actions: Record<DocumentStatus, string[]> = {
    DRAFT: ["Submit", "Print", "Export"],
    PENDING: ["Approve", "Reject", "Print", "Export"],
    APPROVED: ["Post", "Print", "Export"],
    REJECTED: ["Resubmit", "Print", "Export"],
    POSTED: ["Void", "Print", "Export"],
    VOIDED: ["Print", "Export"],
    CANCELLED: ["Print", "Export"],
    ARCHIVED: ["Print", "Export"],
  };
  return actions[status] ?? ["Print", "Export"];
}

export function getStatusBadgeVariant(status: DocumentStatus): string {
  const variants: Record<DocumentStatus, string> = {
    DRAFT: "draft",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    POSTED: "posted",
    VOIDED: "voided",
    CANCELLED: "inactive",
    ARCHIVED: "completed",
  };
  return variants[status] ?? "draft";
}

type HistoryRow = {
  id: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  performedBy: string;
  performedByName: string;
  createdAt: Date;
};

type CommentRow = {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
};

type AttachmentRow = {
  id: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  fileUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
};

function mapHistoryRow(row: HistoryRow): DocumentHistoryEntry {
  return {
    id: row.id,
    action: row.action,
    fieldName: row.fieldName ?? undefined,
    oldValue: row.oldValue ?? undefined,
    newValue: row.newValue ?? undefined,
    comment: row.comment ?? undefined,
    performedBy: row.performedBy,
    performedByName: row.performedByName,
    createdAt: row.createdAt,
  };
}

function mapCommentRow(row: CommentRow): DocumentCommentEntry {
  return {
    id: row.id,
    content: row.content,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
  };
}

function mapAttachmentRow(row: AttachmentRow): DocumentAttachmentEntry {
  return {
    id: row.id,
    fileName: row.fileName,
    fileSize: row.fileSize ?? undefined,
    mimeType: row.mimeType ?? undefined,
    fileUrl: row.fileUrl,
    uploadedBy: row.uploadedBy,
    uploadedByName: row.uploadedByName,
    createdAt: row.createdAt,
  };
}

export async function getDocumentHistory(
  referenceType: string,
  referenceId: string,
): Promise<DocumentHistoryEntry[]> {
  const rows = await sql<HistoryRow[]>`
    SELECT
      h.id,
      h.action,
      h."fieldName",
      h."oldValue",
      h."newValue",
      h.comment,
      h."performedById" AS "performedBy",
      COALESCE(u.name, u.email, '') AS "performedByName",
      h."createdAt"
    FROM "DocumentHistory" h
    LEFT JOIN "User" u ON u.id = h."performedById"
    WHERE h."referenceType" = ${referenceType}
      AND h."referenceId" = ${referenceId}
      AND h."isArchived" = false
    ORDER BY h."createdAt" DESC
  `;

  return rows.map(mapHistoryRow);
}

export async function addHistoryEntry(data: AddHistoryInput): Promise<void> {
  await sql`
    INSERT INTO "DocumentHistory" (
      "referenceType",
      "referenceId",
      action,
      "fieldName",
      "oldValue",
      "newValue",
      comment,
      "performedById",
      "isArchived",
      "createdAt"
    )
    VALUES (
      ${data.referenceType},
      ${data.referenceId},
      ${data.action},
      ${data.fieldName ?? null},
      ${data.oldValue ?? null},
      ${data.newValue ?? null},
      ${data.comment ?? null},
      ${data.performedById},
      false,
      NOW()
    )
  `;
}

export async function getComments(
  referenceType: string,
  referenceId: string,
): Promise<DocumentCommentEntry[]> {
  const rows = await sql<CommentRow[]>`
    SELECT
      c.id,
      c.content,
      c."createdById" AS "createdBy",
      COALESCE(u.name, u.email, '') AS "createdByName",
      c."createdAt"
    FROM "DocumentComment" c
    LEFT JOIN "User" u ON u.id = c."createdById"
    WHERE c."referenceType" = ${referenceType}
      AND c."referenceId" = ${referenceId}
      AND c."isArchived" = false
    ORDER BY c."createdAt" DESC
  `;

  return rows.map(mapCommentRow);
}

export async function addComment(data: AddCommentInput): Promise<void> {
  await sql`
    INSERT INTO "DocumentComment" (
      "referenceType",
      "referenceId",
      content,
      "createdById",
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${data.referenceType},
      ${data.referenceId},
      ${data.content},
      ${data.createdById},
      false,
      NOW(),
      NOW()
    )
  `;
}

export async function deleteComment(id: string): Promise<void> {
  await sql`
    UPDATE "DocumentComment"
    SET "isArchived" = true,
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function getAttachments(
  referenceType: string,
  referenceId: string,
): Promise<DocumentAttachmentEntry[]> {
  const rows = await sql<AttachmentRow[]>`
    SELECT
      a.id,
      a."fileName",
      a."fileSize",
      a."mimeType",
      a."fileUrl",
      a."uploadedById" AS "uploadedBy",
      COALESCE(u.name, u.email, '') AS "uploadedByName",
      a."createdAt"
    FROM "DocumentAttachment" a
    LEFT JOIN "User" u ON u.id = a."uploadedById"
    WHERE a."referenceType" = ${referenceType}
      AND a."referenceId" = ${referenceId}
      AND a."isArchived" = false
    ORDER BY a."createdAt" DESC
  `;

  return rows.map(mapAttachmentRow);
}

export async function uploadAttachment(
  data: AddAttachmentInput,
): Promise<void> {
  await sql`
    INSERT INTO "DocumentAttachment" (
      "referenceType",
      "referenceId",
      "fileName",
      "fileSize",
      "mimeType",
      "fileUrl",
      "uploadedById",
      "isArchived",
      "createdAt"
    )
    VALUES (
      ${data.referenceType},
      ${data.referenceId},
      ${data.fileName},
      ${data.fileSize ?? null},
      ${data.mimeType ?? null},
      ${data.fileUrl},
      ${data.uploadedById},
      false,
      NOW()
    )
  `;
}

export async function deleteAttachment(id: string): Promise<void> {
  await sql`
    UPDATE "DocumentAttachment"
    SET "isArchived" = true
    WHERE id = ${id}
  `;
}

async function recordStatusAction(
  referenceType: string,
  referenceId: string,
  userId: string,
  action: string,
  notes?: string,
): Promise<void> {
  await addHistoryEntry({
    referenceType,
    referenceId,
    action,
    comment: notes,
    performedById: userId,
  });
}

export async function submitDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  notes?: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "SUBMITTED", notes);
}

export async function approveDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  notes?: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "APPROVED", notes);
}

export async function rejectDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  notes?: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "REJECTED", notes);
}

export async function postDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "POSTED");
}

export async function voidDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "VOIDED", reason);
}

export async function cancelDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "CANCELLED", reason);
}

export async function archiveDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "ARCHIVED");
}
