// ----------------------------------------------------------------------------
// KONEL ERP — Audit Log Service
// ----------------------------------------------------------------------------
// Provides a service wrapper around the core audit log functionality.
// TODO: Replace with Prisma database queries.

import type {
  AuditLog,
  AuditLogQuery,
  ServiceResult,
  PaginatedResult,
} from "@/types/administration";
import { AuditAction } from "@/services/audit/auditLog";

// Re-export the core audit log functions with service-level wrappers
import {
  createAuditLog as coreCreate,
  getAuditLogs as coreGet,
  getAuditLogsForRecord as coreGetForRecord,
} from "@/services/audit/auditLog";

export { AuditAction };

// ── Public API ────────────────────────────────────────────────────────────────

export async function create(data: {
  userId: string;
  userName: string;
  action: AuditAction;
  module: string;
  recordId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ServiceResult<AuditLog>> {
  const entry = await coreCreate({
    userId: data.userId,
    userName: data.userName,
    action: data.action,
    module: data.module,
    recordId: data.recordId,
    oldValue: data.oldValue,
    newValue: data.newValue,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  const mapped: AuditLog = {
    id: entry.id,
    userId: entry.userId,
    userName: entry.userName,
    action: entry.action,
    module: entry.module,
    recordId: entry.recordId,
    oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : undefined,
    newValue: entry.newValue ? JSON.stringify(entry.newValue) : undefined,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    timestamp: entry.timestamp,
  };

  return { success: true, data: mapped, message: "Audit log entry created" };
}

export async function query(
  filters?: AuditLogQuery,
): Promise<ServiceResult<AuditLog[]>> {
  const entries = await coreGet({
    module: filters?.module,
    recordId: filters?.recordId,
    userId: filters?.userId,
    action: filters?.action as AuditAction,
    dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
    limit: filters?.limit,
    offset: filters?.offset,
  });

  const mapped: AuditLog[] = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.userName,
    action: e.action,
    module: e.module,
    recordId: e.recordId,
    oldValue: e.oldValue ? JSON.stringify(e.oldValue) : undefined,
    newValue: e.newValue ? JSON.stringify(e.newValue) : undefined,
    ipAddress: e.ipAddress,
    userAgent: e.userAgent,
    timestamp: e.timestamp,
  }));

  return { success: true, data: mapped };
}

export async function getByModuleAndRecord(
  module: string,
  recordId: string,
): Promise<ServiceResult<AuditLog[]>> {
  const entries = await coreGetForRecord(module, recordId);
  const mapped: AuditLog[] = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.userName,
    action: e.action,
    module: e.module,
    recordId: e.recordId,
    oldValue: e.oldValue ? JSON.stringify(e.oldValue) : undefined,
    newValue: e.newValue ? JSON.stringify(e.newValue) : undefined,
    ipAddress: e.ipAddress,
    userAgent: e.userAgent,
    timestamp: e.timestamp,
  }));
  return { success: true, data: mapped };
}

export async function getRecent(
  limit: number = 20,
): Promise<ServiceResult<AuditLog[]>> {
  const entries = await coreGet({ limit });
  const mapped: AuditLog[] = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.userName,
    action: e.action,
    module: e.module,
    recordId: e.recordId,
    oldValue: e.oldValue ? JSON.stringify(e.oldValue) : undefined,
    newValue: e.newValue ? JSON.stringify(e.newValue) : undefined,
    ipAddress: e.ipAddress,
    userAgent: e.userAgent,
    timestamp: e.timestamp,
  }));
  return { success: true, data: mapped };
}
