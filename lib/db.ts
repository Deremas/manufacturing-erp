import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function sanitizeConnectionString(rawValue: string) {
  try {
    const parsed = new URL(rawValue);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return rawValue;
  }
}

function loadEnvFile(filePath: string) {
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
    if (process.env[key] !== undefined) {
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

const isTestRuntime =
  process.env.NODE_ENV === "test" ||
  process.argv.some((argument) => argument.includes("\\tests\\") || argument.includes("/tests/"));

if (isTestRuntime) {
  loadEnvFile(path.join(process.cwd(), ".env.test.local"));
  loadEnvFile(path.join(process.cwd(), ".env.test"));
}

if (!process.env.DATABASE_URL) {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));
}

const preferredConnectionString =
  (isTestRuntime
    ? process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST ?? ""
    : process.env.DATABASE_URL) ?? "";

const connectionString = preferredConnectionString
  ? sanitizeConnectionString(preferredConnectionString)
  : "";

function requiresSsl(rawValue: string) {
  try {
    const hostname = new URL(rawValue).hostname.toLowerCase();
    return !["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

if (!connectionString) {
  throw new Error(
    isTestRuntime
      ? "TEST_DATABASE_URL or DATABASE_URL_TEST must be set for test runs. Add a local/CI test database in .env.test or .env.test.local."
      : "DATABASE_URL is not set",
  );
}

type Sql = ReturnType<typeof postgres>;

const globalForSql = globalThis as unknown as { sql?: Sql };

function createSql() {
  return postgres(connectionString, {
    ssl: requiresSsl(connectionString) ? "require" : false,
    max: isTestRuntime ? 1 : 10,
    connect_timeout: 30,
    idle_timeout: isTestRuntime ? 5 : 20,
    max_lifetime: isTestRuntime ? 60 * 3 : 60 * 30,
    keep_alive: 30,
    prepare: isTestRuntime ? false : undefined,
  });
}

export const sql = globalForSql.sql ?? createSql();

if (!isTestRuntime) {
  globalForSql.sql = sql;
}

function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof AggregateError) return true;
  const record = error as { code?: string; errors?: unknown[] };
  const code = String(record.code ?? "");
  if (
    ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENETUNREACH", "57P01", "08000", "08001", "08003", "08006", "53300", "57P03"].includes(code)
  ) {
    return true;
  }
  return Array.isArray(record.errors) && record.errors.some((entry) => isTransientDbError(entry));
}

export async function withDbRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      return await run();
    } catch (retryError) {
      if (!isTransientDbError(retryError)) throw retryError;
      throw new Error("Could not reach the database. Refresh the page and try again.", { cause: retryError });
    }
  }
}
