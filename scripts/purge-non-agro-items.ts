import { sql } from "@/lib/db";

type CanonicalItem = {
  itemCode: string;
  itemName: string;
  categoryCode: string;
  itemTypeCode: string;
  uomCode: string;
  reorderPoint: number;
};

const CANONICAL_ITEMS: CanonicalItem[] = [
  { itemCode: "RM-001", itemName: "Raw Groundnuts (Peanuts)", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-002", itemName: "Raw Sesame Seeds", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-003", itemName: "Raw Soybeans", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-004", itemName: "Raw Sunflower Seeds", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-005", itemName: "Raw Maize (Corn)", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-006", itemName: "Raw Wheat Grain", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-007", itemName: "Raw Sorghum", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-008", itemName: "Raw Barley", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-009", itemName: "Raw Teff Grain", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-010", itemName: "Raw Chickpeas", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-011", itemName: "Raw Red Kidney Beans", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-012", itemName: "Raw White Beans", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-013", itemName: "Raw Green Mung Beans", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-014", itemName: "Raw Niger Seeds (Nug)", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "RM-015", itemName: "Raw Flaxseeds", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100 },
  { itemCode: "ING-001", itemName: "White Granulated Sugar", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50 },
  { itemCode: "ING-002", itemName: "Natural Honey", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50 },
  { itemCode: "ING-003", itemName: "Iodized Salt", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50 },
  { itemCode: "ING-004", itemName: "Refined Sunflower Oil", categoryCode: "ING", itemTypeCode: "ING", uomCode: "L", reorderPoint: 50 },
  { itemCode: "ING-005", itemName: "Vegetable Oil", categoryCode: "ING", itemTypeCode: "ING", uomCode: "L", reorderPoint: 50 },
  { itemCode: "ING-006", itemName: "Cocoa Powder", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50 },
  { itemCode: "ING-007", itemName: "Food-Grade Citric Acid", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50 },
  { itemCode: "ING-008", itemName: "Vanilla Flavoring", categoryCode: "ING", itemTypeCode: "ING", uomCode: "L", reorderPoint: 50 },
  { itemCode: "WIP-001", itemName: "Cleaned Groundnuts", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40 },
  { itemCode: "WIP-002", itemName: "Roasted Groundnuts", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40 },
  { itemCode: "WIP-003", itemName: "Ground Peanut Paste", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40 },
  { itemCode: "WIP-004", itemName: "Bulk Peanut Butter", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40 },
  { itemCode: "WIP-005", itemName: "Cleaned Sesame Seeds", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40 },
  { itemCode: "WIP-006", itemName: "Roasted Sesame Seeds", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40 },
  { itemCode: "WIP-007", itemName: "Ground Sesame Paste (Tahini)", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40 },
  { itemCode: "FG-001", itemName: "Creamy Peanut Butter 500 g", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-002", itemName: "Creamy Peanut Butter 1 kg", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-003", itemName: "Creamy Peanut Butter 4 kg", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-004", itemName: "Crunchy Peanut Butter 500 g", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-005", itemName: "Crunchy Peanut Butter 1 kg", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-006", itemName: "Natural Peanut Butter 1 kg", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-007", itemName: "Sesame Tahini 500 g", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-008", itemName: "Sesame Tahini 1 kg", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-009", itemName: "Roasted Salted Peanuts 250 g", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "FG-010", itemName: "Roasted Salted Peanuts 500 g", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100 },
  { itemCode: "PKG-001", itemName: "Plastic Jar 500 g", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "PKG-002", itemName: "Plastic Jar 1 kg", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "PKG-003", itemName: "Plastic Jar 4 kg", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "PKG-004", itemName: "Plastic Jar Lid", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "PKG-005", itemName: "Induction Sealing Foil", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "PKG-006", itemName: "Peanut Butter Product Label", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "PKG-007", itemName: "Corrugated Packaging Carton", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "PKG-008", itemName: "Food-Grade Packaging Pouch 250 g", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200 },
  { itemCode: "CON-001", itemName: "Food-Grade Cleaning Detergent", categoryCode: "CONS", itemTypeCode: "CONS", uomCode: "L", reorderPoint: 20 },
  { itemCode: "CON-002", itemName: "Disposable Food Handling Gloves", categoryCode: "CONS", itemTypeCode: "CONS", uomCode: "BOX", reorderPoint: 20 },
];

const KEEP_CODES = CANONICAL_ITEMS.map((item) => item.itemCode);

function makeSeedId(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

async function ensureLookups() {
  const units = [
    { code: "PCS", name: "Piece", abbreviation: "pcs", type: "QUANTITY" },
    { code: "KG", name: "Kilogram", abbreviation: "kg", type: "WEIGHT" },
    { code: "L", name: "Liter", abbreviation: "l", type: "VOLUME" },
    { code: "LTR", name: "Liter", abbreviation: "ltr", type: "VOLUME" },
    { code: "BOX", name: "Box", abbreviation: "box", type: "QUANTITY" },
  ];
  for (const unit of units) {
    await sql`
      INSERT INTO "Unit" ("id", "code", "name", "abbreviation", "type", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("unit", unit.code)}, ${unit.code}, ${unit.name}, ${unit.abbreviation}, ${unit.type}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "abbreviation" = EXCLUDED."abbreviation",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  const categories = [
    { code: "RAW", name: "Raw Materials" },
    { code: "ING", name: "Ingredients & Additives" },
    { code: "WIP", name: "Work-in-Progress / Semi-Finished Products" },
    { code: "PACK", name: "Packaging Materials" },
    { code: "FG", name: "Finished Products" },
    { code: "CONS", name: "Production Consumables" },
  ];
  for (const category of categories) {
    await sql`
      INSERT INTO "Category" ("id", "code", "name", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("category", category.code)}, ${category.code}, ${category.name}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  const itemTypes = [
    { code: "RAW", name: "Raw Material" },
    { code: "ING", name: "Ingredient" },
    { code: "WIP", name: "WIP" },
    { code: "PACK", name: "Packaging Material" },
    { code: "FG", name: "Finished Good" },
    { code: "CONS", name: "Consumable" },
  ];
  for (const itemType of itemTypes) {
    await sql`
      INSERT INTO "ItemType" ("id", "code", "name", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("itemtype", itemType.code)}, ${itemType.code}, ${itemType.name}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }
}

async function upsertCanonicalItems() {
  await ensureLookups();
  const [categories, units, itemTypes] = await Promise.all([
    sql<Array<{ id: string; code: string | null }>>`SELECT id, code FROM "Category"`,
    sql<Array<{ id: string; code: string | null }>>`SELECT id, code FROM "Unit"`,
    sql<Array<{ id: string; code: string }>>`SELECT id, code FROM "ItemType"`,
  ]);
  const categoryByCode = new Map(categories.map((row) => [row.code ?? "", row.id]));
  const unitByCode = new Map(units.map((row) => [row.code ?? "", row.id]));
  const itemTypeByCode = new Map(itemTypes.map((row) => [row.code, row.id]));

  for (const item of CANONICAL_ITEMS) {
    const categoryId = categoryByCode.get(item.categoryCode) ?? null;
    const itemTypeId = itemTypeByCode.get(item.itemTypeCode) ?? null;
    const uomId = unitByCode.get(item.uomCode) ?? null;
    if (!uomId) {
      throw new Error(`Missing unit ${item.uomCode} for ${item.itemCode}`);
    }
    await sql`
      INSERT INTO "Item" (
        id, "itemCode", "itemName", sku, "categoryId", "itemTypeId", "uomId",
        "reorderPoint", "standardCost", "sellingPrice", "vatApplicable", "exciseApplicable",
        "isActive", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${makeSeedId("item", item.itemCode)},
        ${item.itemCode},
        ${item.itemName},
        ${item.itemCode},
        ${categoryId},
        ${itemTypeId},
        ${uomId},
        ${item.reorderPoint},
        0,
        0,
        true,
        false,
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("itemCode") DO UPDATE SET
        "itemName" = EXCLUDED."itemName",
        sku = EXCLUDED.sku,
        "categoryId" = EXCLUDED."categoryId",
        "itemTypeId" = EXCLUDED."itemTypeId",
        "uomId" = EXCLUDED."uomId",
        "reorderPoint" = EXCLUDED."reorderPoint",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }
}

async function main() {
  const before = await sql<Array<{ itemCode: string; itemName: string; isArchived: boolean }>>`
    SELECT "itemCode", "itemName", "isArchived"
    FROM "Item"
    ORDER BY "itemCode"
  `;
  const extraBefore = before.filter((row) => !KEEP_CODES.includes(row.itemCode));
  console.log(`Items before: ${before.length} (${extraBefore.length} extra/test)`);

  await upsertCanonicalItems();

  const extra = await sql<Array<{ id: string; itemCode: string; itemName: string }>>`
    SELECT id, "itemCode", "itemName"
    FROM "Item"
    WHERE "itemCode" <> ALL(${KEEP_CODES})
    ORDER BY "itemCode"
  `;
  console.log(`Extra items to remove: ${extra.length}`);

  await sql`DELETE FROM "StockMovement"`;
  await sql`DELETE FROM "StockReservation"`;
  await sql`DELETE FROM "StockBalance"`;
  console.log("Cleared stock movements, reservations, and balances.");

  if (extra.length > 0) {
    const archived = await sql`
      UPDATE "Item"
      SET "isActive" = false, "isArchived" = true, "updatedAt" = NOW()
      WHERE "itemCode" <> ALL(${KEEP_CODES})
      RETURNING id
    `;
    console.log(`Archived ${archived.length} extra/test items so only the 50 agro items remain active.`);
  }

  const after = await sql<Array<{ itemCode: string; itemName: string; uom: string | null; type: string | null }>>`
    SELECT i."itemCode", i."itemName", u.code AS uom, it.code AS type
    FROM "Item" i
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    WHERE i."isArchived" = false
    ORDER BY i."itemCode"
  `;
  const movements = await sql<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "StockMovement"`;
  const balances = await sql<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "StockBalance"`;

  console.log(`Items after: ${after.length}`);
  for (const row of after) {
    console.log(`  ${row.itemCode} | ${row.itemName} | ${row.uom ?? "-"} | ${row.type ?? "-"}`);
  }
  console.log(`Stock movements: ${movements[0]?.count ?? 0}`);
  console.log(`Stock balances: ${balances[0]?.count ?? 0}`);

  if (after.length !== KEEP_CODES.length) {
    throw new Error(`Expected ${KEEP_CODES.length} items, found ${after.length}`);
  }
  const unexpected = after.filter((row) => !KEEP_CODES.includes(row.itemCode));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected leftover items: ${unexpected.map((row) => row.itemCode).join(", ")}`);
  }
  const missing = KEEP_CODES.filter((code) => !after.some((row) => row.itemCode === code));
  if (missing.length > 0) {
    throw new Error(`Missing canonical items: ${missing.join(", ")}`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to purge non-agro items.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
