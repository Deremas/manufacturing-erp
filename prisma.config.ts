import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "@prisma/config";

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

// Match Next.js: .env then .env.local (local wins). Do not keep a stale Neon
// DATABASE_URL from the shell when .env.local points at the app database.
loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"), true);

function sanitizePrismaDatasourceUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol.startsWith("postgres")) {
      parsed.searchParams.delete("channel_binding");
      return parsed.toString();
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: sanitizePrismaDatasourceUrl(process.env.DATABASE_URL)!,
  },
});
