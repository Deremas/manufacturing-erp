import { postOpeningStock } from "@/services/inventory/inventory-posting.service";
import { sql } from "@/lib/db";

export interface SeedOpeningStockOptions {
  force?: boolean;
  quantityPerItem?: number;
  itemLimit?: number;
  locationLimit?: number;
  createdById?: string;
  remarks?: string;
}

export interface SeedOpeningStockResult {
  skipped: boolean;
  seededMovements: number;
  createdById: string;
  itemsUsed: number;
  locationsUsed: number;
  quantityPerItem: number;
}

export async function seedOpeningStock(
  options: SeedOpeningStockOptions = {},
): Promise<SeedOpeningStockResult> {
  const quantityPerItem = Math.max(1, Number(options.quantityPerItem ?? 25));
  const itemLimit = Math.max(1, Number(options.itemLimit ?? 3));
  const locationLimit = Math.max(1, Number(options.locationLimit ?? 2));

  const existingBalances = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "StockBalance"
    WHERE quantity > 0
  `;
  const positiveBalanceCount = Number(existingBalances[0]?.count ?? 0);

  const userId =
    options.createdById ??
    (
      await sql<Array<{ id: string }>>`
        SELECT id
        FROM "User"
        WHERE "isArchived" = false AND "isActive" = true
        ORDER BY "createdAt" ASC
        LIMIT 1
      `
    )[0]?.id;

  if (!userId) {
    throw new Error("No active user found for stock seeding");
  }

  if (positiveBalanceCount > 0 && !options.force) {
    return {
      skipped: true,
      seededMovements: 0,
      createdById: userId,
      itemsUsed: 0,
      locationsUsed: 0,
      quantityPerItem,
    };
  }

  const locations = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "Location"
    WHERE "isArchived" = false AND "isActive" = true AND "isStockLocation" = true
    ORDER BY "locationName" ASC
    LIMIT ${locationLimit}
  `;
  const items = await sql<Array<{ id: string; standardCost: number | null }>>`
    SELECT id, "standardCost"
    FROM "Item"
    WHERE "isArchived" = false AND "isActive" = true
    ORDER BY "itemName" ASC
    LIMIT ${itemLimit}
  `;

  if (locations.length === 0) {
    throw new Error("No active stock locations found for stock seeding");
  }
  if (items.length === 0) {
    throw new Error("No active items found for stock seeding");
  }

  let seededMovements = 0;
  const timestamp = Date.now();

  for (const [locationIndex, location] of locations.entries()) {
    for (const [itemIndex, item] of items.entries()) {
      const quantity = locationIndex === 0 ? quantityPerItem : Math.max(1, Math.floor(quantityPerItem / 2));
      await postOpeningStock({
        itemId: item.id,
        locationId: location.id,
        sourceModule: "inventory.seed",
        sourceDocumentId: `seed-opening-${timestamp}-${locationIndex + 1}-${itemIndex + 1}`,
        qtyIn: quantity,
        qtyOut: 0,
        unitCost: Number(item.standardCost ?? 1),
        remarks: options.remarks ?? "Seeded opening stock for test environment",
        createdById: userId,
      });
      seededMovements += 1;
    }
  }

  return {
    skipped: false,
    seededMovements,
    createdById: userId,
    itemsUsed: items.length,
    locationsUsed: locations.length,
    quantityPerItem,
  };
}
