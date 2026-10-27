import { sql } from "@/lib/db";
import { normalizeDocumentNumberingDefaults } from "@/lib/document-numbering";
import { repairLegacyItemCodes } from "@/lib/server/item-data";

async function main() {
  console.log("Normalizing document numbering to PREFIX + short sequences (01, 02, ...)");
  await normalizeDocumentNumberingDefaults(sql);
  await sql`
    UPDATE "DocumentNumbering"
    SET
      "prefixFormat" = 'PREFIX',
      "sequenceLength" = 2,
      separator = COALESCE(NULLIF(separator, ''), '-')
    WHERE "isArchived" = false
  `;

  console.log("Repairing legacy UUID-like item codes...");
  await repairLegacyItemCodes();

  const samples = await sql<Array<{ prefix: string; prefixFormat: string; sequenceLength: number; currentSequence: number }>>`
    SELECT prefix, "prefixFormat", "sequenceLength", "currentSequence"
    FROM "DocumentNumbering"
    WHERE "isArchived" = false
    ORDER BY prefix ASC
    LIMIT 20
  `;
  console.log("Sample numbering configs:", samples);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
