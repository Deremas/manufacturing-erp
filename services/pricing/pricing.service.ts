import { sql } from "@/lib/db";
import { PRICE_CHANNELS, type PriceChannel } from "@/lib/pricing/channels";

export interface PriceResolutionContext {
  customerId?: string | null;
  locationId?: string | null;
  customerGroup?: string | null;
  agentId?: string | null;
}

export interface ResolvedItemPrice {
  priceListId: string;
  priceListItemId: string;
  itemId: string;
  unitId?: string;
  unitPrice: number;
  currency: string;
  taxIncluded: boolean;
  uomName?: string;
  uomCode?: string;
  channel: PriceChannel;
  priceListCode?: string;
  priceListName?: string;
}

type PriceCandidateRow = {
  priceListId: string;
  priceListItemId: string;
  itemId: string;
  unitId: string | null;
  unitPrice: number;
  minimumQty: number | null;
  taxIncluded: boolean;
  currency: string;
  channel: string;
  priceListCode: string | null;
  priceListName: string | null;
  customerId: string | null;
  locationId: string | null;
  customerGroup: string | null;
  isDefault: boolean;
  uomCode: string | null;
  uomName: string | null;
};

function normalizeChannel(value: string): PriceChannel {
  const normalized = String(value ?? "").trim().toUpperCase() as PriceChannel;
  if (!PRICE_CHANNELS.includes(normalized)) {
    throw new Error("Invalid pricing channel");
  }
  return normalized;
}

function priorityScore(
  row: PriceCandidateRow,
  context: PriceResolutionContext,
  quantity: number,
) {
  let score = 0;

  if (context.customerId && row.customerId === context.customerId) score += 100;
  if (context.agentId && row.customerId === context.agentId) score += 100;
  if (context.locationId && row.locationId === context.locationId) score += 80;
  if (context.customerGroup && row.customerGroup === context.customerGroup) score += 60;
  if (row.isDefault) score += 40;
  if ((row.minimumQty ?? 1) <= quantity) score += 20;

  return score;
}

export async function getActivePriceList(
  channel: string,
  date: string,
  customerId?: string | null,
  locationId?: string | null,
  customerGroup?: string | null,
) {
  const normalizedChannel = normalizeChannel(channel);
  const rows = await sql<Array<{ id: string }>>`
    SELECT pl.id
    FROM "PriceList" pl
    WHERE pl.channel = ${normalizedChannel}
      AND pl."isActive" = true
      AND pl."isArchived" = false
      AND COALESCE(pl."effectiveFrom", NOW()) <= ${date}::timestamptz
      AND COALESCE(pl."effectiveTo", 'infinity'::timestamptz) >= ${date}::timestamptz
      AND (${customerId ?? null}::text IS NULL OR pl."customerId" IS NULL OR pl."customerId" = ${customerId ?? null})
      AND (${locationId ?? null}::text IS NULL OR pl."locationId" IS NULL OR pl."locationId" = ${locationId ?? null})
      AND (${customerGroup ?? null}::text IS NULL OR pl."customerGroup" IS NULL OR pl."customerGroup" = ${customerGroup ?? null})
    ORDER BY pl."isDefault" DESC, COALESCE(pl."effectiveFrom", pl."createdAt") DESC
    LIMIT 1
  `;

  return rows[0]?.id ?? null;
}

export async function getItemPrice(
  itemId: string,
  channel: string,
  date: string,
  quantity = 1,
  context: PriceResolutionContext = {},
): Promise<ResolvedItemPrice> {
  const normalizedChannel = normalizeChannel(channel);

  const rows = await sql<PriceCandidateRow[]>`
    SELECT
      pl.id AS "priceListId",
      pli.id AS "priceListItemId",
      pli."itemId",
      pli."unitId",
      pli."sellingPrice" AS "unitPrice",
      pli."minimumQty",
      pli."taxIncluded",
      pl.currency,
      pl.channel,
      pl.code AS "priceListCode",
      pl.name AS "priceListName",
      pl."customerId",
      pl."locationId",
      pl."customerGroup",
      pl."isDefault",
      u.code AS "uomCode",
      u.name AS "uomName"
    FROM "PriceListItem" pli
    INNER JOIN "PriceList" pl ON pl.id = pli."priceListId"
    LEFT JOIN "Unit" u ON u.id = pli."unitId"
    WHERE pli."itemId" = ${itemId}
      AND pli."isActive" = true
      AND pli."isArchived" = false
      AND pl.channel = ${normalizedChannel}
      AND pl."isActive" = true
      AND pl."isArchived" = false
      AND COALESCE(pl."effectiveFrom", NOW()) <= ${date}::timestamptz
      AND COALESCE(pl."effectiveTo", 'infinity'::timestamptz) >= ${date}::timestamptz
      AND (pli."minimumQty" IS NULL OR pli."minimumQty" <= ${quantity})
  `;

  if (rows.length === 0) {
    throw new Error("No active price found for this item/channel/date.");
  }

  const ranked = [...rows].sort((left, right) => {
    const priorityDiff =
      priorityScore(right, context, quantity) - priorityScore(left, context, quantity);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return Number(right.minimumQty ?? 1) - Number(left.minimumQty ?? 1);
  });

  const winner = ranked[0];
  if (!winner) {
    throw new Error("No active price found for this item/channel/date.");
  }

  return {
    priceListId: winner.priceListId,
    priceListItemId: winner.priceListItemId,
    itemId: winner.itemId,
    unitId: winner.unitId ?? undefined,
    unitPrice: Number(winner.unitPrice),
    currency: winner.currency,
    taxIncluded: winner.taxIncluded,
    uomName: winner.uomName ?? undefined,
    uomCode: winner.uomCode ?? undefined,
    channel: normalizedChannel,
    priceListCode: winner.priceListCode ?? undefined,
    priceListName: winner.priceListName ?? undefined,
  };
}

export async function applyPriceToLine(
  itemId: string,
  channel: string,
  quantity: number,
  date: string,
  context: PriceResolutionContext = {},
) {
  const resolved = await getItemPrice(itemId, channel, date, quantity, context);

  return {
    ...resolved,
    quantity,
    lineTotal: Number((quantity * resolved.unitPrice).toFixed(2)),
  };
}

export function resolveTransactionChannel(context: {
  explicitChannel?: string | null;
  locationType?: string | null;
}) {
  if (context.explicitChannel) {
    return normalizeChannel(context.explicitChannel);
  }

  const locationType = String(context.locationType ?? "").toUpperCase();
  if (locationType.includes("BRANCH")) {
    return "BRANCH";
  }

  return "FACTORY";
}
