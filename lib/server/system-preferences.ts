import { sql } from "@/lib/db";

export interface SystemPreferences {
  currencyCode: string;
  currencyLabel: string;
  dateFormat: string;
}

const CURRENCY_LABELS: Record<string, string> = {
  ETB: "Ethiopian Birr",
  USD: "US Dollar",
  KES: "Kenyan Shilling",
  EUR: "Euro",
  GBP: "British Pound",
};

function getCurrencyLabel(currencyCode: string) {
  return CURRENCY_LABELS[currencyCode] ?? currencyCode;
}

export async function getSystemPreferences(): Promise<SystemPreferences> {
  const settingRows = await sql<Array<{ key: string; value: string | null }>>`
    SELECT key, value
    FROM "SystemSetting"
    WHERE key IN ('defaultCurrency', 'dateFormat')
      AND "isArchived" = false
  `;

  const settings = new Map(
    settingRows.map((row) => [row.key, String(row.value ?? "").trim()]),
  );

  let currencyCode = settings.get("defaultCurrency") || "";
  const dateFormat = settings.get("dateFormat") || "DD/MM/YYYY";

  if (!currencyCode) {
    const companyRows = await sql<Array<{ defaultCurrency: string | null }>>`
      SELECT "defaultCurrency"
      FROM "Company"
      WHERE "isArchived" = false
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;

    currencyCode = String(companyRows[0]?.defaultCurrency ?? "").trim();
  }

  if (!currencyCode) {
    currencyCode = "ETB";
  }

  return {
    currencyCode,
    currencyLabel: getCurrencyLabel(currencyCode),
    dateFormat,
  };
}
