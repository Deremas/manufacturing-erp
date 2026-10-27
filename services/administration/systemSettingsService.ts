import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  ServiceResult,
  SystemSetting,
  SystemSettings,
  UpdateSystemSettingsInput,
} from "@/types/administration";

const DEFAULT_SETTINGS: Record<string, string> = {
  defaultDateFormat: "DD/MM/YYYY",
  defaultTimezone: "Africa/Nairobi",
  defaultCurrency: "ETB",
  vatPercentage: "15",
  excisePercentage: "0",
  lowStockThreshold: "10",
  negativeStockAllowed: "false",
  printPageSize: "A4",
  printOrientation: "portrait",
  printMarginTop: "10",
  printMarginBottom: "10",
  printMarginLeft: "10",
  printMarginRight: "10",
  numberFormat: "1,234.56",
  defaultLanguage: "English",
  defaultValuation: "FIFO",
  requireTransferApproval: "true",
  defaultBankAccountId: "",
  defaultCashLocationId: "",
  vatEnabled: "true",
  procurementVatTreatment: "INCLUSIVE",
};

const SETTING_CATEGORIES: Record<string, string> = {
  defaultDateFormat: "general",
  defaultTimezone: "general",
  defaultCurrency: "general",
  numberFormat: "general",
  defaultLanguage: "general",
  vatPercentage: "tax",
  excisePercentage: "tax",
  vatEnabled: "tax",
  procurementVatTreatment: "tax",
  lowStockThreshold: "inventory",
  negativeStockAllowed: "inventory",
  defaultValuation: "inventory",
  requireTransferApproval: "inventory",
  defaultBankAccountId: "finance",
  defaultCashLocationId: "finance",
  printPageSize: "printing",
  printOrientation: "printing",
  printMarginTop: "printing",
  printMarginBottom: "printing",
  printMarginLeft: "printing",
  printMarginRight: "printing",
};

function toBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true";
}

