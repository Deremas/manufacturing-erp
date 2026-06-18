// services/approval/approvalService.ts
// Approval Workflow Service for NEW ERP
// Manages approval requests, approvals, rejections, and history tracking.

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Approval {
  id: string;
  referenceType: string; // e.g. "purchase_order", "payment_request"
  referenceId: string; // ID of the record being approved
  status: ApprovalStatus;
  requestedBy: string; // User ID of requestor
  requestedByName: string;
  approverId: string; // User ID of the approver
  approverName: string;
  comment?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateApprovalInput {
  referenceType: string;
  referenceId: string;
  requestedBy: string;
  requestedByName: string;
  approverId: string;
  approverName: string;
  comment?: string;
}

// ─── In-memory store (placeholder) ───────────────────────────────────────────
// In production this would be persisted to a database.

const approvals: Approval[] = [];
let approvalIdCounter = 0;

function nextApprovalId(): string {
  approvalIdCounter += 1;
  return `appr-${Date.now()}-${approvalIdCounter}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a new approval request.
 */
export async function createApproval(
  data: CreateApprovalInput,
): Promise<Approval> {
  const now = new Date().toISOString();

  const approval: Approval = {
    id: nextApprovalId(),
    referenceType: data.referenceType,
    referenceId: data.referenceId,
    status: ApprovalStatus.PENDING,
    requestedBy: data.requestedBy,
    requestedByName: data.requestedByName,
    approverId: data.approverId,
    approverName: data.approverName,
    comment: data.comment,
    createdAt: now,
    updatedAt: now,
  };

  approvals.push(approval);

  // TODO: Persist to database
  // e.g. await db.approval.create({ data: approval })

  // TODO: Send notification to approver
  // e.g. await notificationService.notify(approval.approverId, ...)

  return approval;
}

/**
 * Approve a pending approval request.
 */
export async function approve(
  approvalId: string,
  userId: string,
  comment?: string,
): Promise<Approval> {
  const approval = approvals.find((a) => a.id === approvalId);
  if (!approval) {
    throw new Error(`Approval "${approvalId}" not found`);
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error(
      `Approval "${approvalId}" is already ${approval.status.toLowerCase()}`,
    );
  }

  if (approval.approverId !== userId) {
    throw new Error(
      `User "${userId}" is not the designated approver for "${approvalId}"`,
    );
  }

  approval.status = ApprovalStatus.APPROVED;
  approval.comment = comment ?? approval.comment;
  approval.updatedAt = new Date().toISOString();

  // TODO: Persist update to database
  // TODO: Notify requestor

  return { ...approval };
}

/**
 * Reject a pending approval request.
 */
export async function reject(
  approvalId: string,
  userId: string,
  comment?: string,
): Promise<Approval> {
  const approval = approvals.find((a) => a.id === approvalId);
  if (!approval) {
    throw new Error(`Approval "${approvalId}" not found`);
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error(
      `Approval "${approvalId}" is already ${approval.status.toLowerCase()}`,
    );
  }

  if (approval.approverId !== userId) {
    throw new Error(
      `User "${userId}" is not the designated approver for "${approvalId}"`,
    );
  }

  approval.status = ApprovalStatus.REJECTED;
  approval.comment = comment ?? approval.comment;
  approval.updatedAt = new Date().toISOString();

  // TODO: Persist update to database
  // TODO: Notify requestor

  return { ...approval };
}

/**
 * Get all pending approvals for a given user (as approver).
 */
export async function getPendingApprovals(userId: string): Promise<Approval[]> {
  return approvals.filter(
    (a) => a.approverId === userId && a.status === ApprovalStatus.PENDING,
  );
}

/**
 * Get approval history for a specific record (by reference type + id).
 * Returns records sorted newest-first.
 */
export async function getApprovalHistory(
  referenceType: string,
  referenceId: string,
): Promise<Approval[]> {
  const results = approvals.filter(
    (a) => a.referenceType === referenceType && a.referenceId === referenceId,
  );

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Check whether a specific record has been fully approved.
 */
export async function isApproved(
  referenceType: string,
  referenceId: string,
): Promise<boolean> {
  const history = await getApprovalHistory(referenceType, referenceId);
  return history.some((a) => a.status === ApprovalStatus.APPROVED);
}

/**
 * Cancel a pending approval (e.g. requestor changes their mind).
 */
export async function cancelApproval(
  approvalId: string,
  userId: string,
): Promise<Approval> {
  const approval = approvals.find((a) => a.id === approvalId);
  if (!approval) {
    throw new Error(`Approval "${approvalId}" not found`);
  }

  if (approval.requestedBy !== userId) {
    throw new Error(`User "${userId}" is not the requestor of this approval`);
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error(
      `Cannot cancel a ${approval.status.toLowerCase()} approval`,
    );
  }

  approval.status = ApprovalStatus.CANCELLED;
  approval.updatedAt = new Date().toISOString();

  return { ...approval };
}
