import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { allocateNextDocumentNumber } from "@/lib/document-numbering";
import { formatItemOptionLabel } from "@/lib/server/item-data";
import { formatUomLabel } from "@/lib/unit-display";

export type Tx = typeof sql;

export type ProductionWorkflowStatus =
  | "DRAFT"
  | "ACTIVE"
  | "COMPLETED"
  | "POSTED"
  | "CANCELLED";

export type BOMWorkflowStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type QCWorkflowResult = "PASSED" | "FAILED" | "REJECTED" | "PENDING";
export type HoldWorkflowStatus = "ON_HOLD" | "RELEASED" | "REJECTED" | "SCRAPPED";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ItemLookupOption extends SelectOption {
  itemCode: string;
  itemName: string;
  uomId: string | null;
  uomCode?: string | null;
  uomName: string | null;
  standardCost: number;
  itemTypeCode: string | null;
  itemTypeName: string | null;
}

export interface ShiftDefinition {
  code: string;
  name: string;
  startTime?: string;
  endTime?: string;
}

export function normalizeProductionStatus(value?: string): ProductionWorkflowStatus {
  const normalized = String(value ?? "DRAFT").trim().toUpperCase();
  switch (normalized) {
    case "ACTIVE":
    case "COMPLETED":
    case "POSTED":
    case "CANCELLED":
      return normalized;
    default:
      return "DRAFT";
  }
}

export function normalizeBomStatus(value?: string): BOMWorkflowStatus {
  const normalized = String(value ?? "ACTIVE").trim().toUpperCase();
  switch (normalized) {
    case "INACTIVE":
    case "ARCHIVED":
      return normalized;
    default:
      return "ACTIVE";
  }
}

export function normalizeQcResult(value?: string): QCWorkflowResult {
  const normalized = String(value ?? "PENDING").trim().toUpperCase();
  switch (normalized) {
    case "PASSED":
    case "FAILED":
    case "REJECTED":
      return normalized;
    default:
      return "PENDING";
  }
}

export function normalizeHoldStatus(value?: string): HoldWorkflowStatus {
  const normalized = String(value ?? "ON_HOLD").trim().toUpperCase();
  switch (normalized) {
    case "RELEASED":
    case "REJECTED":
    case "SCRAPPED":
      return normalized;
    default:
      return "ON_HOLD";
  }
}

export async function nextProductionDocumentNumber(tx: Tx, prefix: string, description: string) {
  return allocateNextDocumentNumber(tx, prefix, description);
}

export async function writeProductionAudit(
  tx: Tx,
  userId: string,
  module: string,
  action: string,
  recordId: string,
  newValue?: unknown,
  oldValue?: unknown,
) {
  await tx`
    INSERT INTO "AuditLog" (
      id, "userId", action, module, "recordId", "oldValue", "newValue", "isArchived", timestamp
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      ${action},
      ${module},
      ${recordId},
      ${oldValue ? JSON.stringify(oldValue) : null},
      ${newValue ? JSON.stringify(newValue) : null},
      false,
      NOW()
    )
  `;
}

export async function writeProductionHistory(
  tx: Tx,
  referenceType: string,
  referenceId: string,
  action: string,
  performedById: string,
  comment?: string,
) {
  await tx`
    INSERT INTO "DocumentHistory" (
      id, "referenceType", "referenceId", action, comment, "performedById", "isArchived", "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${referenceType},
      ${referenceId},
      ${action},
      ${comment ?? null},
      ${performedById},
      false,
      NOW()
    )
  `;
}

export async function listProductionLocations() {
  return sql<Array<SelectOption>>`
    SELECT id AS value, "locationName" AS label
    FROM "Location"
    WHERE "isArchived" = false
      AND "isActive" = true
      AND "isProductionLocation" = true
    ORDER BY "locationName" ASC
  `;
}

export async function listStoreLocations() {
  return sql<Array<SelectOption>>`
    SELECT id AS value, "locationName" AS label
    FROM "Location"
    WHERE "isArchived" = false
      AND "isActive" = true
      AND "isStockLocation" = true
    ORDER BY "locationName" ASC
  `;
}

export async function listUnits() {
  const rows = await sql<Array<{ value: string; code: string | null; name: string; abbreviation: string }>>`
    SELECT id AS value, code, name, abbreviation
    FROM "Unit"
    WHERE "isArchived" = false
      AND "isActive" = true
    ORDER BY name ASC
  `;
  return rows.map((row) => ({
    value: row.value,
    label: formatUomLabel({
      uomCode: row.code || row.abbreviation,
      uomName: row.name,
      abbreviation: row.abbreviation,
    }),
  }));
}

