// ----------------------------------------------------------------------------
// KONEL ERP — Company Settings Service
// ----------------------------------------------------------------------------
// Manages company-level configuration with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  CompanySettings,
  UpdateCompanySettingsInput,
  ServiceResult,
} from "@/types/administration";
import { AuditAction } from "@/services/audit/auditLog";

// In-memory store (placeholder)
let settings: CompanySettings = {
  companyName: "KONEL ERP",
  logo: undefined,
  address: "",
  phone: "",
  email: "",
  tinNumber: "",
  vatNumber: "",
  defaultCurrency: "ETB",
  fiscalYearStart: undefined,
  invoiceFooter: "",
  reportHeaderInfo: "",
};

async function recordAudit(
  action: AuditAction,
  userId: string,
  userName: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
): Promise<void> {
  const { createAuditLog } = await import("@/services/audit/auditLog");
  await createAuditLog({
    userId,
    userName,
    action,
    module: "COMPANY_SETTINGS",
    recordId: "company-settings",
    oldValue,
    newValue,
  });
}

export async function get(): Promise<ServiceResult<CompanySettings>> {
  return { success: true, data: { ...settings } };
}

export async function update(
  input: UpdateCompanySettingsInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<CompanySettings>> {
  const old = { ...settings };
  settings = { ...settings, ...input };
  await recordAudit(AuditAction.UPDATE, userId, userName, old, { ...settings });
  return {
    success: true,
    data: { ...settings },
    message: "Company settings updated successfully",
  };
}

export async function reset(): Promise<ServiceResult<CompanySettings>> {
  settings = {
    companyName: "KONEL ERP",
    defaultCurrency: "ETB",
  };
  return {
    success: true,
    data: { ...settings },
    message: "Company settings reset to defaults",
  };
}
