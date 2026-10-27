import type { DocumentPrefix } from "@/lib/constants";
import { sql } from "@/lib/db";

export interface DocumentNumberingConfig {
  prefix: DocumentPrefix;
  prefixFormat: string;
  separator: string;
  yearFormat: "YYYY" | "YY";
  sequenceLength: number;
  currentSequence: number;
}

function padSequence(value: number, length: number) {
  return value.toString().padStart(length, "0");
}

function getYearValue(date: Date, format: "YYYY" | "YY") {
  const fullYear = date.getFullYear().toString();
  return format === "YY" ? fullYear.slice(-2) : fullYear;
}

function composeDocumentNumber(
  prefix: string,
  date: Date,
  sequence: number,
  config: {
    prefixFormat: string;
    separator: string;
    yearFormat: string;
    monthFormat: string;
    dayFormat: string;
    sequenceLength: number;
  },
) {
  const year = getYearValue(date, config.yearFormat === "YY" ? "YY" : "YYYY");
  const month =
    config.monthFormat && config.monthFormat !== "NONE"
      ? `${date.getMonth() + 1}`.padStart(2, "0")
      : "";
  const day =
    config.dayFormat && config.dayFormat !== "NONE"
      ? `${date.getDate()}`.padStart(2, "0")
      : "";
  const seq = padSequence(sequence, config.sequenceLength);
  const separator = config.separator ?? "";

  return [prefix, year, month, day, seq].filter(Boolean).join(separator);
}

async function ensurePrefixConfig(prefix: string) {
  const existing = await sql<
    Array<{
      prefix: string;
      prefixFormat: string;
      separator: string;
      yearFormat: string;
      monthFormat: string;
      dayFormat: string;
      sequenceLength: number;
      currentSequence: number;
    }>
  >`
    SELECT
      prefix,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence"
    FROM "DocumentNumbering"
    WHERE prefix = ${prefix} AND "isArchived" = false
    LIMIT 1
  `;

  if (existing[0]) {
    return existing[0];
  }

  const inserted = await sql<
    Array<{
      prefix: string;
      prefixFormat: string;
      separator: string;
      yearFormat: string;
      monthFormat: string;
      dayFormat: string;
      sequenceLength: number;
      currentSequence: number;
    }>
  >`
    INSERT INTO "DocumentNumbering" (
      prefix,
      description,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence",
      "isActive",
      "isArchived"
    )
    VALUES (
      ${prefix},
      ${prefix},
      'PREFIX',
      '-',
      'YYYY',
      'NONE',
      'NONE',
      4,
      0,
      true,
      false
    )
    RETURNING
      prefix,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence"
  `;

  return inserted[0];
}

export async function getNextSequence(
  prefix: string,
  _year?: string,
): Promise<number> {
  await ensurePrefixConfig(prefix);

  const result = await sql.begin(async (tx) => {
    const config = await tx<
      Array<{
        currentSequence: number;
      }>
    >`
      SELECT "currentSequence"
      FROM "DocumentNumbering"
      WHERE prefix = ${prefix} AND "isArchived" = false
      FOR UPDATE
    `;

    const nextValue = (config[0]?.currentSequence ?? 0) + 1;
    await tx`
      UPDATE "DocumentNumbering"
      SET "currentSequence" = ${nextValue}
      WHERE prefix = ${prefix} AND "isArchived" = false
    `;
    return nextValue;
  });

  return result;
}

export async function generateNumber(prefix: DocumentPrefix): Promise<string> {
  const config = await ensurePrefixConfig(prefix);
  const sequence = await getNextSequence(prefix);
  return composeDocumentNumber(prefix, new Date(), sequence, config);
}

export async function resetSequence(
  prefix: string,
  _year: string,
  value: number,
): Promise<void> {
  await ensurePrefixConfig(prefix);
  await sql`
    UPDATE "DocumentNumbering"
    SET "currentSequence" = ${value}
    WHERE prefix = ${prefix} AND "isArchived" = false
  `;
}

export async function peekSequence(
  prefix: string,
  _year?: string,
): Promise<number> {
  const config = await ensurePrefixConfig(prefix);
  return config.currentSequence ?? 0;
}
