import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  CompanySettings,
  ServiceResult,
  UpdateCompanySettingsInput,
} from "@/types/administration";

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "NEW ERP",
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

type CompanyRow = {
  id: string;
  companyName: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tinNumber: string | null;
  vatNumber: string | null;
  defaultCurrency: string;
  fiscalYearStart: Date | null;
  invoiceFooter: string | null;
  reportHeaderInfo: string | null;
};

function mapCompanyRow(row: CompanyRow): CompanySettings {
  return {
    companyName: row.companyName,
    logo: row.logo ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    tinNumber: row.tinNumber ?? undefined,
    vatNumber: row.vatNumber ?? undefined,
    defaultCurrency: row.defaultCurrency,
    fiscalYearStart: row.fiscalYearStart
      ? row.fiscalYearStart.toISOString().slice(0, 10)
      : undefined,
    invoiceFooter: row.invoiceFooter ?? undefined,
    reportHeaderInfo: row.reportHeaderInfo ?? undefined,
  };
}

async function ensureCompanyRecord() {
  const rows = await sql<CompanyRow[]>`
    SELECT
      id,
      "companyName",
      logo,
      address,
      phone,
      email,
      "tinNumber",
      "vatNumber",
      "defaultCurrency",
      "fiscalYearStart",
      "invoiceFooter",
      "reportHeaderInfo"
    FROM "Company"
    WHERE "isArchived" = false
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  if (rows[0]) {
    return rows[0];
  }

  const inserted = await sql<CompanyRow[]>`
    INSERT INTO "Company" (
      "companyName",
      logo,
      address,
      phone,
      email,
      "tinNumber",
      "vatNumber",
      "defaultCurrency",
      "fiscalYearStart",
      "invoiceFooter",
      "reportHeaderInfo",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${DEFAULT_SETTINGS.companyName},
      ${DEFAULT_SETTINGS.logo ?? null},
      ${DEFAULT_SETTINGS.address ?? null},
      ${DEFAULT_SETTINGS.phone ?? null},
      ${DEFAULT_SETTINGS.email ?? null},
      ${DEFAULT_SETTINGS.tinNumber ?? null},
      ${DEFAULT_SETTINGS.vatNumber ?? null},
      ${DEFAULT_SETTINGS.defaultCurrency},
      ${DEFAULT_SETTINGS.fiscalYearStart
        ? new Date(DEFAULT_SETTINGS.fiscalYearStart)
        : null},
      ${DEFAULT_SETTINGS.invoiceFooter ?? null},
      ${DEFAULT_SETTINGS.reportHeaderInfo ?? null},
      true,
      false,
      NOW(),
      NOW()
    )
    RETURNING
      id,
      "companyName",
      logo,
      address,
      phone,
      email,
      "tinNumber",
      "vatNumber",
      "defaultCurrency",
      "fiscalYearStart",
      "invoiceFooter",
      "reportHeaderInfo"
  `;

  return inserted[0];
}

export async function get(): Promise<ServiceResult<CompanySettings>> {
  try {
    const row = await ensureCompanyRecord();
    return { success: true, data: mapCompanyRow(row) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load company settings",
    };
  }
}

export async function update(
  input: UpdateCompanySettingsInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<CompanySettings>> {
  try {
    const existingRow = await ensureCompanyRecord();
    const oldSettings = mapCompanyRow(existingRow);

    const updatedRows = await sql<CompanyRow[]>`
      UPDATE "Company"
      SET
        "companyName" = ${input.companyName?.trim() || oldSettings.companyName},
        logo = ${input.logo?.trim() || oldSettings.logo || null},
        address = ${input.address?.trim() || null},
        phone = ${input.phone?.trim() || null},
        email = ${input.email?.trim() || null},
        "tinNumber" = ${input.tinNumber?.trim() || null},
        "vatNumber" = ${input.vatNumber?.trim() || null},
        "defaultCurrency" = ${input.defaultCurrency?.trim() || oldSettings.defaultCurrency},
        "fiscalYearStart" = ${input.fiscalYearStart
          ? new Date(input.fiscalYearStart)
          : null},
        "invoiceFooter" = ${input.invoiceFooter?.trim() || null},
        "reportHeaderInfo" = ${input.reportHeaderInfo?.trim() || null},
        "updatedAt" = NOW()
      WHERE id = ${existingRow.id}
      RETURNING
        id,
        "companyName",
        logo,
        address,
        phone,
        email,
        "tinNumber",
        "vatNumber",
        "defaultCurrency",
        "fiscalYearStart",
        "invoiceFooter",
        "reportHeaderInfo"
    `;

    const updated = mapCompanyRow(updatedRows[0]);

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "COMPANY_SETTINGS",
      recordId: existingRow.id,
      oldValue: oldSettings as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      data: updated,
      message: "Company settings updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update company settings",
    };
  }
}

export async function reset(): Promise<ServiceResult<CompanySettings>> {
  try {
    const row = await ensureCompanyRecord();

    const updatedRows = await sql<CompanyRow[]>`
      UPDATE "Company"
      SET
        "companyName" = ${DEFAULT_SETTINGS.companyName},
        logo = ${DEFAULT_SETTINGS.logo ?? null},
        address = ${DEFAULT_SETTINGS.address ?? null},
        phone = ${DEFAULT_SETTINGS.phone ?? null},
        email = ${DEFAULT_SETTINGS.email ?? null},
        "tinNumber" = ${DEFAULT_SETTINGS.tinNumber ?? null},
        "vatNumber" = ${DEFAULT_SETTINGS.vatNumber ?? null},
        "defaultCurrency" = ${DEFAULT_SETTINGS.defaultCurrency},
        "fiscalYearStart" = ${DEFAULT_SETTINGS.fiscalYearStart
          ? new Date(DEFAULT_SETTINGS.fiscalYearStart)
          : null},
        "invoiceFooter" = ${DEFAULT_SETTINGS.invoiceFooter ?? null},
        "reportHeaderInfo" = ${DEFAULT_SETTINGS.reportHeaderInfo ?? null},
        "updatedAt" = NOW()
      WHERE id = ${row.id}
      RETURNING
        id,
        "companyName",
        logo,
        address,
        phone,
        email,
        "tinNumber",
        "vatNumber",
        "defaultCurrency",
        "fiscalYearStart",
        "invoiceFooter",
        "reportHeaderInfo"
    `;

    return {
      success: true,
      data: mapCompanyRow(updatedRows[0]),
      message: "Company settings reset to defaults",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to reset company settings",
    };
  }
}
