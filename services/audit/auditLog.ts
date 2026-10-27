import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  VOID = "VOID",
  PRINT = "PRINT",
  EXPORT = "EXPORT",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  module: string;
  recordId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface CreateAuditLogInput {
  userId: string;
  userName: string;
  action: AuditAction;
  module: string;
  recordId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  module?: string;
  recordId?: string;
  userId?: string;
  action?: AuditAction;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

type AuditLogRow = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
};

function parseJsonRecord(value: string | null) {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    action: row.action as AuditAction,
    module: row.module,
    recordId: row.recordId ?? "",
    oldValue: parseJsonRecord(row.oldValue),
    newValue: parseJsonRecord(row.newValue),
    ipAddress: row.ipAddress ?? undefined,
    userAgent: row.userAgent ?? undefined,
    timestamp: row.timestamp.toISOString(),
  };
}

export async function createAuditLog(
  data: CreateAuditLogInput,
): Promise<AuditLog> {
  const rows = await sql<AuditLogRow[]>`
    INSERT INTO "AuditLog" (
      id,
      "userId",
      action,
      module,
      "recordId",
      "oldValue",
      "newValue",
      "ipAddress",
      "userAgent",
      "timestamp",
      "isArchived"
    )
    VALUES (
      ${randomUUID()},
      ${data.userId},
      ${data.action},
      ${data.module},
      ${data.recordId || null},
      ${data.oldValue ? JSON.stringify(data.oldValue) : null},
      ${data.newValue ? JSON.stringify(data.newValue) : null},
      ${data.ipAddress ?? null},
      ${data.userAgent ?? null},
      NOW(),
      false
    )
    RETURNING id, "userId", ''::text AS "userName", action, module, "recordId", "oldValue", "newValue", "ipAddress", "userAgent", "timestamp"
  `;

  return {
    ...mapAuditLogRow(rows[0]),
    userName: data.userName,
  };
}

export async function getAuditLogs(
  filters?: AuditLogQuery,
): Promise<AuditLog[]> {
  const rows = await sql<AuditLogRow[]>`
    SELECT
      a.id,
      a."userId",
      COALESCE(u.name, u.email, '') AS "userName",
      a.action,
      a.module,
      a."recordId",
      a."oldValue",
      a."newValue",
      a."ipAddress",
      a."userAgent",
      a."timestamp"
    FROM "AuditLog" a
    LEFT JOIN "User" u ON u.id = a."userId"
    WHERE a."isArchived" = false
      AND (${filters?.module ?? null}::text IS NULL OR a.module = ${filters?.module ?? null})
      AND (${filters?.recordId ?? null}::text IS NULL OR a."recordId" = ${filters?.recordId ?? null})
      AND (${filters?.userId ?? null}::text IS NULL OR a."userId" = ${filters?.userId ?? null})
      AND (${filters?.action ?? null}::text IS NULL OR a.action = ${filters?.action ?? null})
      AND (${filters?.dateFrom ?? null}::timestamptz IS NULL OR a."timestamp" >= ${filters?.dateFrom ?? null})
      AND (${filters?.dateTo ?? null}::timestamptz IS NULL OR a."timestamp" <= ${filters?.dateTo ?? null})
    ORDER BY a."timestamp" DESC
    LIMIT ${filters?.limit ?? 500}
    OFFSET ${filters?.offset ?? 0}
  `;

  return rows.map(mapAuditLogRow);
}

export async function getAuditLogsForRecord(
  module: string,
  recordId: string,
): Promise<AuditLog[]> {
  return getAuditLogs({ module, recordId });
}
