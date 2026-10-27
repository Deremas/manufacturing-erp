import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { applyPriceToLine } from "@/services/pricing/pricing.service";
import {
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  normalizeSalesChannel,
  writeSalesAudit,
  writeSalesHistory,
  type SalesChannel,
  type Tx,
} from "@/services/sales/sales-shared.service";

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export type SalesOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PARTIALLY_RESERVED"
  | "RESERVED"
  | "PARTIALLY_LOADED"
  | "LOADED"
  | "PARTIALLY_DISPATCHED"
  | "DISPATCHED"
  | "PARTIALLY_INVOICED"
  | "INVOICED"
  | "COMPLETED"
  | "CANCELLED";

export type SalesOrderApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

export interface CommercialLineInput {
  id?: string | null;
  itemId: string;
  quantity: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxPercent?: number | null;
  taxAmount?: number | null;
  remarks?: string | null;
}

export interface ResolvedCommercialLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  availableQty: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  priceListId: string;
  priceListItemId: string;
  priceListCode?: string;
  remarks?: string;
}

export interface CommercialReferenceCustomer {
  id: string;
  customerCode: string;
  name: string;
  customerType?: string | null;
  creditLimit: number;
  paymentTerms?: string | null;
  isActive: boolean;
}

export interface CommercialReferenceLocation {
  id: string;
  locationCode: string;
  locationName: string;
  locationType?: string | null;
  isActive: boolean;
}

export interface CommercialReferenceUser {
  id: string;
  name: string;
  email?: string | null;
  isActive: boolean;
}

export function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function normalizeQuotationStatus(value?: string | null): QuotationStatus {
  const normalized = String(value ?? "DRAFT").trim().toUpperCase();
  switch (normalized) {
    case "SENT":
    case "ACCEPTED":
    case "REJECTED":
    case "EXPIRED":
    case "CONVERTED":
      return normalized;
    default:
      return "DRAFT";
  }
}

export function normalizeSalesOrderStatus(value?: string | null): SalesOrderStatus {
  const normalized = String(value ?? "DRAFT").trim().toUpperCase();
  switch (normalized) {
    case "PENDING_APPROVAL":
    case "APPROVED":
    case "PARTIALLY_RESERVED":
    case "RESERVED":
    case "PARTIALLY_LOADED":
    case "LOADED":
    case "PARTIALLY_DISPATCHED":
    case "DISPATCHED":
    case "PARTIALLY_INVOICED":
    case "INVOICED":
    case "COMPLETED":
    case "CANCELLED":
      return normalized;
    default:
      return "DRAFT";
  }
}

export function normalizeSalesOrderApprovalStatus(value?: string | null): SalesOrderApprovalStatus {
  const normalized = String(value ?? "NOT_REQUIRED").trim().toUpperCase();
  switch (normalized) {
    case "PENDING":
    case "APPROVED":
    case "REJECTED":
      return normalized;
    default:
      return "NOT_REQUIRED";
  }
}

export function computeCommercialLineAmounts(input: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxPercent?: number | null;
  taxAmount?: number | null;
}) {
  const quantity = Number(input.quantity ?? 0);
  const unitPrice = Number(input.unitPrice ?? 0);
  const baseAmount = Number((quantity * unitPrice).toFixed(2));
  const discountPercent = Number(input.discountPercent ?? 0);
  const explicitDiscountAmount = Number(input.discountAmount ?? 0);
  const discountAmount = Number(
    (explicitDiscountAmount > 0 ? explicitDiscountAmount : (baseAmount * discountPercent) / 100).toFixed(2),
  );
  const taxableAmount = Number((baseAmount - discountAmount).toFixed(2));
  const taxPercent = Number(input.taxPercent ?? 0);
  const explicitTaxAmount = Number(input.taxAmount ?? 0);
  const taxAmount = Number(
    (explicitTaxAmount > 0 ? explicitTaxAmount : (taxableAmount * taxPercent) / 100).toFixed(2),
  );
  const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));

  return {
    baseAmount,
    discountPercent,
    discountAmount,
    taxPercent,
    taxAmount,
    lineTotal,
  };
}

