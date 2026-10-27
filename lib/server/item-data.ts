import { sql, withDbRetry } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  formatItemOptionLabel,
  getCleanItemName,
  getDisplayItemCode,
  isLegacyGeneratedItemCode,
} from "@/lib/item-display";
import { formatSequenceNumber } from "@/lib/document-numbering";
import { formatUomLabel } from "@/lib/unit-display";
import type { Item } from "@/types/master-data";

export { formatItemOptionLabel, getCleanItemName, getDisplayItemCode };

type ItemRow = {
  id: string;
  publicId: number;
  itemCode: string;
  itemName: string;
  sku: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  itemTypeId: string | null;
  itemTypeCode: string | null;
  itemTypeName: string | null;
  uomId: string | null;
  uomCode: string | null;
  uomName: string | null;
  reorderPoint: number | null;
  standardCost: number | null;
  sellingPrice: number | null;
  batchTracking: boolean | null;
  expiryTracking: boolean | null;
  serialTracking: boolean | null;
  purchaseTaxCodeId: string | null;
  purchaseTaxCodeName: string | null;
  vatApplicable: boolean;
  exciseApplicable: boolean;
  isActive: boolean;
  isArchived: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const toIso = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : value ?? "";

function mapItemRow(row: ItemRow): Item {
  return {
    id: row.id,
    publicId: row.publicId,
    itemCode: row.itemCode,
    itemName: row.itemName,
    sku: row.sku ?? "",
    description: row.description ?? "",
    categoryId: row.categoryId ?? "",
    categoryName: row.categoryName ?? "",
    itemTypeId: row.itemTypeId ?? "",
    itemType: row.itemTypeCode ?? row.itemTypeId ?? "",
    itemTypeName: row.itemTypeName ?? "",
    uomId: row.uomId ?? "",
    uomCode: row.uomCode ?? "",
    uomName: row.uomName ?? "",
    reorderPoint: row.reorderPoint ?? 0,
    standardCost: row.standardCost ?? 0,
    sellingPrice: row.sellingPrice ?? 0,
    batchTracking: row.batchTracking ?? false,
    expiryTracking: row.expiryTracking ?? false,
    serialTracking: row.serialTracking ?? false,
    purchaseTaxCodeId: row.purchaseTaxCodeId ?? "",
    purchaseTaxCodeName: row.purchaseTaxCodeName ?? "",
    vatApplicable: row.vatApplicable,
    exciseApplicable: row.exciseApplicable,
    isActive: row.isActive,
    isArchived: row.isArchived,
    createdById: row.createdById ?? undefined,
    updatedById: row.updatedById ?? undefined,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function getItemRows(): Promise<Item[]> {
  return withDbRetry(() => loadItemRows());
}

async function loadItemRows(): Promise<Item[]> {
  const rows = await sql<ItemRow[]>`
    SELECT
      i.id,
      i."publicId",
      i."itemCode",
      i."itemName",
      i.sku,
      i.description,
      i."categoryId",
      c.name AS "categoryName",
      i."itemTypeId",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName",
      i."uomId",
      u.code AS "uomCode",
      u.name AS "uomName",
      i."reorderPoint",
      i."standardCost",
      i."sellingPrice",
      i."batchTracking",
      i."expiryTracking",
      i."serialTracking",
      i."purchaseTaxCodeId",
      tc."taxName" AS "purchaseTaxCodeName",
      i."vatApplicable",
      i."exciseApplicable",
      i."isActive",
      i."isArchived",
      i."createdById",
      i."updatedById",
      i."createdAt",
      i."updatedAt"
    FROM "Item" i
    LEFT JOIN "Category" c ON c.id = i."categoryId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    LEFT JOIN "TaxCode" tc ON tc.id = i."purchaseTaxCodeId"
    WHERE i."isArchived" = false
    ORDER BY i."itemName" ASC
  `;

  return rows.map(mapItemRow);
}

export async function getItemById(id: string): Promise<Item | null> {
  const rows = await sql<ItemRow[]>`
    SELECT
      i.id,
      i."publicId",
      i."itemCode",
      i."itemName",
      i.sku,
      i.description,
      i."categoryId",
      c.name AS "categoryName",
      i."itemTypeId",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName",
      i."uomId",
      u.code AS "uomCode",
      u.name AS "uomName",
      i."reorderPoint",
      i."standardCost",
      i."sellingPrice",
      i."batchTracking",
      i."expiryTracking",
      i."serialTracking",
      i."purchaseTaxCodeId",
      tc."taxName" AS "purchaseTaxCodeName",
      i."vatApplicable",
      i."exciseApplicable",
      i."isActive",
      i."isArchived",
      i."createdById",
      i."updatedById",
      i."createdAt",
      i."updatedAt"
    FROM "Item" i
    LEFT JOIN "Category" c ON c.id = i."categoryId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    LEFT JOIN "TaxCode" tc ON tc.id = i."purchaseTaxCodeId"
    WHERE ${isPublicIdParam(id) ? sql`i."publicId" = ${Number(id)}` : sql`i.id = ${id}`} AND i."isArchived" = false
    LIMIT 1
  `;

  return rows[0] ? mapItemRow(rows[0]) : null;
}

export { formatUomLabel };

export async function resolveItemTypeId(itemTypeValue: string): Promise<string | null> {
  const trimmed = itemTypeValue.trim();
  if (!trimmed) return null;

  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "ItemType"
    WHERE id = ${trimmed} OR code = ${trimmed}
    LIMIT 1
  `;

  return rows[0]?.id ?? null;
}

export function getItemCodePrefix(itemTypeValue: string) {
  const normalized = String(itemTypeValue ?? "").trim().toUpperCase();

  if (["RAW", "RM", "RAW MATERIAL", "RAW MATERIALS"].includes(normalized)) return "RM";
  if (["ING", "INGREDIENT", "INGREDIENTS", "ADDITIVE", "ADDITIVES"].includes(normalized)) return "ING";
  if (["WIP", "WORK IN PROGRESS", "WORK-IN-PROGRESS", "SEMI FINISHED", "SEMI-FINISHED"].includes(normalized)) return "WIP";
  if (["PACK", "PK", "PACKAGING", "PACKAGING MATERIAL", "PACKAGING MATERIALS", "PM"].includes(normalized)) return "PKG";
  if (["FG", "FINISHED GOOD", "FINISHED GOODS", "FINISHED"].includes(normalized)) return "FG";
  if (["CONS", "CONSUMABLE", "CONSUMABLES", "CN"].includes(normalized)) return "CON";
  if (["SPARE", "SPARE PART", "SPARE PARTS", "SP"].includes(normalized)) return "SP";
  if (["ASSET", "AS"].includes(normalized)) return "AS";
  if (["SERVICE", "SERVICES", "SV"].includes(normalized)) return "SV";

  return "ITM";
}

export async function generateItemCode(itemTypeValue?: string): Promise<string> {
  const prefix = getItemCodePrefix(String(itemTypeValue ?? ""));
  const rows = await sql<Array<{ itemCode: string }>>`
    SELECT "itemCode"
    FROM "Item"
    WHERE "isArchived" = false
      AND "itemCode" LIKE ${`${prefix}-%`}
    ORDER BY "itemCode" DESC
  `;

  let highest = 0;
  const sequencePattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  for (const row of rows) {
    const code = getDisplayItemCode({
      itemCode: row.itemCode,
      itemType: itemTypeValue,
      itemTypeCode: itemTypeValue,
    });
    const match = String(code).match(sequencePattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > highest) {
      highest = value;
    }
  }

  return `${prefix}-${formatSequenceNumber(highest + 1, 2)}`;
}

export async function repairLegacyItemCodes() {
  const rows = await sql<Array<{
    id: string;
    itemCode: string;
    itemTypeCode: string | null;
    itemTypeName: string | null;
  }>>`
    SELECT
      i.id,
      i."publicId",
      i."itemCode",
      it.code AS "itemTypeCode",
      it.name AS "itemTypeName"
    FROM "Item" i
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    WHERE i."isArchived" = false
      AND i."itemCode" ~ '^[A-Z]+-[0-9]{10,}-[A-F0-9]{4,}$'
  `;

  for (const row of rows) {
    const nextCode = getDisplayItemCode({
      itemCode: row.itemCode,
      itemTypeCode: row.itemTypeCode,
      itemTypeName: row.itemTypeName,
    });
    if (!nextCode || nextCode === row.itemCode || isLegacyGeneratedItemCode(nextCode)) {
      const generated = await generateItemCode(row.itemTypeCode ?? undefined);
      await sql`
        UPDATE "Item"
        SET "itemCode" = ${generated}, "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
      continue;
    }

    const duplicate = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "Item"
      WHERE "itemCode" = ${nextCode}
        AND id <> ${row.id}
        AND "isArchived" = false
      LIMIT 1
    `;
    const itemCode = duplicate[0]
      ? await generateItemCode(row.itemTypeCode ?? undefined)
      : nextCode;

    await sql`
      UPDATE "Item"
      SET "itemCode" = ${itemCode}, "updatedAt" = NOW()
      WHERE id = ${row.id}
    `;
  }
}
