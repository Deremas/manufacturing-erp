// ----------------------------------------------------------------------------
// KONEL ERP — System Settings Service
// ----------------------------------------------------------------------------
// Manages system-level configuration with in-memory key-value store.
// TODO: Replace with Prisma database queries.

import type {
  SystemSettings,
  SystemSetting,
  UpdateSystemSettingsInput,
  ServiceResult,
} from "@/types/administration";
import { AuditAction } from "@/services/audit/auditLog";

// In-memory key-value store (placeholder)
const systemSettings: SystemSetting[] = [
  {
    id: "ss-1",
    key: "defaultDateFormat",
    value: "DD/MM/YYYY",
    category: "general",
    isArchived: false,
  },
  {
    id: "ss-2",
    key: "defaultTimezone",
    value: "Africa/Nairobi",
    category: "general",
    isArchived: false,
  },
  {
    id: "ss-3",
    key: "defaultCurrency",
    value: "ETB",
    category: "general",
    isArchived: false,
  },
  {
    id: "ss-4",
    key: "vatPercentage",
    value: "16",
    category: "tax",
    isArchived: false,
  },
  {
    id: "ss-5",
    key: "excisePercentage",
    value: "0",
    category: "tax",
    isArchived: false,
  },
  {
    id: "ss-6",
    key: "lowStockThreshold",
    value: "10",
    category: "inventory",
    isArchived: false,
  },
  {
    id: "ss-7",
    key: "negativeStockAllowed",
    value: "false",
    category: "inventory",
    isArchived: false,
  },
  {
    id: "ss-8",
    key: "printPageSize",
    value: "A4",
    category: "printing",
    isArchived: false,
  },
  {
    id: "ss-9",
    key: "printOrientation",
    value: "portrait",
    category: "printing",
    isArchived: false,
  },
];

let idCounter = 9;

function nextId(): string {
  idCounter += 1;
  return `ss-${idCounter}`;
}

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
    module: "SYSTEM_SETTINGS",
    recordId: "system-settings",
    oldValue,
    newValue,
  });
}

function getSetting(key: string): string | undefined {
  return systemSettings.find((s) => s.key === key && !s.isArchived)?.value;
}

function setSetting(
  key: string,
  value: string,
  category: string = "general",
): void {
  const existing = systemSettings.find((s) => s.key === key);
  if (existing) {
    existing.value = value;
  } else {
    systemSettings.push({
      id: nextId(),
      key,
      value,
      category,
      isArchived: false,
    });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAll(): Promise<ServiceResult<SystemSetting[]>> {
  return {
    success: true,
    data: [...systemSettings.filter((s) => !s.isArchived)],
  };
}

export async function getByCategory(
  category: string,
): Promise<ServiceResult<SystemSetting[]>> {
  const filtered = systemSettings.filter(
    (s) => s.category === category && !s.isArchived,
  );
  return { success: true, data: filtered };
}

export async function getStructured(): Promise<ServiceResult<SystemSettings>> {
  const structured: SystemSettings = {
    defaultDateFormat: getSetting("defaultDateFormat") ?? "DD/MM/YYYY",
    defaultTimezone: getSetting("defaultTimezone") ?? "Africa/Nairobi",
    defaultCurrency: getSetting("defaultCurrency") ?? "ETB",
    vatPercentage: parseFloat(getSetting("vatPercentage") ?? "16"),
    excisePercentage: parseFloat(getSetting("excisePercentage") ?? "0"),
    lowStockRules: {
      threshold: parseFloat(getSetting("lowStockThreshold") ?? "10"),
      negativeStockAllowed: getSetting("negativeStockAllowed") === "true",
    },
    approvalSettings: {},
    printSettings: {
      pageSize: getSetting("printPageSize") ?? "A4",
      orientation: getSetting("printOrientation") ?? "portrait",
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 10,
      marginRight: 10,
    },
  };
  return { success: true, data: structured };
}

export async function update(
  input: UpdateSystemSettingsInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<SystemSettings>> {
  const old = await getStructured();

  if (input.defaultDateFormat !== undefined)
    setSetting("defaultDateFormat", input.defaultDateFormat, "general");
  if (input.defaultTimezone !== undefined)
    setSetting("defaultTimezone", input.defaultTimezone, "general");
  if (input.defaultCurrency !== undefined)
    setSetting("defaultCurrency", input.defaultCurrency, "general");
  if (input.vatPercentage !== undefined)
    setSetting("vatPercentage", String(input.vatPercentage), "tax");
  if (input.excisePercentage !== undefined)
    setSetting("excisePercentage", String(input.excisePercentage), "tax");
  if (input.lowStockRules?.threshold !== undefined)
    setSetting(
      "lowStockThreshold",
      String(input.lowStockRules.threshold),
      "inventory",
    );
  if (input.lowStockRules?.negativeStockAllowed !== undefined)
    setSetting(
      "negativeStockAllowed",
      String(input.lowStockRules.negativeStockAllowed),
      "inventory",
    );
  if (input.printSettings?.pageSize !== undefined)
    setSetting("printPageSize", input.printSettings.pageSize, "printing");
  if (input.printSettings?.orientation !== undefined)
    setSetting("printOrientation", input.printSettings.orientation, "printing");

  const updated = await getStructured();
  await recordAudit(
    AuditAction.UPDATE,
    userId,
    userName,
    old.data as unknown as Record<string, unknown>,
    updated.data as unknown as Record<string, unknown>,
  );
  return {
    success: true,
    data: updated.data,
    message: "System settings updated successfully",
  };
}
