import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { allocateNextDocumentNumber } from "@/lib/document-numbering";

export type SalesChannel = "FACTORY" | "BRANCH" | "AGENT" | "TRUCK";
export type SalesStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type SalesPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type Tx = typeof sql;

export function normalizeSalesChannel(value?: string | null): SalesChannel {
  const normalized = String(value ?? "FACTORY").trim().toUpperCase();
  switch (normalized) {
    case "BRANCH":
    case "AGENT":
    case "TRUCK":
      return normalized;
    default:
      return "FACTORY";
  }
}

export function normalizeSalesStatus(value?: string | null): SalesStatus {
  const normalized = String(value ?? "DRAFT").trim().toUpperCase();
  switch (normalized) {
    case "POSTED":
    case "CANCELLED":
      return normalized;
    default:
      return "DRAFT";
  }
}

export async function nextSalesDocumentNumber(
  tx: Tx,
  prefix: string,
  description: string,
) {
  return allocateNextDocumentNumber(tx, prefix, description);
}

export async function getSalesDefaultCurrency(tx: Tx | typeof sql = sql) {
  const settingRows = await tx<Array<{ value: string | null }>>`
    SELECT value
    FROM "SystemSetting"
    WHERE key = 'defaultCurrency' AND "isArchived" = false
    LIMIT 1
  `;

  if (settingRows[0]?.value) {
    return settingRows[0].value;
  }

  const companyRows = await tx<Array<{ defaultCurrency: string | null }>>`
    SELECT "defaultCurrency"
    FROM "Company"
    WHERE "isArchived" = false
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  return companyRows[0]?.defaultCurrency ?? "ETB";
}

export async function writeSalesAudit(
  tx: Tx,
  userId: string,
  module: string,
  action: string,
  recordId: string,
  newValue?: unknown,
  oldValue?: unknown,
) {
  await tx`
    INSERT INTO "AuditLog" (
      id, "userId", action, module, "recordId", "oldValue", "newValue", "isArchived", timestamp
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      ${action},
      ${module},
      ${recordId},
      ${oldValue ? JSON.stringify(oldValue) : null},
      ${newValue ? JSON.stringify(newValue) : null},
      false,
      NOW()
    )
  `;
}

export async function writeSalesHistory(
  tx: Tx,
  referenceType: string,
  referenceId: string,
  action: string,
  performedById: string,
  comment?: string,
) {
  await tx`
    INSERT INTO "DocumentHistory" (
      id, "referenceType", "referenceId", action, comment, "performedById", "isArchived", "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${referenceType},
      ${referenceId},
      ${action},
      ${comment ?? null},
      ${performedById},
      false,
      NOW()
    )
  `;
}
