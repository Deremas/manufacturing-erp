import { randomUUID } from "crypto";

import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import type {
  CreatePriceListInput,
  CreatePriceListItemInput,
  PriceList,
  PriceListItem,
  PriceListUsageRecord,
  UpdatePriceListInput,
} from "@/types/master-data";
import { PRICE_CHANNELS, type PriceChannel } from "@/lib/pricing/channels";

type PriceListHeaderRow = {
  id: string;
  publicId: number;
  code: string | null;
  name: string | null;
  channel: string;
  currency: string;
  customerGroup: string | null;
  customerId: string | null;
  customerName: string | null;
  locationId: string | null;
  locationName: string | null;
  description: string | null;
  effectiveDate: Date | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  isDefault: boolean;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  itemsCount?: number;
};

type PriceListItemRow = {
  id: string;
  priceListId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string | null;
  uomCode: string | null;
  unitName: string | null;
  sellingPrice: number;
  minimumQty: number | null;
  minimumPrice: number | null;
  taxIncluded: boolean;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface SaleableItemOption {
  id: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  label: string;
}

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeChannel(value: string | null | undefined): PriceChannel {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase() as PriceChannel;

  if (!PRICE_CHANNELS.includes(normalized)) {
    throw new Error("Invalid price list channel");
  }

  return normalized;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : undefined;
}

function mapPriceList(row: PriceListHeaderRow): PriceList {
  return {
    id: row.id,
    publicId: Number(row.publicId ?? 0),
    code: row.code ?? undefined,
    name: row.name ?? undefined,
    channel: row.channel,
    currency: row.currency,
    customerGroup: row.customerGroup ?? undefined,
    customerId: row.customerId ?? undefined,
    customerName: row.customerName ?? undefined,
    locationId: row.locationId ?? undefined,
    locationName: row.locationName ?? undefined,
    description: row.description ?? undefined,
    effectiveDate: toIso(row.effectiveDate),
    effectiveFrom: toIso(row.effectiveFrom),
    effectiveTo: toIso(row.effectiveTo),
    isDefault: row.isDefault,
    isActive: row.isActive,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById ?? undefined,
    updatedById: row.updatedById ?? undefined,
    itemsCount: Number(row.itemsCount ?? 0),
  };
}

function mapPriceListItem(row: PriceListItemRow): PriceListItem {
  return {
    id: row.id,
    priceListId: row.priceListId,
    itemId: row.itemId,
    itemCode: row.itemCode,
    itemName: row.itemName,
    unitId: row.unitId ?? undefined,
    uomCode: row.uomCode ?? undefined,
    unitName: row.unitName ?? undefined,
    unitPrice: Number(row.sellingPrice ?? 0),
    sellingPrice: Number(row.sellingPrice ?? 0),
    minimumQty: Number(row.minimumQty ?? 1),
    minimumPrice: row.minimumPrice ?? undefined,
    taxIncluded: row.taxIncluded,
    isActive: row.isActive,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateLineItems(items: CreatePriceListItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one price item is required");
  }

  const seen = new Set<string>();
  return items.map((item) => {
    const itemId = String(item.itemId ?? "").trim();
    if (!itemId) {
      throw new Error("Each price row requires an item");
    }
    if (seen.has(itemId)) {
      throw new Error("Duplicate item rows are not allowed in the same price list");
    }
    seen.add(itemId);

    const unitPrice = Number(item.unitPrice ?? 0);
    const minimumQty = Number(item.minimumQty ?? 1);
    if (!(unitPrice > 0)) {
      throw new Error("Unit price must be greater than zero");
    }
    if (!(minimumQty >= 1)) {
      throw new Error("Minimum quantity must be at least 1");
    }

    return {
      itemId,
      unitId: normalizeText(item.unitId),
      unitPrice,
      minimumQty,
      taxIncluded: Boolean(item.taxIncluded),
      isActive: item.isActive ?? true,
    };
  });
}

async function writeHistory(
  tx: typeof sql,
  referenceId: string,
  action: string,
  performedById: string,
  comment?: string | null,
) {
  await tx`
    INSERT INTO "DocumentHistory" (
      id, "referenceType", "referenceId", action, comment, "performedById", "isArchived", "createdAt"
    )
    VALUES (
      ${randomUUID()},
      'master-data.price-list',
      ${referenceId},
      ${action},
      ${comment ?? null},
      ${performedById},
      false,
      NOW()
    )
  `;
}

async function ensureCodeIsUnique(code: string, excludeId?: string) {
  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "PriceList"
    WHERE UPPER(COALESCE(code, '')) = ${code.toUpperCase()}
      AND "isArchived" = false
      AND (${excludeId ?? null}::text IS NULL OR id <> ${excludeId ?? null})
    LIMIT 1
  `;

  if (rows[0]) {
    throw new Error(`Price list code ${code} already exists`);
  }
}

async function ensureSaleableItems(itemIds: string[]) {
  const rows = await sql<Array<{ id: string }>>`
    SELECT i.id
    FROM "Item" i
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    WHERE i.id = ANY(${itemIds})
      AND i."isActive" = true
      AND i."isArchived" = false
      AND UPPER(COALESCE(i."itemCode", '')) NOT LIKE 'TEST-%'
      AND UPPER(COALESCE(i."itemName", '')) NOT LIKE 'INVENTORY TEST ITEM%'
      AND (
        UPPER(COALESCE(it.code, '')) IN ('FG', 'FINISHED', 'FINISHED_GOOD')
        OR UPPER(COALESCE(it.name, '')) LIKE '%FINISHED%'
        OR UPPER(COALESCE(i."itemCode", '')) LIKE 'FG-%'
      )
  `;

  if (rows.length !== itemIds.length) {
    throw new Error("Only active saleable finished goods can be added to a price list");
  }
}

export async function validateDefaultPriceList(
  channel: string,
  effectiveFrom?: string | null,
  effectiveTo?: string | null,
  excludeId?: string,
) {
  const normalizedChannel = normalizeChannel(channel);
  const startDate = normalizeText(effectiveFrom);
  if (!startDate) {
    throw new Error("Effective from is required");
  }

  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "PriceList"
    WHERE channel = ${normalizedChannel}
      AND "isDefault" = true
      AND "isActive" = true
      AND "isArchived" = false
      AND (${excludeId ?? null}::text IS NULL OR id <> ${excludeId ?? null})
      AND COALESCE("effectiveFrom", NOW()) <= COALESCE(${effectiveTo ?? null}::timestamptz, 'infinity'::timestamptz)
      AND COALESCE("effectiveTo", 'infinity'::timestamptz) >= ${startDate}::timestamptz
    LIMIT 1
  `;

  if (rows[0]) {
    throw new Error(
      "Active default price list already exists for this channel and date range",
    );
  }
}

export async function getSaleableItems(): Promise<SaleableItemOption[]> {
  const rows = await sql<
    Array<{
      id: string;
      itemCode: string;
      itemName: string;
      unitId: string | null;
      uomCode: string | null;
      uomName: string | null;
    }>
  >`
    SELECT
      i.id,
      i."itemCode",
      i."itemName",
      i."uomId" AS "unitId",
      u.code AS "uomCode",
      u.name AS "uomName"
    FROM "Item" i
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    WHERE i."isActive" = true
      AND i."isArchived" = false
      AND UPPER(COALESCE(i."itemCode", '')) NOT LIKE 'TEST-%'
      AND UPPER(COALESCE(i."itemName", '')) NOT LIKE 'INVENTORY TEST ITEM%'
      AND (
        UPPER(COALESCE(it.code, '')) IN ('FG', 'FINISHED', 'FINISHED_GOOD')
        OR UPPER(COALESCE(it.name, '')) LIKE '%FINISHED%'
        OR UPPER(COALESCE(i."itemCode", '')) LIKE 'FG-%'
      )
    ORDER BY i."itemCode" ASC, i."itemName" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    itemCode: row.itemCode,
    itemName: row.itemName,
    unitId: row.unitId ?? undefined,
    uomCode: row.uomCode ?? undefined,
    uomName: row.uomName ?? undefined,
    label: `${row.itemCode} - ${row.itemName}${row.uomName ? ` - ${row.uomCode ? `${row.uomCode} - ` : ""}${row.uomName}` : ""}`,
  }));
}

export async function getCustomerGroups(): Promise<string[]> {
  const rows = await sql<Array<{ customerType: string }>>`
    SELECT DISTINCT "customerType"
    FROM "Customer"
    WHERE "isArchived" = false
      AND "isActive" = true
      AND "customerType" IS NOT NULL
      AND TRIM("customerType") <> ''
    ORDER BY "customerType" ASC
  `;

  return rows.map((row) => row.customerType);
}

export async function getPriceLists(filters?: {
  search?: string;
  channel?: string;
  isActive?: boolean;
  isDefault?: boolean;
}) {
  const rows = await sql<PriceListHeaderRow[]>`
    SELECT
      pl.id,
      pl."publicId",
      pl.code,
      pl.name,
      pl.channel,
      pl.currency,
      pl."customerGroup",
      pl."customerId",
      c.name AS "customerName",
      pl."locationId",
      l."locationName" AS "locationName",
      pl.description,
      pl."effectiveDate",
      pl."effectiveFrom",
      pl."effectiveTo",
      pl."isDefault",
      pl."isActive",
      pl."isArchived",
      pl."createdAt",
      pl."updatedAt",
      pl."createdById",
      pl."updatedById",
      COUNT(pli.id)::int AS "itemsCount"
    FROM "PriceList" pl
    LEFT JOIN "Customer" c ON c.id = pl."customerId"
    LEFT JOIN "Location" l ON l.id = pl."locationId"
    LEFT JOIN "PriceListItem" pli ON pli."priceListId" = pl.id AND pli."isArchived" = false
    WHERE pl."isArchived" = false
      AND (${filters?.channel ?? null}::text IS NULL OR pl.channel = ${filters?.channel ?? null})
      AND (${filters?.isActive ?? null}::boolean IS NULL OR pl."isActive" = ${filters?.isActive ?? null})
      AND (${filters?.isDefault ?? null}::boolean IS NULL OR pl."isDefault" = ${filters?.isDefault ?? null})
      AND (
        ${normalizeText(filters?.search) ?? null}::text IS NULL
        OR COALESCE(pl.code, '') ILIKE ${`%${normalizeText(filters?.search) ?? ""}%`}
        OR COALESCE(pl.name, '') ILIKE ${`%${normalizeText(filters?.search) ?? ""}%`}
        OR COALESCE(pl.channel, '') ILIKE ${`%${normalizeText(filters?.search) ?? ""}%`}
      )
    GROUP BY pl.id, c.name, l."locationName"
    ORDER BY COALESCE(pl."effectiveFrom", pl."createdAt") DESC, COALESCE(pl.name, pl.code) ASC
  `;

  return rows.map(mapPriceList);
}

export async function getPriceListById(id: string): Promise<PriceList | null> {
  const rows = await sql<PriceListHeaderRow[]>`
    SELECT
      pl.id,
      pl."publicId",
      pl.code,
      pl.name,
      pl.channel,
      pl.currency,
      pl."customerGroup",
      pl."customerId",
      c.name AS "customerName",
      pl."locationId",
      l."locationName" AS "locationName",
      pl.description,
      pl."effectiveDate",
      pl."effectiveFrom",
      pl."effectiveTo",
      pl."isDefault",
      pl."isActive",
      pl."isArchived",
      pl."createdAt",
      pl."updatedAt",
      pl."createdById",
      pl."updatedById",
      COUNT(pli.id)::int AS "itemsCount"
    FROM "PriceList" pl
    LEFT JOIN "Customer" c ON c.id = pl."customerId"
    LEFT JOIN "Location" l ON l.id = pl."locationId"
    LEFT JOIN "PriceListItem" pli ON pli."priceListId" = pl.id AND pli."isArchived" = false
    WHERE ${isPublicIdParam(id) ? sql`pl."publicId" = ${Number(id)}` : sql`pl.id = ${id}`}
      AND pl."isArchived" = false
    GROUP BY pl.id, c.name, l."locationName"
    LIMIT 1
  `;

  const header = rows[0];
  if (!header) {
    return null;
  }

  const items = await sql<PriceListItemRow[]>`
    SELECT
      pli.id,
      pli."priceListId",
      pli."itemId",
      i."itemCode",
      i."itemName",
      pli."unitId",
      u.code AS "uomCode",
      u.name AS "unitName",
      pli."sellingPrice",
      pli."minimumQty",
      pli."minimumPrice",
      pli."taxIncluded",
      pli."isActive",
      pli."isArchived",
      pli."createdAt",
      pli."updatedAt"
    FROM "PriceListItem" pli
    INNER JOIN "Item" i ON i.id = pli."itemId"
    LEFT JOIN "Unit" u ON u.id = pli."unitId"
    WHERE pli."priceListId" = ${id}
      AND pli."isArchived" = false
    ORDER BY i."itemCode" ASC, i."itemName" ASC
  `;

  return {
    ...mapPriceList(header),
    items: items.map(mapPriceListItem),
  };
}

export async function getPriceListUsage(_id: string): Promise<PriceListUsageRecord[]> {
  return [];
}

async function insertItems(
  tx: typeof sql,
  priceListId: string,
  items: ReturnType<typeof validateLineItems>,
) {
  for (const item of items) {
    await tx`
      INSERT INTO "PriceListItem" (
        id, "priceListId", "itemId", "unitId", "sellingPrice", "minimumQty", "taxIncluded", "isActive", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${priceListId},
        ${item.itemId},
        ${item.unitId},
        ${item.unitPrice},
        ${item.minimumQty},
        ${item.taxIncluded},
        ${item.isActive},
        false,
        NOW(),
        NOW()
      )
    `;
  }
}

export async function createPriceList(
  input: CreatePriceListInput,
  userId: string,
  userName: string,
) {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name);
  const channel = normalizeChannel(input.channel);
  const currency = normalizeText(input.currency) ?? "ETB";
  const effectiveFrom = normalizeText(input.effectiveFrom);
  const effectiveTo = normalizeText(input.effectiveTo);
  const items = validateLineItems(input.items);

  if (!code || !name || !effectiveFrom) {
    throw new Error("Code, name, and effective from are required");
  }

  await ensureCodeIsUnique(code);
  await ensureSaleableItems(items.map((item) => item.itemId));
  if (input.isDefault && input.isActive !== false) {
    await validateDefaultPriceList(channel, effectiveFrom, effectiveTo);
  }

  const id = randomUUID();
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO "PriceList" (
        id, code, name, channel, currency, "customerGroup", "customerId", "locationId", description,
        "effectiveDate", "effectiveFrom", "effectiveTo", "isDefault", "createdById", "updatedById",
        "isActive", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${code},
        ${name},
        ${channel},
        ${currency},
        ${normalizeText(input.customerGroup)},
        ${normalizeText(input.customerId)},
        ${normalizeText(input.locationId)},
        ${normalizeText(input.description)},
        ${effectiveFrom}::timestamptz,
        ${effectiveFrom}::timestamptz,
        ${effectiveTo ?? null}::timestamptz,
        ${Boolean(input.isDefault)},
        ${userId},
        ${userId},
        ${input.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
    `;

    await insertItems(tx, id, items);
    await writeHistory(tx, id, "CREATE", userId, name);
  });

  const created = await getPriceListById(id);
  if (!created) {
    throw new Error("Failed to load newly created price list");
  }

  await createAuditLog({
    userId,
    userName,
    action: AuditAction.CREATE,
    module: "master-data.price-list",
    recordId: id,
    newValue: created as unknown as Record<string, unknown>,
  });

  return created;
}