export function computeCommercialTotals(lines: ResolvedCommercialLine[]) {
  return lines.reduce(
    (totals, line) => ({
      subtotal: Number((totals.subtotal + line.quantity * line.unitPrice).toFixed(2)),
      discountAmount: Number((totals.discountAmount + line.discountAmount).toFixed(2)),
      taxAmount: Number((totals.taxAmount + line.taxAmount).toFixed(2)),
      totalAmount: Number((totals.totalAmount + line.lineTotal).toFixed(2)),
    }),
    { subtotal: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 },
  );
}

export function deriveHeaderPriceListId(lines: ResolvedCommercialLine[]) {
  const unique = Array.from(new Set(lines.map((line) => line.priceListId).filter(Boolean)));
  return unique.length === 1 ? unique[0] : null;
}

export async function ensureCommercialLocation(
  tx: Tx | typeof sql,
  locationId: string,
) {
  const rows = await tx<Array<CommercialReferenceLocation>>`
    SELECT id, "locationCode", "locationName", "locationType", "isActive"
    FROM "Location"
    WHERE id = ${locationId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const location = rows[0];
  if (!location) {
    throw new Error("Selected sales location was not found");
  }
  if (!location.isActive) {
    throw new Error("Selected sales location is inactive");
  }
  const holdLocations = await tx<Array<{ id: string }>>`SELECT id FROM "Location" WHERE id = ${locationId} AND "isQcHoldLocation" = true LIMIT 1`;
  if (holdLocations[0]) throw new Error("Commercial documents cannot use a QC quarantine location");
  return location;
}

export async function ensureCommercialCustomer(
  tx: Tx | typeof sql,
  customerId: string,
) {
  const rows = await tx<Array<CommercialReferenceCustomer>>`
    SELECT
      id,
      "customerCode",
      name,
      "customerType",
      COALESCE("creditLimit", 0) AS "creditLimit",
      "paymentTerms",
      "isActive"
    FROM "Customer"
    WHERE id = ${customerId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const customer = rows[0];
  if (!customer) {
    throw new Error("Selected customer was not found");
  }
  if (!customer.isActive) {
    throw new Error("Selected customer is inactive");
  }
  return customer;
}

export async function ensureCommercialUser(
  tx: Tx | typeof sql,
  userId: string | null | undefined,
  label: string,
) {
  if (!normalizeText(userId)) {
    return null;
  }

  const rows = await tx<Array<CommercialReferenceUser>>`
    SELECT id, name, email, "isActive"
    FROM "User"
    WHERE id = ${userId!}
      AND "isArchived" = false
    LIMIT 1
  `;

  const user = rows[0];
  if (!user) {
    throw new Error(`${label} was not found`);
  }
  if (!user.isActive) {
    throw new Error(`${label} is inactive`);
  }
  return user;
}

export async function resolveCommercialLines(
  tx: Tx | typeof sql,
  input: {
    lines: CommercialLineInput[];
    channel: string;
    transactionDate: string;
    customerId: string;
    locationId: string;
    customerGroup?: string | null;
    agentId?: string | null;
  },
) {
  const channel = normalizeSalesChannel(input.channel);
  const filtered = input.lines
    .map((line) => ({
      ...line,
      itemId: String(line.itemId ?? "").trim(),
      quantity: Number(line.quantity ?? 0),
    }))
    .filter((line) => line.itemId.length > 0 && line.quantity > 0);

  if (!filtered.length) {
    throw new Error("At least one item line is required");
  }

  const seen = new Set<string>();
  for (const line of filtered) {
    if (seen.has(line.itemId)) {
      throw new Error("Duplicate items are not allowed in the same document");
    }
    seen.add(line.itemId);
  }

  const itemIds = filtered.map((line) => line.itemId);
  const items = await tx<
    Array<{
      id: string;
      itemCode: string;
      itemName: string;
      unitId: string | null;
      uomCode: string | null;
      uomName: string | null;
    }>
  >`
    SELECT
      i.id,
      i."itemCode",
      i."itemName",
      i."uomId" AS "unitId",
      u.code AS "uomCode",
      u.name AS "uomName"
    FROM "Item" i
    LEFT JOIN "ItemType" it ON it.id = i."itemTypeId"
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    WHERE i.id = ANY(${itemIds})
      AND i."isActive" = true
      AND i."isArchived" = false
      AND UPPER(COALESCE(i."itemCode", '')) NOT LIKE 'TEST-%'
      AND UPPER(COALESCE(i."itemName", '')) NOT LIKE 'INVENTORY TEST ITEM%'
      AND (
        UPPER(COALESCE(it.code, '')) IN ('FG', 'FINISHED', 'FINISHED_GOOD')
        OR UPPER(COALESCE(it.name, '')) LIKE '%FINISHED%'
        OR UPPER(COALESCE(i."itemCode", '')) LIKE 'FG-%'
      )
  `;

  if (items.length !== itemIds.length) {
    throw new Error("Only active saleable finished goods can be selected");
  }

  const stockRows = await tx<Array<{ itemId: string; availableQuantity: number }>>`
    SELECT "itemId", "availableQuantity"
    FROM "StockBalance"
    WHERE "locationId" = ${input.locationId}
      AND "isArchived" = false
      AND "itemId" = ANY(${itemIds})
  `;

  const itemMap = new Map(items.map((item) => [item.id, item]));
  const stockMap = new Map(stockRows.map((row) => [row.itemId, Number(row.availableQuantity ?? 0)]));

  return Promise.all(
    filtered.map(async (line) => {
      const item = itemMap.get(line.itemId);
      if (!item) {
        throw new Error("Selected item was not found");
      }

      const price = await applyPriceToLine(
        line.itemId,
        channel,
        line.quantity,
        input.transactionDate,
        {
          customerId: input.customerId,
          locationId: input.locationId,
          customerGroup: input.customerGroup,
          agentId: input.agentId,
        },
      );

      const amounts = computeCommercialLineAmounts({
        quantity: line.quantity,
        unitPrice: price.unitPrice,
        discountPercent: line.discountPercent,
        discountAmount: line.discountAmount,
        taxPercent: line.taxPercent,
        taxAmount: line.taxAmount,
      });

      return {
        id: normalizeText(line.id) ?? randomUUID(),
        itemId: line.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unitId: price.unitId ?? item.unitId ?? undefined,
        uomCode: price.uomCode ?? item.uomCode ?? undefined,
        uomName: price.uomName ?? item.uomName ?? undefined,
        availableQty: Number(stockMap.get(line.itemId) ?? 0),
        quantity: line.quantity,
        unitPrice: Number(price.unitPrice),
        discountPercent: amounts.discountPercent,
        discountAmount: amounts.discountAmount,
        taxPercent: amounts.taxPercent,
        taxAmount: amounts.taxAmount,
        lineTotal: amounts.lineTotal,
        priceListId: price.priceListId,
        priceListItemId: price.priceListItemId,
        priceListCode: price.priceListCode,
        remarks: normalizeText(line.remarks) ?? undefined,
      } satisfies ResolvedCommercialLine;
    }),
  );
}

export async function getLatestApproval(
  tx: Tx | typeof sql,
  referenceType: string,
  referenceId: string,
) {
  const rows = await tx<
    Array<{
      id: string;
      status: string;
      requestedById: string;
      assignedApproverId: string | null;
      assignedApproverName: string | null;
      approvedById: string | null;
      approvedByName: string | null;
      comment: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  >`
    SELECT
      a.id,
      a.status,
      a."requestedById",
      a."assignedApproverId",
      approver.name AS "assignedApproverName",
      a."approvedById",
      approved.name AS "approvedByName",
      a.comment,
      a."createdAt"::text AS "createdAt",
      a."updatedAt"::text AS "updatedAt"
    FROM "Approval" a
    LEFT JOIN "User" approver ON approver.id = a."assignedApproverId"
    LEFT JOIN "User" approved ON approved.id = a."approvedById"
    WHERE a."referenceType" = ${referenceType}
      AND a."referenceId" = ${referenceId}
      AND a."isArchived" = false
    ORDER BY a."createdAt" DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function syncCommercialApproval(
  tx: Tx | typeof sql,
  input: {
    referenceType: string;
    referenceId: string;
    requestedById: string;
    assignedApproverId?: string | null;
    requireApproval: boolean;
    comment?: string | null;
  },
) {
  const latest = await getLatestApproval(tx, input.referenceType, input.referenceId);

  if (!input.requireApproval) {
    if (latest?.status === "PENDING") {
      await tx`
        UPDATE "Approval"
        SET status = 'CANCELLED', "updatedAt" = NOW()
        WHERE id = ${latest.id}
      `;
    }
    return null;
  }

  if (latest?.status === "PENDING") {
    await tx`
      UPDATE "Approval"
      SET
        "assignedApproverId" = ${input.assignedApproverId ?? null},
        comment = ${normalizeText(input.comment)},
        "updatedAt" = NOW()
      WHERE id = ${latest.id}
    `;
    return latest.id;
  }

  const approvalId = randomUUID();
  await tx`
    INSERT INTO "Approval" (
      id, "referenceType", "referenceId", status, "requestedById",
      "assignedApproverId", comment, "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${approvalId},
      ${input.referenceType},
      ${input.referenceId},
      'PENDING',
      ${input.requestedById},
      ${input.assignedApproverId ?? null},
      ${normalizeText(input.comment)},
      false,
      NOW(),
      NOW()
    )
  `;
  return approvalId;
}

export async function approveCommercialDocument(
  tx: Tx | typeof sql,
  referenceType: string,
  referenceId: string,
  userId: string,
  comment?: string | null,
) {
  const latest = await getLatestApproval(tx, referenceType, referenceId);
  if (!latest) {
    throw new Error("No pending approval record was found for this document");
  }
  if (latest.status !== "PENDING") {
    throw new Error(`Only pending approvals can be approved. Current status: ${latest.status}`);
  }
  if (latest.assignedApproverId && latest.assignedApproverId !== userId) {
    throw new Error("You are not the assigned approver for this document");
  }

  await tx`
    UPDATE "Approval"
    SET
      status = 'APPROVED',
      "approvedById" = ${userId},
      comment = ${normalizeText(comment) ?? latest.comment},
      "updatedAt" = NOW()
    WHERE id = ${latest.id}
  `;
}

export async function rejectCommercialDocument(
  tx: Tx | typeof sql,
  referenceType: string,
  referenceId: string,
  userId: string,
  comment?: string | null,
) {
  const latest = await getLatestApproval(tx, referenceType, referenceId);
  if (!latest) {
    throw new Error("No pending approval record was found for this document");
  }
  if (latest.status !== "PENDING") {
    throw new Error(`Only pending approvals can be rejected. Current status: ${latest.status}`);
  }
  if (latest.assignedApproverId && latest.assignedApproverId !== userId) {
    throw new Error("You are not the assigned approver for this document");
  }

  await tx`
    UPDATE "Approval"
    SET
      status = 'REJECTED',
      "approvedById" = ${userId},
      comment = ${normalizeText(comment) ?? latest.comment},
      "updatedAt" = NOW()
    WHERE id = ${latest.id}
  `;
}

export async function createCommercialHistoryAndAudit(
  tx: Tx,
  input: {
    userId: string;
    module: string;
    action: string;
    recordId: string;
    referenceType: string;
    historyAction: string;
    historyComment: string;
    newValue?: unknown;
    oldValue?: unknown;
  },
) {
  await writeSalesAudit(
    tx,
    input.userId,
    input.module,
    input.action,
    input.recordId,
    input.newValue,
    input.oldValue,
  );
  await writeSalesHistory(
    tx,
    input.referenceType,
    input.recordId,
    input.historyAction,
    input.userId,
    input.historyComment,
  );
}

export {
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  normalizeSalesChannel,
  writeSalesAudit,
  writeSalesHistory,
};