function toNumber(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

let defaultsEnsured = false;

async function ensureDefaults() {
  if (defaultsEnsured) return;

  const existing = await sql<Array<{ key: string }>>`
    SELECT key
    FROM "SystemSetting"
    WHERE key IN ${sql(Object.keys(DEFAULT_SETTINGS))}
      AND "isArchived" = false
  `;
  const have = new Set(existing.map((row) => row.key));
  const missing = Object.entries(DEFAULT_SETTINGS).filter(([key]) => !have.has(key));

  for (const [key, value] of missing) {
    await sql`
      INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
      VALUES (
        ${randomUUID()},
        ${key},
        ${value},
        ${SETTING_CATEGORIES[key] ?? "general"},
        false
      )
      ON CONFLICT ("key")
      DO NOTHING
    `;
  }

  defaultsEnsured = true;
}

async function getSettingsMap() {
  await ensureDefaults();

  const rows = await sql<Array<{ id: string; key: string; value: string; category: string; isArchived: boolean }>>`
    SELECT id, key, value, category, "isArchived"
    FROM "SystemSetting"
    WHERE "isArchived" = false
  `;

  return new Map(rows.map((row) => [row.key, row]));
}

function mapStructured(
  settingsMap: Map<string, { value: string }>,
): SystemSettings & {
  numberFormat: string;
  defaultLanguage: string;
  defaultValuation: string;
  requireTransferApproval: boolean;
  defaultBankAccountId: string;
  defaultCashLocationId: string;
  vatEnabled: boolean;
  procurementVatTreatment: "INCLUSIVE" | "EXCLUSIVE";
} {
  return {
    defaultDateFormat:
      settingsMap.get("defaultDateFormat")?.value ??
      DEFAULT_SETTINGS.defaultDateFormat,
    defaultTimezone:
      settingsMap.get("defaultTimezone")?.value ??
      DEFAULT_SETTINGS.defaultTimezone,
    defaultCurrency:
      settingsMap.get("defaultCurrency")?.value ??
      DEFAULT_SETTINGS.defaultCurrency,
    vatPercentage: toNumber(
      settingsMap.get("vatPercentage")?.value,
      Number(DEFAULT_SETTINGS.vatPercentage),
    ),
    excisePercentage: toNumber(
      settingsMap.get("excisePercentage")?.value,
      Number(DEFAULT_SETTINGS.excisePercentage),
    ),
    lowStockRules: {
      threshold: toNumber(
        settingsMap.get("lowStockThreshold")?.value,
        Number(DEFAULT_SETTINGS.lowStockThreshold),
      ),
      negativeStockAllowed: toBoolean(
        settingsMap.get("negativeStockAllowed")?.value,
        DEFAULT_SETTINGS.negativeStockAllowed === "true",
      ),
    },
    approvalSettings: {},
    printSettings: {
      pageSize:
        settingsMap.get("printPageSize")?.value ?? DEFAULT_SETTINGS.printPageSize,
      orientation:
        settingsMap.get("printOrientation")?.value ??
        DEFAULT_SETTINGS.printOrientation,
      marginTop: toNumber(
        settingsMap.get("printMarginTop")?.value,
        Number(DEFAULT_SETTINGS.printMarginTop),
      ),
      marginBottom: toNumber(
        settingsMap.get("printMarginBottom")?.value,
        Number(DEFAULT_SETTINGS.printMarginBottom),
      ),
      marginLeft: toNumber(
        settingsMap.get("printMarginLeft")?.value,
        Number(DEFAULT_SETTINGS.printMarginLeft),
      ),
      marginRight: toNumber(
        settingsMap.get("printMarginRight")?.value,
        Number(DEFAULT_SETTINGS.printMarginRight),
      ),
    },
    numberFormat:
      settingsMap.get("numberFormat")?.value ?? DEFAULT_SETTINGS.numberFormat,
    defaultLanguage:
      settingsMap.get("defaultLanguage")?.value ??
      DEFAULT_SETTINGS.defaultLanguage,
    defaultValuation:
      settingsMap.get("defaultValuation")?.value ??
      DEFAULT_SETTINGS.defaultValuation,
    requireTransferApproval: toBoolean(
      settingsMap.get("requireTransferApproval")?.value,
      DEFAULT_SETTINGS.requireTransferApproval === "true",
    ),
    defaultBankAccountId:
      settingsMap.get("defaultBankAccountId")?.value ??
      DEFAULT_SETTINGS.defaultBankAccountId,
    defaultCashLocationId:
      settingsMap.get("defaultCashLocationId")?.value ??
      DEFAULT_SETTINGS.defaultCashLocationId,
    vatEnabled: toBoolean(
      settingsMap.get("vatEnabled")?.value,
      DEFAULT_SETTINGS.vatEnabled === "true",
    ),
    procurementVatTreatment:
      settingsMap.get("procurementVatTreatment")?.value === "EXCLUSIVE"
        ? "EXCLUSIVE"
        : "INCLUSIVE",
  };
}

export async function getAll(): Promise<ServiceResult<SystemSetting[]>> {
  try {
    const settingsMap = await getSettingsMap();
    return {
      success: true,
      data: Array.from(settingsMap.values()).map((row) => ({
        id: row.id,
        key: row.key,
        value: row.value,
        category: row.category,
        isArchived: row.isArchived,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load system settings",
    };
  }
}

export async function getByCategory(
  category: string,
): Promise<ServiceResult<SystemSetting[]>> {
  const all = await getAll();
  if (!all.success || !all.data) {
    return all;
  }

  return {
    success: true,
    data: all.data.filter((row) => row.category === category),
  };
}

export async function getStructured(): Promise<
  ServiceResult<
    SystemSettings & {
      numberFormat: string;
      defaultLanguage: string;
      defaultValuation: string;
      requireTransferApproval: boolean;
      defaultBankAccountId: string;
      defaultCashLocationId: string;
      vatEnabled: boolean;
    }
  >
> {
  try {
    const settingsMap = await getSettingsMap();
    return { success: true, data: mapStructured(settingsMap) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load system settings",
    };
  }
}

async function upsertSetting(key: string, value: string) {
  await sql`
    INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
    VALUES (
      ${randomUUID()},
      ${key},
      ${value},
      ${SETTING_CATEGORIES[key] ?? "general"},
      false
    )
    ON CONFLICT ("key")
    DO UPDATE SET
      value = EXCLUDED.value,
      category = EXCLUDED.category,
      "isArchived" = false
  `;
}

export async function update(
  input: UpdateSystemSettingsInput & {
    numberFormat?: string;
    defaultLanguage?: string;
    defaultValuation?: string;
    requireTransferApproval?: boolean;
    defaultBankAccountId?: string;
    defaultCashLocationId?: string;
    vatEnabled?: boolean;
    procurementVatTreatment?: "INCLUSIVE" | "EXCLUSIVE";
  },
  userId: string,
  userName: string,
): Promise<
  ServiceResult<
    SystemSettings & {
      numberFormat: string;
      defaultLanguage: string;
      defaultValuation: string;
      requireTransferApproval: boolean;
      defaultBankAccountId: string;
      defaultCashLocationId: string;
      vatEnabled: boolean;
    }
  >
> {
  try {
    const oldResult = await getStructured();
    if (!oldResult.success || !oldResult.data) {
      return {
        success: false,
        error: oldResult.error ?? "Failed to load existing system settings",
      };
    }

    if (input.defaultDateFormat !== undefined) {
      await upsertSetting("defaultDateFormat", input.defaultDateFormat);
    }
    if (input.defaultTimezone !== undefined) {
      await upsertSetting("defaultTimezone", input.defaultTimezone);
    }
    if (input.defaultCurrency !== undefined) {
      await upsertSetting("defaultCurrency", input.defaultCurrency);
    }
    if (input.vatPercentage !== undefined) {
      await upsertSetting("vatPercentage", String(input.vatPercentage));
    }
    if (input.excisePercentage !== undefined) {
      await upsertSetting("excisePercentage", String(input.excisePercentage));
    }
    if (input.lowStockRules?.threshold !== undefined) {
      await upsertSetting(
        "lowStockThreshold",
        String(input.lowStockRules.threshold),
      );
    }
    if (input.lowStockRules?.negativeStockAllowed !== undefined) {
      await upsertSetting(
        "negativeStockAllowed",
        String(input.lowStockRules.negativeStockAllowed),
      );
    }
    if (input.printSettings?.pageSize !== undefined) {
      await upsertSetting("printPageSize", input.printSettings.pageSize);
    }
    if (input.printSettings?.orientation !== undefined) {
      await upsertSetting("printOrientation", input.printSettings.orientation);
    }
    if (input.printSettings?.marginTop !== undefined) {
      await upsertSetting("printMarginTop", String(input.printSettings.marginTop));
    }
    if (input.printSettings?.marginBottom !== undefined) {
      await upsertSetting(
        "printMarginBottom",
        String(input.printSettings.marginBottom),
      );
    }
    if (input.printSettings?.marginLeft !== undefined) {
      await upsertSetting(
        "printMarginLeft",
        String(input.printSettings.marginLeft),
      );
    }
    if (input.printSettings?.marginRight !== undefined) {
      await upsertSetting(
        "printMarginRight",
        String(input.printSettings.marginRight),
      );
    }
    if (input.numberFormat !== undefined) {
      await upsertSetting("numberFormat", input.numberFormat);
    }
    if (input.defaultLanguage !== undefined) {
      await upsertSetting("defaultLanguage", input.defaultLanguage);
    }
    if (input.defaultValuation !== undefined) {
      await upsertSetting("defaultValuation", input.defaultValuation);
    }
    if (input.requireTransferApproval !== undefined) {
      await upsertSetting(
        "requireTransferApproval",
        String(input.requireTransferApproval),
      );
    }
    if (input.defaultBankAccountId !== undefined) {
      await upsertSetting("defaultBankAccountId", input.defaultBankAccountId);
    }
    if (input.defaultCashLocationId !== undefined) {
      await upsertSetting("defaultCashLocationId", input.defaultCashLocationId);
    }
    if (input.vatEnabled !== undefined) {
      await upsertSetting("vatEnabled", String(input.vatEnabled));
    }
    if (input.procurementVatTreatment !== undefined) {
      await upsertSetting("procurementVatTreatment", input.procurementVatTreatment);
    }

    const updatedResult = await getStructured();
    if (!updatedResult.success || !updatedResult.data) {
      return {
        success: false,
        error: updatedResult.error ?? "Failed to load updated system settings",
      };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "SYSTEM_SETTINGS",
      recordId: "system-settings",
      oldValue: oldResult.data as unknown as Record<string, unknown>,
      newValue: updatedResult.data as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      data: updatedResult.data,
      message: "System settings updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update system settings",
    };
  }
}
