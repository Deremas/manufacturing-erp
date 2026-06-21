// lib/utils/cn.ts
// General-purpose utility helpers for NEW ERP

// ─── cn — classname merger ───────────────────────────────────────────────────

/**
 * Merges class name values, filtering out falsy entries.
 * Acts as a lightweight alternative to `clsx` + `tailwind-merge`.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── formatCurrency ──────────────────────────────────────────────────────────

/**
 * Format a numeric amount as a currency string.
 *
 * @param amount  – The numeric value to format.
 * @param currency – ISO 4217 currency code (default "ETB").
 */
export function formatCurrency(
  amount: number,
  currency: string = "ETB",
): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── formatDate ──────────────────────────────────────────────────────────────

/**
 * Format a Date (or ISO string) into a human-readable date string.
 *
 * @param date   – A Date object or ISO date string.
 * @param format – Intl.DateTimeFormat options or one of the shorthand keys:
 *                "short" | "long" | "iso" | "datetime" (default "short").
 */
export function formatDate(
  date: Date | string,
  format: string = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "Invalid date";

  switch (format) {
    case "short":
      return d.toLocaleDateString("en-KE"); // e.g. 18/06/2026
    case "long":
      return d.toLocaleDateString("en-KE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }); // e.g. Thursday, 18 June 2026
    case "iso":
      return d.toISOString().split("T")[0] ?? ""; // 2026-06-18
    case "datetime":
      return d.toLocaleString("en-KE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    default:
      return d.toLocaleDateString("en-KE");
  }
}

// ─── generateDocumentNumber ──────────────────────────────────────────────────

/**
 * Generate a document number from a prefix, date, and optional sequence.
 *
 * Examples:
 *   generateDocumentNumber("PO", new Date("2026-06-17"), 1)  =>  PO202606170001
 *   generateDocumentNumber("ORD", new Date("2026-06-17"), 1) =>  ORD-20260617-0001
 *   generateDocumentNumber("AST", new Date("2026-06-17"), 1) =>  AST-2026-0001
 *   generateDocumentNumber("WO",  new Date("2026-06-17"), 1) =>  WO-2026-0001
 */
export function generateDocumentNumber(
  prefix: string,
  date: Date = new Date(),
  seq: number = 1,
): string {
  const YYYY = date.getFullYear().toString();
  const YY = YYYY.slice(2);
  const MM = (date.getMonth() + 1).toString().padStart(2, "0");
  const DD = date.getDate().toString().padStart(2, "0");
  const SEQ = seq.toString().padStart(4, "0");

  // Pattern-based generation (mirrors lib/constants DocumentPattern)
  switch (prefix) {
    case "ORD":
      return `${prefix}-${YYYY}${MM}${DD}-${SEQ}`;
    case "WO":
    case "AST":
      return `${prefix}-${YYYY}-${SEQ}`;
    default:
      return `${prefix}${YYYY}${MM}${DD}${SEQ}`;
  }
}

// ─── truncate ────────────────────────────────────────────────────────────────

/**
 * Truncate a string to a given length, appending "…" if truncated.
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "…";
}

// ─── capitalize ──────────────────────────────────────────────────────────────

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
