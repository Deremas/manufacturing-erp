import { sql } from "@/lib/db";
import type { Item } from "@/types/master-data";

type ItemRow = {
  id: string;
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
  const rows = await sql<ItemRow[]>`
    SELECT
      i.id,
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
    WHERE i.id = ${id} AND i."isArchived" = false
    LIMIT 1
  `;

  return rows[0] ? mapItemRow(rows[0]) : null;
}

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

export async function generateItemCode(): Promise<string> {
  const rows = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Item"
  `;
  const next = Number(rows[0]?.count ?? 0) + 1;
  return `ITM-${String(next).padStart(3, "0")}`;
}
