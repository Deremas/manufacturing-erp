// lib/constants/index.ts
// Domain constants for NEW ERP

// ─── Movement Types ──────────────────────────────────────────────────────────

export enum MovementType {
  OPENING = "OPENING",
  PURCHASE_RECEIPT = "PURCHASE_RECEIPT",
  PRODUCTION_ISSUE = "PRODUCTION_ISSUE",
  PRODUCTION_OUTPUT = "PRODUCTION_OUTPUT",
  TRANSFER_OUT = "TRANSFER_OUT",
  TRANSFER_IN = "TRANSFER_IN",
  SALES_OUT = "SALES_OUT",
  SALES_RETURN = "SALES_RETURN",
  ADJUSTMENT_IN = "ADJUSTMENT_IN",
  ADJUSTMENT_OUT = "ADJUSTMENT_OUT",
  WASTAGE = "WASTAGE",
  DAMAGE = "DAMAGE",
  RESERVATION = "RESERVATION",
  RELEASE_RESERVATION = "RELEASE_RESERVATION",
}

// ─── Document Prefixes ───────────────────────────────────────────────────────

export const DocumentPrefix = {
  PO: "PO",
  GRN: "GRN",
  PR: "PR",
  TRF: "TRF",
  ADJ: "ADJ",
  PROD: "PROD",
  QC: "QC",
  SALE: "SALE",
  FS: "FS",
  ORD: "ORD",
  WO: "WO",
  AST: "AST",
  V: "V",
  TRP: "TRP",
  PAY: "PAY",
  EXP: "EXP",
  RPT: "RPT",
} as const;

export type DocumentPrefix =
  (typeof DocumentPrefix)[keyof typeof DocumentPrefix];

// ─── Document Patterns ───────────────────────────────────────────────────────

/**
 * Format string patterns for generating document numbers.
 * Tokens:
 *   {prefix}  – Document prefix (e.g. PO, GRN)
 *   {YYYY}    – 4-digit year
 *   {YY}      – 2-digit year
 *   {MM}      – 2-digit month
 *   {DD}      – 2-digit day
 *   {SEQ}     – Zero-padded sequence number
 */
export const DocumentPattern: Record<DocumentPrefix, string> = {
  PO: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  GRN: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  PR: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  TRF: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  ADJ: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  PROD: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  QC: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  SALE: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  FS: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  ORD: "{prefix}-{YYYY}{MM}{DD}-{SEQ}",
  WO: "{prefix}-{YYYY}-{SEQ}",
  AST: "{prefix}-{YYYY}-{SEQ}",
  V: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  TRP: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  PAY: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  EXP: "{prefix}{YYYY}{MM}{DD}{SEQ}",
  RPT: "{prefix}{YYYY}{MM}{DD}{SEQ}",
};

// ─── Item Types ──────────────────────────────────────────────────────────────

export const ItemTypes = [
  "Raw Material",
  "Packaging Material",
  "Finished Goods",
  "Consumable",
  "Spare Part",
  "Service",
] as const;

export type ItemType = (typeof ItemTypes)[number];

// ─── Location Types ──────────────────────────────────────────────────────────

export const LocationTypes = [
  "Raw Material Store",
  "Finished Goods Store",
  "Production Floor",
  "Branch",
  "Truck",
  "Office",
] as const;

export type LocationType = (typeof LocationTypes)[number];

// ─── Bank Account Types ──────────────────────────────────────────────────────

export const BankAccountTypes = ["Checking", "Savings", "Petty Cash"] as const;

export type BankAccountType = (typeof BankAccountTypes)[number];

// ─── Tax Types ───────────────────────────────────────────────────────────────

export const TaxTypes = ["VAT", "Excise", "Withholding"] as const;

export type TaxType = (typeof TaxTypes)[number];
