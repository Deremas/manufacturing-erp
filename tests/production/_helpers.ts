import { randomUUID } from "crypto";

import { sql } from "@/lib/db";

import { createInventoryTestContext } from "../inventory/_helpers";

export interface ProductionTestContext {
  adminUserId: string;
  secondUserId: string;
  storeLocationId: string;
  productionLocationId: string;
  outputLocationId: string;
  rawItemId: string;
  fgItemId: string;
  rawUomId: string | null;
  fgUomId: string | null;
}

export async function createProductionTestContext(): Promise<ProductionTestContext> {
  const inventoryContext = await createInventoryTestContext();
  const supportRows = await sql<Array<{ categoryId: string | null; uomId: string | null }>>`
    SELECT
      (SELECT id FROM "Category" WHERE "isArchived" = false ORDER BY "createdAt" ASC LIMIT 1) AS "categoryId",
      (SELECT id FROM "Unit" WHERE "isArchived" = false ORDER BY "createdAt" ASC LIMIT 1) AS "uomId"
  `;
  const support = supportRows[0];

  const productionLocationRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "Location"
    WHERE "isArchived" = false
      AND "isActive" = true
      AND "isProductionLocation" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  let productionLocationId = productionLocationRows[0]?.id;
  if (!productionLocationId) {
    productionLocationId = randomUUID();
    await sql`
      INSERT INTO "Location" (
        id, "locationCode", "locationName", "locationType", "isStockLocation", "isProductionLocation",
        "isActive", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${productionLocationId},
        ${`PRD-${Date.now()}`},
        'Test Production Floor',
        'PRODUCTION',
        false,
        true,
        true,
        false,
        NOW(),
        NOW()
      )
    `;
  }

  const rawItemId = randomUUID();
  const fgItemId = randomUUID();
  const rawCode = `RAW-${Date.now()}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const fgCode = `FG-${Date.now()}-${randomUUID().slice(0, 4).toUpperCase()}`;

  await sql`
    INSERT INTO "Item" (
      id, "itemCode", "itemName", "categoryId", "uomId", "standardCost",
      "isActive", "isArchived", "createdAt", "updatedAt"
    )
    VALUES
      (
        ${rawItemId},
        ${rawCode},
        ${`Raw Material ${rawCode}`},
        ${support?.categoryId ?? null},
        ${support?.uomId ?? null},
        12,
        true,
        false,
        NOW(),
        NOW()
      ),
      (
        ${fgItemId},
        ${fgCode},
        ${`Finished Good ${fgCode}`},
        ${support?.categoryId ?? null},
        ${support?.uomId ?? null},
        0,
        true,
        false,
        NOW(),
        NOW()
      )
  `;

  return {
    adminUserId: inventoryContext.adminUserId,
    secondUserId: inventoryContext.secondUserId,
    storeLocationId: inventoryContext.sourceLocationId,
    productionLocationId,
    outputLocationId: inventoryContext.destinationLocationId,
    rawItemId,
    fgItemId,
    rawUomId: support?.uomId ?? null,
    fgUomId: support?.uomId ?? null,
  };
}
