import { randomUUID } from "crypto";

import { sql } from "@/lib/db";

const PAYMENT_TERMS_KEY = "procurement.paymentTerms";

const DEFAULT_PAYMENT_TERMS = [
  "Net 30",
  "Net 60",
  "Net 90",
  "COD",
  "Advance Payment",
  "Due on Receipt",
];

function normalizeTerms(items: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of items) {
    const value = String(item ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }
  return normalized;
}

async function ensureDefaultPaymentTerms() {
  const rows = await sql<Array<{ value: string }>>`
    SELECT value
    FROM "SystemSetting"
    WHERE key = ${PAYMENT_TERMS_KEY}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (rows[0]?.value) {
    return;
  }

  await sql`
    INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
    VALUES (
      ${randomUUID()},
      ${PAYMENT_TERMS_KEY},
      ${JSON.stringify(DEFAULT_PAYMENT_TERMS)},
      'procurement',
      false
    )
    ON CONFLICT ("key")
    DO NOTHING
  `;
}

export async function listPaymentTerms(): Promise<string[]> {
  await ensureDefaultPaymentTerms();
  const rows = await sql<Array<{ value: string }>>`
    SELECT value
    FROM "SystemSetting"
    WHERE key = ${PAYMENT_TERMS_KEY}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]?.value) {
    return [...DEFAULT_PAYMENT_TERMS];
  }

  try {
    const parsed = JSON.parse(rows[0].value) as unknown;
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_PAYMENT_TERMS];
    }
    const items = normalizeTerms(parsed.map((item) => String(item)));
    return items.length > 0 ? items : [...DEFAULT_PAYMENT_TERMS];
  } catch {
    return [...DEFAULT_PAYMENT_TERMS];
  }
}

export async function savePaymentTerms(items: string[]) {
  const normalized = normalizeTerms(items);
  if (normalized.length === 0) {
    throw new Error("At least one payment term is required");
  }

  await sql`
    INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
    VALUES (
      ${randomUUID()},
      ${PAYMENT_TERMS_KEY},
      ${JSON.stringify(normalized)},
      'procurement',
      false
    )
    ON CONFLICT ("key")
    DO UPDATE SET
      value = EXCLUDED.value,
      category = EXCLUDED.category,
      "isArchived" = false
  `;

  return normalized;
}

export function paymentTermsToOptions(items: string[]) {
  return items.map((item) => ({ value: item, label: item }));
}
