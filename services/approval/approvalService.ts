import { randomUUID } from "crypto";

import { sql } from "@/lib/db";

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface Approval {
  id: string;
  referenceType: string;
  referenceId: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedByName: string;
  assignedApproverId?: string;
  assignedApproverName?: string;
  approverId?: string;
  approverName?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalInput {
  referenceType: string;
  referenceId: string;
  requestedBy: string;
  requestedByName?: string;
  assignedApproverId?: string;
  assignedApproverName?: string;
  approverId?: string;
  approverName?: string;
  comment?: string;
}

type ApprovalRow = {
  id: string;
  referenceType: string;
  referenceId: string;
  status: string;
  requestedById: string;
  requestedByName: string | null;
  assignedApproverId: string | null;
  assignedApproverName: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    status: row.status as ApprovalStatus,
    requestedBy: row.requestedById,
    requestedByName: row.requestedByName ?? row.requestedById,
    assignedApproverId: row.assignedApproverId ?? undefined,
    assignedApproverName: row.assignedApproverName ?? undefined,
    approverId: row.approvedById ?? undefined,
    approverName: row.approvedByName ?? undefined,
    comment: row.comment ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getApprovalRowById(id: string) {
  const rows = await sql<Array<ApprovalRow>>`
    SELECT
      a.id,
      a."referenceType",
      a."referenceId",
      a.status,
      a."requestedById",
      ru.name AS "requestedByName",
      a."assignedApproverId",
      su.name AS "assignedApproverName",
      a."approvedById",
      au.name AS "approvedByName",
      a.comment,
      a."createdAt"::text AS "createdAt",
      a."updatedAt"::text AS "updatedAt"
    FROM "Approval" a
    INNER JOIN "User" ru ON ru.id = a."requestedById"
    LEFT JOIN "User" su ON su.id = a."assignedApproverId"
    LEFT JOIN "User" au ON au.id = a."approvedById"
    WHERE a.id = ${id} AND a."isArchived" = false
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function createApproval(data: CreateApprovalInput): Promise<Approval> {
  const rows = await sql<Array<ApprovalRow>>`
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
      ${data.referenceType},
      ${data.referenceId},
      'PENDING',
      ${data.requestedBy},
      ${data.assignedApproverId ?? null},
      ${data.comment ?? null},
      false,
      NOW(),
      NOW()
    )
    RETURNING
      id,
      "referenceType",
      "referenceId",
      status,
      "requestedById",
      NULL::text AS "requestedByName",
      "assignedApproverId",
      NULL::text AS "assignedApproverName",
      "approvedById",
      NULL::text AS "approvedByName",
      comment,
      "createdAt"::text AS "createdAt",
      "updatedAt"::text AS "updatedAt"
  `;

  const row = await getApprovalRowById(rows[0].id);
  if (!row) {
    throw new Error("Failed to create approval");
  }
  return mapApproval(row);
}

export async function approve(
  approvalId: string,
  userId: string,
  comment?: string,
): Promise<Approval> {
  const approval = await getApprovalRowById(approvalId);
  if (!approval) {
    throw new Error(`Approval "${approvalId}" not found`);
  }
  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error(`Approval "${approvalId}" is already ${approval.status.toLowerCase()}`);
  }
  if (approval.assignedApproverId && approval.assignedApproverId !== userId) {
    throw new Error(`User "${userId}" is not the assigned approver for "${approvalId}"`);
  }
  if (approval.requestedById === userId) {
    throw new Error("Segregation of duties: requestor cannot approve their own request");
  }

  await sql`
    UPDATE "Approval"
    SET
      status = 'APPROVED',
      "approvedById" = ${userId},
      comment = ${comment ?? approval.comment ?? null},
      "updatedAt" = NOW()
    WHERE id = ${approvalId}
  `;

  const updated = await getApprovalRowById(approvalId);
  if (!updated) {
    throw new Error(`Approval "${approvalId}" not found after update`);
  }
  return mapApproval(updated);
}

export async function reject(
  approvalId: string,
  userId: string,
  comment?: string,
): Promise<Approval> {
  const approval = await getApprovalRowById(approvalId);
  if (!approval) {
    throw new Error(`Approval "${approvalId}" not found`);
  }
  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error(`Approval "${approvalId}" is already ${approval.status.toLowerCase()}`);
  }
  if (approval.assignedApproverId && approval.assignedApproverId !== userId) {
    throw new Error(`User "${userId}" is not the assigned approver for "${approvalId}"`);
  }

  await sql`
    UPDATE "Approval"
    SET
      status = 'REJECTED',
      "approvedById" = ${userId},
      comment = ${comment ?? approval.comment ?? null},
      "updatedAt" = NOW()
    WHERE id = ${approvalId}
  `;

  const updated = await getApprovalRowById(approvalId);
  if (!updated) {
    throw new Error(`Approval "${approvalId}" not found after update`);
  }
  return mapApproval(updated);
}

export async function getPendingApprovals(userId?: string): Promise<Approval[]> {
  const rows = await sql<Array<ApprovalRow>>`
    SELECT
      a.id,
      a."referenceType",
      a."referenceId",
      a.status,
      a."requestedById",
      ru.name AS "requestedByName",
      a."assignedApproverId",
      su.name AS "assignedApproverName",
      a."approvedById",
      au.name AS "approvedByName",
      a.comment,
      a."createdAt"::text AS "createdAt",
      a."updatedAt"::text AS "updatedAt"
    FROM "Approval" a
    INNER JOIN "User" ru ON ru.id = a."requestedById"
    LEFT JOIN "User" su ON su.id = a."assignedApproverId"
    LEFT JOIN "User" au ON au.id = a."approvedById"
    WHERE a.status = 'PENDING'
      AND a."isArchived" = false
      AND (${userId ?? null}::text IS NULL OR a."assignedApproverId" = ${userId ?? null})
    ORDER BY a."createdAt" DESC
  `;

  return rows.map(mapApproval);
}

export async function getApprovalHistory(
  referenceType: string,
  referenceId: string,
): Promise<Approval[]> {
  const rows = await sql<Array<ApprovalRow>>`
    SELECT
      a.id,
      a."referenceType",
      a."referenceId",
      a.status,
      a."requestedById",
      ru.name AS "requestedByName",
      a."assignedApproverId",
      su.name AS "assignedApproverName",
      a."approvedById",
      au.name AS "approvedByName",
      a.comment,
      a."createdAt"::text AS "createdAt",
      a."updatedAt"::text AS "updatedAt"
    FROM "Approval" a
    INNER JOIN "User" ru ON ru.id = a."requestedById"
    LEFT JOIN "User" su ON su.id = a."assignedApproverId"
    LEFT JOIN "User" au ON au.id = a."approvedById"
    WHERE a."referenceType" = ${referenceType}
      AND a."referenceId" = ${referenceId}
      AND a."isArchived" = false
    ORDER BY a."createdAt" DESC
  `;

  return rows.map(mapApproval);
}

export async function isApproved(
  referenceType: string,
  referenceId: string,
): Promise<boolean> {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "Approval"
    WHERE "referenceType" = ${referenceType}
      AND "referenceId" = ${referenceId}
      AND status = 'APPROVED'
      AND "isArchived" = false
  `;

  return Number(rows[0]?.count ?? 0) > 0;
}

export async function cancelApproval(
  approvalId: string,
  userId: string,
): Promise<Approval> {
  const approval = await getApprovalRowById(approvalId);
  if (!approval) {
    throw new Error(`Approval "${approvalId}" not found`);
  }
  if (approval.requestedById !== userId) {
    throw new Error(`User "${userId}" is not the requestor of this approval`);
  }
  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error(`Cannot cancel a ${approval.status.toLowerCase()} approval`);
  }

  await sql`
    UPDATE "Approval"
    SET
      status = 'CANCELLED',
      "updatedAt" = NOW()
    WHERE id = ${approvalId}
  `;

  const updated = await getApprovalRowById(approvalId);
  if (!updated) {
    throw new Error(`Approval "${approvalId}" not found after update`);
  }
  return mapApproval(updated);
}
