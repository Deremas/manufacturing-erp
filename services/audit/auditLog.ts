// services/audit/auditLog.ts
// Audit Log Service for NEW ERP
// Tracks user actions across the system for compliance and traceability.

// ─── Enums ───────────────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

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
  timestamp: string; // ISO 8601
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

// ─── In-memory store (placeholder) ───────────────────────────────────────────
// In production this would be persisted to a database.

const auditLogs: AuditLog[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `audit-${Date.now()}-${idCounter}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a new audit log entry.
 */
export async function createAuditLog(
  data: CreateAuditLogInput,
): Promise<AuditLog> {
  const entry: AuditLog = {
    id: nextId(),
    userId: data.userId,
    userName: data.userName,
    action: data.action,
    module: data.module,
    recordId: data.recordId,
    oldValue: data.oldValue,
    newValue: data.newValue,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    timestamp: new Date().toISOString(),
  };

  auditLogs.push(entry);

  // TODO: Persist to database
  // e.g. await db.auditLog.create({ data: entry })

  return entry;
}

/**
 * Query audit logs with optional filters.
 * Returns logs sorted newest-first.
 */
export async function getAuditLogs(
  filters?: AuditLogQuery,
): Promise<AuditLog[]> {
  let results = [...auditLogs];

  if (filters?.module) {
    results = results.filter((l) => l.module === filters.module);
  }

  if (filters?.recordId) {
    results = results.filter((l) => l.recordId === filters.recordId);
  }

  if (filters?.userId) {
    results = results.filter((l) => l.userId === filters.userId);
  }

  if (filters?.action) {
    results = results.filter((l) => l.action === filters.action);
  }

  if (filters?.dateFrom) {
    const from = filters.dateFrom.getTime();
    results = results.filter((l) => new Date(l.timestamp).getTime() >= from);
  }

  if (filters?.dateTo) {
    const to = filters.dateTo.getTime();
    results = results.filter((l) => new Date(l.timestamp).getTime() <= to);
  }

  // Sort newest-first
  results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Pagination
  if (filters?.offset) {
    results = results.slice(filters.offset);
  }

  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}

/**
 * Shorthand to query logs for a specific module and record.
 */
export async function getAuditLogsForRecord(
  module: string,
  recordId: string,
): Promise<AuditLog[]> {
  return getAuditLogs({ module, recordId });
}
