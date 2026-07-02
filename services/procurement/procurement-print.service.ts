import { sql } from "@/lib/db";

export async function getProcurementPrintContext() {
  const [companyRows, settingRows] = await Promise.all([
    sql<Array<{
      companyName: string;
      address: string | null;
      phone: string | null;
      email: string | null;
      tinNumber: string | null;
    }>>`
      SELECT "companyName", address, phone, email, "tinNumber"
      FROM "Company"
      WHERE "isArchived" = false
      ORDER BY "createdAt" ASC
      LIMIT 1
    `,
    sql<Array<{ key: string; value: string }>>`
      SELECT key, value
      FROM "SystemSetting"
      WHERE key IN ('defaultCurrency', 'dateFormat') AND "isArchived" = false
    `,
  ]);

  const settings = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));

  return {
    company: companyRows[0] ?? {
      companyName: "Company",
      address: null,
      phone: null,
      email: null,
      tinNumber: null,
    },
    currency: settings.defaultCurrency ?? "ETB",
    dateFormat: settings.dateFormat ?? "DD/MM/YYYY",
  };
}