export async function listUsers() {
  return sql<Array<SelectOption>>`
    SELECT id AS value, name AS label
    FROM "User"
    WHERE "isArchived" = false
      AND "isActive" = true
    ORDER BY name ASC
  `;
}

export async function listFinishedGoods() {
  const rows = await sql<Array<ItemLookupOption>>`
    SELECT
      i.id AS value,
      CONCAT(i."itemCode", ' - ', i."itemName") AS label,
      i."itemCode",
      i."itemName",
      i."uomId",
      u.code AS "uomCode",
      u.name AS "uomName",
      COALESCE(i."standardCost", 0) AS "standardCost",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName"
    FROM "Item" i
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    WHERE i."isArchived" = false
      AND i."isActive" = true
      AND (
        UPPER(COALESCE(it.code, '')) IN ('FG', 'FINISHED', 'FINISHED_GOOD')
        OR UPPER(COALESCE(it.name, '')) LIKE '%FINISHED%'
        OR UPPER(COALESCE(i."itemCode", '')) LIKE 'FG%'
      )
    ORDER BY i."itemCode" ASC
  `;
  return rows.map((row) => ({
    ...row,
    label: formatItemOptionLabel(row),
    uomName: formatUomLabel({ uomCode: row.uomCode, uomName: row.uomName }),
  }));
}

export async function listProductionComponents() {
  const rows = await sql<Array<ItemLookupOption>>`
    SELECT
      i.id AS value,
      CONCAT(i."itemCode", ' - ', i."itemName") AS label,
      i."itemCode",
      i."itemName",
      i."uomId",
      u.code AS "uomCode",
      u.name AS "uomName",
      COALESCE(i."standardCost", 0) AS "standardCost",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName"
    FROM "Item" i
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    WHERE i."isArchived" = false
      AND i."isActive" = true
      AND (
        UPPER(COALESCE(it.code, '')) IN ('RAW', 'PACK', 'CONSUMABLE', 'RM', 'PM', 'ING', 'INGREDIENT')
        OR UPPER(COALESCE(it.name, '')) LIKE '%RAW%'
        OR UPPER(COALESCE(it.name, '')) LIKE '%PACK%'
        OR UPPER(COALESCE(it.name, '')) LIKE '%CONSUMABLE%'
        OR UPPER(COALESCE(it.name, '')) LIKE '%INGREDIENT%'
        OR UPPER(COALESCE(i."itemCode", '')) LIKE 'RAW%'
        OR UPPER(COALESCE(i."itemCode", '')) LIKE 'PACK%'
        OR UPPER(COALESCE(i."itemCode", '')) LIKE 'ING%'
      )
    ORDER BY i."itemCode" ASC
  `;
  return rows.map((row) => ({
    ...row,
    label: formatItemOptionLabel(row),
    uomName: formatUomLabel({ uomCode: row.uomCode, uomName: row.uomName }),
  }));
}

export async function getItemLookup(itemId: string) {
  const rows = await sql<Array<ItemLookupOption>>`
    SELECT
      i.id AS value,
      CONCAT(i."itemCode", ' - ', i."itemName") AS label,
      i."itemCode",
      i."itemName",
      i."uomId",
      u.code AS "uomCode",
      u.name AS "uomName",
      COALESCE(i."standardCost", 0) AS "standardCost",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName"
    FROM "Item" i
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    WHERE i.id = ${itemId}
      AND i."isArchived" = false
    LIMIT 1
  `;
  return rows[0]
    ? {
        ...rows[0],
        uomName: formatUomLabel({ uomCode: rows[0].uomCode, uomName: rows[0].uomName }),
      }
    : null;
}

export async function getShiftDefinitions(): Promise<ShiftDefinition[]> {
  const rows = await sql<Array<{ value: string }>>`
    SELECT value
    FROM "ModuleSetting"
    WHERE module = 'production'
      AND key = 'shift.definitions'
      AND "isArchived" = false
    LIMIT 1
  `;
  if (!rows[0]?.value) {
    return [];
  }

  try {
    const parsed = JSON.parse(rows[0].value) as ShiftDefinition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getQcSettingOptions(key: string): Promise<string[]> {
  const rows = await sql<Array<{ value: string }>>`
    SELECT value
    FROM "ModuleSetting"
    WHERE module = 'qc'
      AND key = ${key}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (!rows[0]?.value) {
    return [];
  }

  try {
    const parsed = JSON.parse(rows[0].value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
