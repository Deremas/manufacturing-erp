import { randomUUID } from "crypto";

import { sql } from "@/lib/db";

import {
  DEFAULT_DOCUMENT_NUMBERING,
  type DocumentNumberingConfig,
  formatDocumentNumber,
  getDocumentNumberStem,
} from "./format";

export type Tx = typeof sql;

type LockedConfig = DocumentNumberingConfig & { id: string };

async function ensureDocumentNumbering(
  tx: Tx,
  prefix: string,
  description: string,
): Promise<LockedConfig> {
  await tx`
    INSERT INTO "DocumentNumbering" (
      id, prefix, description, "prefixFormat", separator,
      "yearFormat", "monthFormat", "dayFormat", "sequenceLength",
      "currentSequence", "isActive", "isArchived"
    )
    VALUES (
      ${`docnum-${prefix.toLowerCase()}`},
      ${prefix},
      ${description},
      ${DEFAULT_DOCUMENT_NUMBERING.prefixFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.separator},
      ${DEFAULT_DOCUMENT_NUMBERING.yearFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.monthFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.dayFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.sequenceLength},
      ${DEFAULT_DOCUMENT_NUMBERING.currentSequence},
      true,
      false
    )
    ON CONFLICT ("prefix") DO NOTHING
  `;

  const rows = await tx<LockedConfig[]>`
    SELECT
      id,
      prefix,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence"
    FROM "DocumentNumbering"
    WHERE prefix = ${prefix}
    LIMIT 1
  `;

  const config = rows[0];
  if (!config) {
    throw new Error(`Document numbering config missing for ${prefix}`);
  }

  return config;
}

export async function syncDocumentSequenceFromColumn(
  tx: Tx,
  config: LockedConfig,
  table: string,
  column: string,
): Promise<number> {
  const stem = getDocumentNumberStem(config);
  const likePattern = `${stem}%`;
  const rows = await tx.unsafe<Array<{ sequence: number | null }>>(`
    SELECT MAX(
      ((regexp_match("${column}", '(\\d+)$'))[1])::int
    ) AS sequence
    FROM "${table}"
    WHERE "${column}" LIKE $1
  `, [likePattern]);
  const maxFromRecords = Number(rows[0]?.sequence ?? 0);
  const current = Number(config.currentSequence ?? 0);
  const synced = Math.max(current, maxFromRecords);

  if (synced !== current) {
    await tx`
      UPDATE "DocumentNumbering"
      SET "currentSequence" = ${synced}
      WHERE id = ${config.id}
    `;
  }

  return synced;
}

export async function peekNextDocumentNumber(
  tx: Tx,
  prefix: string,
  description: string,
  options?: {
    syncFromRecords?: (tx: Tx, config: LockedConfig) => Promise<number>;
  },
) {
  const config = await ensureDocumentNumbering(tx, prefix, description);
  const synced = options?.syncFromRecords
    ? await options.syncFromRecords(tx, config)
    : Number(config.currentSequence ?? 0);
  return formatDocumentNumber(config, synced + 1);
}

export async function allocateNextDocumentNumber(
  tx: Tx,
  prefix: string,
  description: string,
  options?: {
    syncFromRecords?: (tx: Tx, config: LockedConfig) => Promise<number>;
  },
) {
  const config = await ensureDocumentNumbering(tx, prefix, description);
  const lockedRows = await tx<LockedConfig[]>`
    SELECT
      id,
      prefix,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence"
    FROM "DocumentNumbering"
    WHERE id = ${config.id}
    LIMIT 1
    FOR UPDATE
  `;
  const locked = lockedRows[0] ?? config;
  const synced = options?.syncFromRecords
    ? await options.syncFromRecords(tx, locked)
    : Number(locked.currentSequence ?? 0);
  const nextSequence = synced + 1;

  await tx`
    UPDATE "DocumentNumbering"
    SET "currentSequence" = ${nextSequence}
    WHERE id = ${locked.id}
  `;

  return formatDocumentNumber(locked, nextSequence);
}

export async function normalizeDocumentNumberingDefaults(tx: Tx = sql) {
  await tx`
    UPDATE "DocumentNumbering"
    SET
      "prefixFormat" = CASE
        WHEN "prefixFormat" IN ('PREFIX', 'PREFIX_YEAR', 'PREFIX_YEAR_MONTH', 'PREFIX_YEAR_MONTH_DAY')
          THEN "prefixFormat"
        ELSE 'PREFIX_YEAR'
      END,
      separator = COALESCE(NULLIF(separator, ''), '-'),
      "yearFormat" = COALESCE(NULLIF("yearFormat", ''), 'YYYY'),
      "monthFormat" = COALESCE(NULLIF("monthFormat", ''), 'MM'),
      "dayFormat" = COALESCE(NULLIF("dayFormat", ''), 'DD')
    WHERE "isArchived" = false
  `;
}

export async function restoreDocumentNumberingDefaults(tx: Tx = sql) {
  await tx`
    UPDATE "DocumentNumbering"
    SET
      "prefixFormat" = 'PREFIX_YEAR',
      "sequenceLength" = 4,
      separator = '-',
      "yearFormat" = 'YYYY',
      "monthFormat" = 'MM',
      "dayFormat" = 'DD'
    WHERE "isArchived" = false
  `;
}

export async function insertDocumentNumberingIfMissing(
  tx: Tx,
  prefix: string,
  description: string,
) {
  await tx`
    INSERT INTO "DocumentNumbering" (
      id, prefix, description, "prefixFormat", separator,
      "yearFormat", "monthFormat", "dayFormat", "sequenceLength",
      "currentSequence", "isActive", "isArchived"
    )
    VALUES (
      ${randomUUID()},
      ${prefix},
      ${description},
      ${DEFAULT_DOCUMENT_NUMBERING.prefixFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.separator},
      ${DEFAULT_DOCUMENT_NUMBERING.yearFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.monthFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.dayFormat},
      ${DEFAULT_DOCUMENT_NUMBERING.sequenceLength},
      ${DEFAULT_DOCUMENT_NUMBERING.currentSequence},
      true,
      false
    )
    ON CONFLICT ("prefix") DO NOTHING
  `;
}
