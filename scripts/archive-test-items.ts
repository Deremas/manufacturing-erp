import { sql } from "@/lib/db";

type ItemMatchRow = {
  id: string;
  itemCode: string;
  itemName: string;
};

async function main() {
  const matches = await sql<ItemMatchRow[]>`
    SELECT id, "itemCode", "itemName"
    FROM "Item"
    WHERE "isArchived" = false
      AND (
        UPPER("itemCode") LIKE 'TEST-INV-%'
        OR UPPER("itemCode") IN ('RAW-TEST', 'RAW-COST')
        OR UPPER("itemCode") ~ '^RAW-[0-9]{10,}-[A-F0-9]{4,}$'
        OR UPPER("itemCode") ~ '^FG-[0-9]{10,}-[A-F0-9]{4,}$'
        OR UPPER("itemName") LIKE 'INVENTORY TEST ITEM %'
        OR UPPER("itemName") ~ '^RAW MATERIAL RAW-[0-9]{10,}-[A-F0-9]{4,}$'
        OR UPPER("itemName") ~ '^FINISHED GOOD FG-[0-9]{10,}-[A-F0-9]{4,}$'
      )
    ORDER BY "itemCode" ASC
  `;

  if (matches.length === 0) {
    console.log("No legacy test items found.");
    return;
  }

  await sql.begin(async (tx) => {
    const ids = matches.map((row) => row.id);
    await tx`
      UPDATE "Item"
      SET "isActive" = false,
          "isArchived" = true,
          "updatedAt" = NOW()
      WHERE id = ANY(${ids}::text[])
    `;
  });

  console.log(`Archived ${matches.length} legacy test items.`);
  for (const row of matches) {
    console.log(`- ${row.itemCode} | ${row.itemName}`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to archive legacy test items.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
