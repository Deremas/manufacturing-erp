// services/document-numbering/documentNumbering.ts
// Document Numbering Service for NEW ERP
// Generates sequential document numbers per prefix / year.

import type { DocumentPrefix } from "@/lib/constants";
import { DocumentPattern } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocumentNumberingConfig {
  prefix: DocumentPrefix;
  prefixFormat: string;
  separator: string;
  yearFormat: "YYYY" | "YY";
  sequenceLength: number;
  currentSequence: number;
}

// ─── Module-level sequence store (placeholder) ───────────────────────────────
// In production this would be backed by a database table.

const sequenceStore = new Map<string, number>();

function buildSequenceKey(prefix: string, year: string): string {
  return `${prefix}_${year}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padSequence(value: number, length: number): string {
  return value.toString().padStart(length, "0");
}

function applyPattern(
  prefix: string,
  date: Date,
  seq: number,
  pattern: string,
): string {
  const YYYY = date.getFullYear().toString();
  const YY = YYYY.slice(2);
  const MM = (date.getMonth() + 1).toString().padStart(2, "0");
  const DD = date.getDate().toString().padStart(2, "0");
  const SEQ = padSequence(seq, 4);

  return pattern
    .replace("{prefix}", prefix)
    .replace("{YYYY}", YYYY)
    .replace("{YY}", YY)
    .replace("{MM}", MM)
    .replace("{DD}", DD)
    .replace("{SEQ}", SEQ);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Return the next sequence number for a given prefix and year.
 * Increments the in-memory counter atomically (within this process).
 */
export async function getNextSequence(
  prefix: string,
  year?: string,
): Promise<number> {
  const y = year ?? new Date().getFullYear().toString();
  const key = buildSequenceKey(prefix, y);

  const current = sequenceStore.get(key) ?? 0;
  const next = current + 1;
  sequenceStore.set(key, next);

  // TODO: Persist sequence to database
  // e.g. await db.documentSequence.upsert({ where: { prefix_year: key }, update: { seq: next } })

  return next;
}

/**
 * Generate the next document number for the given prefix.
 *
 * @param prefix – A DocumentPrefix value (e.g. "PO", "GRN", "ORD").
 *
 * Examples:
 *   generateNumber("PO")  => "PO202606170001"
 *   generateNumber("GRN") => "GRN202606170001"
 *   generateNumber("FS")  => "FS202606170001"
 *   generateNumber("ORD") => "ORD-20260617-0001"
 *   generateNumber("AST") => "AST-2026-0001"
 *   generateNumber("WO")  => "WO-2026-0001"
 */
export async function generateNumber(prefix: DocumentPrefix): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();

  const seq = await getNextSequence(prefix, year);
  const pattern = DocumentPattern[prefix];

  return applyPattern(prefix, now, seq, pattern);
}

/**
 * Reset the sequence counter for a given prefix and year (admin utility).
 */
export async function resetSequence(
  prefix: string,
  year: string,
  value: number,
): Promise<void> {
  const key = buildSequenceKey(prefix, year);
  sequenceStore.set(key, value);
  // TODO: Persist to database
}

/**
 * Peek at the current sequence value without incrementing.
 */
export async function peekSequence(
  prefix: string,
  year?: string,
): Promise<number> {
  const y = year ?? new Date().getFullYear().toString();
  const key = buildSequenceKey(prefix, y);
  return sequenceStore.get(key) ?? 0;
}
