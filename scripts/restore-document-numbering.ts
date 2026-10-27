import { sql } from "@/lib/db";
import { restoreDocumentNumberingDefaults } from "@/lib/document-numbering";

async function main() {
  console.log("Restoring document numbering to PREFIX-YEAR-SEQUENCE (e.g. PO-2026-0001)...");
  await restoreDocumentNumberingDefaults(sql);

  const samples = await sql<Array<{ prefix: string; prefixFormat: string; sequenceLength: number; currentSequence: number }>>`
    SELECT prefix, "prefixFormat", "sequenceLength", "currentSequence"
    FROM "DocumentNumbering"
    WHERE "isArchived" = false
      AND prefix IN ('PO', 'PR', 'GRN', 'SINV', 'SPAY')
    ORDER BY prefix ASC
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