export async function updatePriceList(
  id: string,
  input: UpdatePriceListInput,
  userId: string,
  userName: string,
) {
  const existing = await getPriceListById(id);
  if (!existing) {
    throw new Error("Price list not found");
  }

  const code = normalizeText(input.code ?? existing.code);
  const name = normalizeText(input.name ?? existing.name);
  const channel = normalizeChannel(input.channel ?? existing.channel);
  const currency = normalizeText(input.currency ?? existing.currency) ?? "ETB";
  const effectiveFrom = normalizeText(input.effectiveFrom ?? existing.effectiveFrom);
  const effectiveTo = normalizeText(input.effectiveTo ?? existing.effectiveTo);
  const items = validateLineItems(
    input.items ??
      (existing.items ?? []).map((item) => ({
        itemId: item.itemId,
        unitId: item.unitId,
        unitPrice: item.sellingPrice,
        minimumQty: item.minimumQty,
        taxIncluded: item.taxIncluded,
        isActive: item.isActive,
      })),
  );

  if (!code || !name || !effectiveFrom) {
    throw new Error("Code, name, and effective from are required");
  }

  await ensureCodeIsUnique(code, id);
  await ensureSaleableItems(items.map((item) => item.itemId));
  if ((input.isDefault ?? existing.isDefault) && (input.isActive ?? existing.isActive)) {
    await validateDefaultPriceList(channel, effectiveFrom, effectiveTo, id);
  }

  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PriceList"
      SET
        code = ${code},
        name = ${name},
        channel = ${channel},
        currency = ${currency},
        "customerGroup" = ${normalizeText(input.customerGroup ?? existing.customerGroup)},
        "customerId" = ${normalizeText(input.customerId ?? existing.customerId)},
        "locationId" = ${normalizeText(input.locationId ?? existing.locationId)},
        description = ${normalizeText(input.description ?? existing.description)},
        "effectiveDate" = ${effectiveFrom}::timestamptz,
        "effectiveFrom" = ${effectiveFrom}::timestamptz,
        "effectiveTo" = ${effectiveTo ?? null}::timestamptz,
        "isDefault" = ${input.isDefault ?? existing.isDefault},
        "isActive" = ${input.isActive ?? existing.isActive},
        "updatedById" = ${userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await tx`
      DELETE FROM "PriceListItem"
      WHERE "priceListId" = ${id}
    `;

    await insertItems(tx, id, items);
    await writeHistory(tx, id, "UPDATE", userId, name);
  });

  const updated = await getPriceListById(id);
  if (!updated) {
    throw new Error("Failed to load updated price list");
  }

  await createAuditLog({
    userId,
    userName,
    action: AuditAction.UPDATE,
    module: "master-data.price-list",
    recordId: id,
    oldValue: existing as unknown as Record<string, unknown>,
    newValue: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

export async function deactivatePriceList(
  id: string,
  userId: string,
  userName: string,
) {
  const existing = await getPriceListById(id);
  if (!existing) {
    throw new Error("Price list not found");
  }

  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PriceList"
      SET "isActive" = false, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await writeHistory(tx, id, "DEACTIVATE", userId, existing.code ?? existing.name ?? "Price List");
  });

  await createAuditLog({
    userId,
    userName,
    action: AuditAction.DELETE,
    module: "master-data.price-list",
    recordId: id,
    oldValue: existing as unknown as Record<string, unknown>,
    newValue: { isActive: false },
  });
}

export async function duplicatePriceList(
  id: string,
  userId: string,
  userName: string,
) {
  const existing = await getPriceListById(id);
  if (!existing) {
    throw new Error("Price list not found");
  }

  const duplicateCode = `${existing.code ?? "PL"}-COPY-${Date.now().toString().slice(-4)}`;
  return createPriceList(
    {
      code: duplicateCode,
      name: `${existing.name ?? "Price List"} Copy`,
      channel: existing.channel,
      currency: existing.currency ?? "ETB",
      customerGroup: existing.customerGroup,
      customerId: existing.customerId,
      locationId: existing.locationId,
      description: existing.description,
      effectiveFrom: existing.effectiveFrom ?? new Date().toISOString(),
      effectiveTo: existing.effectiveTo,
      isDefault: false,
      isActive: existing.isActive,
      items:
        existing.items?.map((item) => ({
          itemId: item.itemId,
          unitId: item.unitId,
          unitPrice: item.sellingPrice,
          minimumQty: item.minimumQty,
          taxIncluded: item.taxIncluded,
          isActive: item.isActive,
        })) ?? [],
    },
    userId,
    userName,
  );
}
