// ----------------------------------------------------------------------------
// NEW ERP — Administration Types
// ----------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
  permissions: string[];
  locations: string[];
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
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

export interface CompanySettings {
  companyName: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
  tinNumber: string;
  vatNumber: string;
  defaultCurrency: string;
  fiscalYearStart: string;
  invoiceFooter: string;
  reportHeaderInfo: string;
}

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

export interface DocumentNumberingConfig {
  prefix: string;
  prefixFormat: string;
  separator: string;
  yearFormat: string;
  sequenceLength: number;
  currentSequence: number;
  example: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId: string;
  oldValue: string;
  newValue: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}
