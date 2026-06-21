// ----------------------------------------------------------------------------
// KONEL ERP — Administration Types
// ----------------------------------------------------------------------------
// These interfaces mirror the Prisma schema for administration entities.
// TODO: Replace with Prisma-generated types once database is connected.

import type { BaseEntity } from "@/types/master-data";

// ── User ──────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  name: string;
  email: string;
  username?: string;
  password?: string;
  language: string;
  dateFormat: string;
  itemsPerPage: number;
  lastLogin?: string;
  role: string;
  roleId?: string;
  roleName?: string;
  phone?: string;
  avatar?: string;
  permissions: string[];
  locations: string[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  username?: string;
  password?: string;
  language?: string;
  dateFormat?: string;
  itemsPerPage?: number;
  roleId?: string;
  phone?: string;
  avatar?: string;
  permissions?: string[];
  locations?: string[];
}

export interface UpdateUserInput extends Partial<CreateUserInput> {}

// ── Role ──────────────────────────────────────────────────────────────────────

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  permissions: string[];
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleInput extends Partial<CreateRoleInput> {}

// ── Permission ────────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  module: string;
  action: string;
  label?: string;
  isArchived?: boolean;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permission: string;
  module: string;
  action: string;
  isArchived?: boolean;
}

// `${module}.${action}` pattern
export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "print"
  | "export";

// ── Company Settings ──────────────────────────────────────────────────────────

export interface CompanySettings {
  companyName: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  tinNumber?: string;
  vatNumber?: string;
  defaultCurrency: string;
  fiscalYearStart?: string;
  invoiceFooter?: string;
  reportHeaderInfo?: string;
}

export interface UpdateCompanySettingsInput extends Partial<CompanySettings> {}

// ── System Settings ───────────────────────────────────────────────────────────

export interface SystemSettings {
  defaultDateFormat: string;
  defaultTimezone: string;
  defaultCurrency: string;
  vatPercentage: number;
  excisePercentage: number;
  lowStockRules: {
    threshold: number;
    negativeStockAllowed: boolean;
  };
  approvalSettings: Record<string, boolean>;
  printSettings: {
    pageSize: string;
    orientation: string;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
  };
}

export interface UpdateSystemSettingsInput extends Partial<SystemSettings> {}

// ── System Setting (key-value) ────────────────────────────────────────────────

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  isArchived?: boolean;
}

// ── Document Numbering ────────────────────────────────────────────────────────

export interface DocumentNumberingConfig extends BaseEntity {
  prefix: string;
  description?: string;
  prefixFormat: string;
  separator: string;
  yearFormat: string;
  monthFormat: string;
  dayFormat: string;
  sequenceLength: number;
  currentSequence: number;
  example?: string;
}

export interface CreateDocumentNumberingInput {
  prefix: string;
  description?: string;
  prefixFormat?: string;
  separator?: string;
  yearFormat?: string;
  monthFormat?: string;
  dayFormat?: string;
  sequenceLength?: number;
  currentSequence?: number;
}

export interface UpdateDocumentNumberingInput extends Partial<CreateDocumentNumberingInput> {}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  isArchived?: boolean;
  timestamp: string;
}

export interface AuditLogQuery {
  module?: string;
  recordId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// ── Service Result Types ──────────────────────────────────────────────────────

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryParams {
  search?: string;
  isActive?: boolean;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
