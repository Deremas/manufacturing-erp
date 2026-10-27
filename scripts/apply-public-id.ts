/**
 * Apply publicId columns using the same DB as Next.js (.env.local wins).
 * Usage: npm run db:public-id
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string, override = false) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  for (const line of fileContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!override && process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"), true);

async function main() {
  const { sql } = await import("@/lib/db");
  const file = path.resolve(
    process.cwd(),
    "prisma/migrations/20260901_all_public_ids/migration.sql",
  );
  const raw = fs.readFileSync(file, "utf8");
  const statements = raw
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);

  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "(unknown)";
    }
  })();
  console.log(`Using database host: ${host}`);
  console.log(`Applying ${statements.length} statements...`);

  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      console.log("OK:", statement.slice(0, 80).replace(/\s+/g, " "));
    } catch (error) {
      console.error("FAIL:", statement.slice(0, 80).replace(/\s+/g, " "));
      console.error(error);
      throw error;
    }
  }

  const [check] = await sql<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'PurchaseRequisition'
        AND column_name = 'publicId'
    ) AS exists
  `;
  console.log("PurchaseRequisition.publicId exists:", check?.exists === true);
  await sql.end({ timeout: 5 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
