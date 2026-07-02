import fs from "node:fs";
import path from "node:path";

import { sql } from "@/lib/db";

async function main() {
  const migrationPath = process.argv[2];
  if (!migrationPath) {
    throw new Error("Usage: tsx scripts/apply-sql-migration.ts <migration.sql>");
  }

  const absolutePath = path.resolve(process.cwd(), migrationPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Migration file not found: ${absolutePath}`);
  }

  const statement = fs.readFileSync(absolutePath, "utf8");
  await sql.unsafe(statement);
  console.log(`Applied SQL migration: ${absolutePath}`);
}

main()
  .catch((error) => {
    console.error("Failed to apply SQL migration:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
