import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import postgres from "postgres";

function loadEnvFile(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const comparable = (value: string) => {
  if (!value) return "";
  const url = new URL(value);
  url.password = "";
  url.searchParams.delete("channel_binding");
  return url.toString();
};

async function main() {
  loadEnvFile(".env.test.local");
  loadEnvFile(".env.test");
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST ?? "";
  const productionUrl = process.env.DATABASE_URL ?? "";
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is required. Create .env.test.local from .env.test.example and point it to a dedicated local or CI PostgreSQL database.");
  }

  const parsed = new URL(testUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const schemaName = parsed.searchParams.get("schema") ?? "public";
  const clearlyTestOnly = /(^|[-_])test($|[-_])/i.test(databaseName) || /(^|[-_])test($|[-_])/i.test(schemaName);
  if (!clearlyTestOnly) {
    throw new Error(`Refusing database '${databaseName}' schema '${schemaName}': the database or schema name must clearly contain 'test'.`);
  }

  if (productionUrl && comparable(testUrl) === comparable(productionUrl)) {
    throw new Error("Refusing to use DATABASE_URL as the test database. TEST_DATABASE_URL must target a separate database or schema.");
  }

  const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
  const client = postgres(testUrl, { ssl: localHost ? false : "require", max: 1, connect_timeout: 10, prepare: false });
  try {
    const rows = await client<Array<{ databaseName: string; schemaName: string }>>`
      SELECT current_database() AS "databaseName", current_schema() AS "schemaName"
    `;
    const target = rows[0];
    console.log(`Verified isolated test database: ${target?.databaseName ?? databaseName} / ${target?.schemaName ?? schemaName}`);
  } finally {
    await client.end();
  }

  if (!process.argv.includes("--check-only")) {
    const executable = process.platform === "win32" ? "npx.cmd" : "npx";
    const result = spawnSync(executable, ["prisma", "db", "push"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl },
      encoding: "utf8",
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error(`Prisma test schema preparation failed with exit code ${result.status ?? "unknown"}.`);
    }
    console.log("Test database schema is ready. Tests create their own isolated fixtures.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
