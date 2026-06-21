// services/transactions/transactionService.ts
// Generic transaction layer — status management, history, comments, attachments.
// Every document type (PO, GRN, invoice, etc.) inherits from this service.
//
// TODO: Replace in-memory stores with real Prisma queries when the DB is ready.

import type {
  DocumentStatus,
  DocumentHistoryEntry,
  DocumentCommentEntry,
  DocumentAttachmentEntry,
} from "./types";
import type {
  AddHistoryInput,
  AddCommentInput,
  AddAttachmentInput,
} from "@/validators/transactions";

// ─── Status machine ──────────────────────────────────────────────────────────

/** Ordered lifecycle — used to validate transitions. */
const STATUS_ORDER: Record<DocumentStatus, number> = {
  DRAFT: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: -1, // terminal (negative = dead-end)
  POSTED: 3,
  VOIDED: -2, // terminal
  CANCELLED: -3, // terminal
  ARCHIVED: 10, // terminal
};

/** Allowed transitions keyed by [from → to]. */
const TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["POSTED", "REJECTED"],
  REJECTED: ["DRAFT"], // allowed to re-submit
  POSTED: ["VOIDED"],
  VOIDED: [],
  CANCELLED: [],
  ARCHIVED: [],
};

/**
 * Returns `true` if the transition from → to is valid.
 */
export function canTransition(
  from: DocumentStatus,
  to: DocumentStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Given the current status and an action name, returns the next status or null.
 */
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

/**
 * Returns the list of available action labels for a given status.
 */
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

/**
 * Maps a document status to a Tailwind badge variant string.
 */
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

// ─── In-memory stores (placeholder) ──────────────────────────────────────────
// TODO: Replace with Prisma queries against DocumentHistory, DocumentComment,
//       DocumentAttachment tables.

/** Internal store entries that also carry the lookup key. */
interface HistoryStoreEntry extends DocumentHistoryEntry {
  referenceType: string;
  referenceId: string;
}
interface CommentStoreEntry extends DocumentCommentEntry {
  referenceType: string;
  referenceId: string;
}
interface AttachmentStoreEntry extends DocumentAttachmentEntry {
  referenceType: string;
  referenceId: string;
}

const historyStore: HistoryStoreEntry[] = [];
const commentStore: CommentStoreEntry[] = [];
const attachmentStore: AttachmentStoreEntry[] = [];

let historyIdCounter = 0;
let commentIdCounter = 0;
let attachmentIdCounter = 0;

function nextHistoryId(): string {
  historyIdCounter += 1;
  return `hist-${Date.now()}-${historyIdCounter}`;
}
function nextCommentId(): string {
  commentIdCounter += 1;
  return `cmt-${Date.now()}-${commentIdCounter}`;
}
function nextAttachmentId(): string {
  attachmentIdCounter += 1;
  return `att-${Date.now()}-${attachmentIdCounter}`;
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function getDocumentHistory(
  referenceType: string,
  referenceId: string,
): Promise<DocumentHistoryEntry[]> {
  // TODO: Prisma query — findMany where referenceType & referenceId
  return historyStore
    .filter(
      (h) => h.referenceType === referenceType && h.referenceId === referenceId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function addHistoryEntry(data: AddHistoryInput): Promise<void> {
  // TODO: Prisma create
  const entry: HistoryStoreEntry = {
    id: nextHistoryId(),
    action: data.action,
    fieldName: data.fieldName,
    oldValue: data.oldValue,
    newValue: data.newValue,
    comment: data.comment,
    performedBy: data.performedById,
    performedByName: "", // TODO: resolve from user store
    createdAt: new Date(),
    referenceType: data.referenceType,
    referenceId: data.referenceId,
  };
  historyStore.push(entry);
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getComments(
  referenceType: string,
  referenceId: string,
): Promise<DocumentCommentEntry[]> {
  // TODO: Prisma query
  return commentStore
    .filter(
      (c) => c.referenceType === referenceType && c.referenceId === referenceId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function addComment(data: AddCommentInput): Promise<void> {
  // TODO: Prisma create
  const entry: CommentStoreEntry = {
    id: nextCommentId(),
    content: data.content,
    createdBy: data.createdById,
    createdByName: "", // TODO: resolve from user store
    createdAt: new Date(),
    referenceType: data.referenceType,
    referenceId: data.referenceId,
  };
  commentStore.push(entry);
}

export async function deleteComment(id: string): Promise<void> {
  // TODO: Prisma delete
  const idx = commentStore.findIndex((c) => c.id === id);
  if (idx !== -1) commentStore.splice(idx, 1);
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function getAttachments(
  referenceType: string,
  referenceId: string,
): Promise<DocumentAttachmentEntry[]> {
  // TODO: Prisma query
  return attachmentStore
    .filter(
      (a) => a.referenceType === referenceType && a.referenceId === referenceId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function uploadAttachment(
  data: AddAttachmentInput,
): Promise<void> {
  // TODO: Prisma create + file storage upload
  attachmentStore.push({
    id: nextAttachmentId(),
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    fileUrl: data.fileUrl,
    uploadedBy: data.uploadedById,
    uploadedByName: "", // TODO: resolve from user store
    createdAt: new Date(),
    referenceType: data.referenceType,
    referenceId: data.referenceId,
  } as DocumentAttachmentEntry & {
    referenceType: string;
    referenceId: string;
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  // TODO: Prisma delete + file storage removal
  const idx = attachmentStore.findIndex((a) => a.id === id);
  if (idx !== -1) attachmentStore.splice(idx, 1);
}

// ─── Status actions ──────────────────────────────────────────────────────────

/**
 * Generic helper that records a history entry for a status transition.
 * Components call this after they have persisted the document's new status
 * to the database.
 */
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
  await recordStatusAction(
    referenceType,
    referenceId,
    userId,
    "SUBMITTED",
    notes,
  );
}

export async function approveDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  notes?: string,
): Promise<void> {
  await recordStatusAction(
    referenceType,
    referenceId,
    userId,
    "APPROVED",
    notes,
  );
}

export async function rejectDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  notes?: string,
): Promise<void> {
  await recordStatusAction(
    referenceType,
    referenceId,
    userId,
    "REJECTED",
    notes,
  );
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
  await recordStatusAction(
    referenceType,
    referenceId,
    userId,
    "VOIDED",
    reason,
  );
}

export async function cancelDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  await recordStatusAction(
    referenceType,
    referenceId,
    userId,
    "CANCELLED",
    reason,
  );
}

export async function archiveDocument(
  referenceType: string,
  referenceId: string,
  userId: string,
): Promise<void> {
  await recordStatusAction(referenceType, referenceId, userId, "ARCHIVED");
}
