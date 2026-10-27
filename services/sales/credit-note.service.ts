import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { reverseSalesJournalEntry } from "@/services/accounting/accounting.service";
import { syncSalesInvoiceBalance } from "@/services/sales/accounts-receivable.service";
import { writeSalesAudit, writeSalesHistory } from "@/services/sales/sales-shared.service";
import { nextSalesDocumentNumber, normalizeSalesChannel, type Tx } from "@/services/sales/sales-shared.service";

type SalesLocationScope = {
  accessibleLocationIds?: string[] | null;
};

export interface SalesCreditNoteSummary {
  id: string;
  publicId: number;
  creditNoteNo: string;
  creditDate: string;
  salesReturnId: string;
  returnNo: string;
  saleId?: string;
  saleNo?: string;
  salesInvoiceId?: string;
  invoiceNo?: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  channel: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  status: string;
  totalAmount: number;
  postedAt?: string;
}

export interface SalesCreditNoteDetail extends SalesCreditNoteSummary {
  reason?: string;
  remarks?: string;
  items: Array<{
    id: string;
    salesReturnItemId?: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId?: string;
    uomCode?: string;
    uomName?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    reason?: string;
  }>;
}

export async function createCreditNoteForSalesReturn(
  tx: Tx,
  input: {
    salesReturnId: string;
    saleId?: string | null;
    salesOrderId?: string | null;
    salesInvoiceId?: string | null;
    customerId?: string | null;
    channel: string;
    locationId: string;
    creditDate: string;
    totalAmount: number;
    reason?: string | null;
    remarks?: string | null;
    createdById: string;
    postedById?: string | null;
    items: Array<{
      salesReturnItemId?: string | null;
      itemId: string;
      unitId?: string | null;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      reason?: string | null;
    }>;
  },
) {
  const existingRows = await tx<Array<{ id: string; creditNoteNo: string }>>`
    SELECT id, "creditNoteNo"
    FROM "SalesCreditNote"
    WHERE "salesReturnId" = ${input.salesReturnId}
    LIMIT 1
  `;

  if (existingRows[0]) {
    return existingRows[0];
  }

  const creditNoteId = randomUUID();
  const creditNoteNo = await nextSalesDocumentNumber(tx, "CRN", "Sales Credit Note");

  await tx`
    INSERT INTO "SalesCreditNote" (
      id, "creditNoteNo", "salesReturnId", "saleId", "salesOrderId", "salesInvoiceId", "customerId",
      channel, "locationId", "creditDate", status, subtotal, "taxAmount", "discountAmount", "totalAmount",
      reason, remarks, "createdById", "postedById", "postedAt", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${creditNoteId},
      ${creditNoteNo},
      ${input.salesReturnId},
      ${input.saleId ?? null},
      ${input.salesOrderId ?? null},
      ${input.salesInvoiceId ?? null},
      ${input.customerId ?? null},
      ${input.channel},
      ${input.locationId},
      ${input.creditDate}::timestamptz,
      'POSTED',
      ${input.totalAmount},
      0,
      0,
      ${input.totalAmount},
      ${input.reason ?? null},
      ${input.remarks ?? null},
      ${input.createdById},
      ${input.postedById ?? input.createdById},
      NOW(),
      false,
      NOW(),
      NOW()
    )
  `;

  for (const item of input.items) {
    await tx`
      INSERT INTO "SalesCreditNoteItem" (
        id, "creditNoteId", "salesReturnItemId", "salesInvoiceItemId", "itemId", "unitId",
        quantity, "unitPrice", "lineTotal", reason, "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${creditNoteId},
        ${item.salesReturnItemId ?? null},
        NULL,
        ${item.itemId},
        ${item.unitId ?? null},
        ${item.quantity},
        ${item.unitPrice},
        ${item.lineTotal},
        ${item.reason ?? null},
        NOW(),
        NOW()
      )
    `;
  }

  return {
    id: creditNoteId,
    creditNoteNo,
  };
}

export async function listSalesCreditNotes(scope: SalesLocationScope = {}): Promise<SalesCreditNoteSummary[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const rows = await sql<Array<{
    id: string;
    creditNoteNo: string;
    creditDate: string;
    salesReturnId: string;
    returnNo: string;
    saleId: string | null;
    saleNo: string | null;
    salesInvoiceId: string | null;
    invoiceNo: string | null;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    status: string;
    totalAmount: number;
    postedAt: string | null;
  }>>`
    SELECT
      scn.id,
      scn."publicId",
      scn."creditNoteNo",
      scn."creditDate"::text AS "creditDate",
      scn."salesReturnId",
      sr."returnNo",
      scn."saleId",
      s."saleNo",
      scn."salesInvoiceId",
      si."invoiceNo",
      scn."customerId",
      c."customerCode",
      c.name AS "customerName",
      scn.channel,
      scn."locationId",
      l."locationCode",
      l."locationName",
      scn.status,
      scn."totalAmount",
      scn."postedAt"::text AS "postedAt"
    FROM "SalesCreditNote" scn
    INNER JOIN "SalesReturn" sr ON sr.id = scn."salesReturnId"
    INNER JOIN "Location" l ON l.id = scn."locationId"
    LEFT JOIN "Sale" s ON s.id = scn."saleId"
    LEFT JOIN "SalesInvoice" si ON si.id = scn."salesInvoiceId"
    LEFT JOIN "Customer" c ON c.id = scn."customerId"
    WHERE scn."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR scn."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    ORDER BY scn."creditDate" DESC, scn."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    creditNoteNo: row.creditNoteNo,
    creditDate: row.creditDate,
    salesReturnId: row.salesReturnId,
    returnNo: row.returnNo,
    saleId: row.saleId ?? undefined,
    saleNo: row.saleNo ?? undefined,
    salesInvoiceId: row.salesInvoiceId ?? undefined,
    invoiceNo: row.invoiceNo ?? undefined,
    customerId: row.customerId ?? undefined,
    customerCode: row.customerCode ?? undefined,
    customerName: row.customerName ?? undefined,
    channel: normalizeSalesChannel(row.channel),
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    status: row.status,
    totalAmount: Number(row.totalAmount ?? 0),
    postedAt: row.postedAt ?? undefined,
  }));
}

export async function getSalesCreditNoteById(id: string, scope: SalesLocationScope = {}): Promise<SalesCreditNoteDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<Array<{
    id: string;
    creditNoteNo: string;
    creditDate: string;
    salesReturnId: string;
    returnNo: string;
    saleId: string | null;
    saleNo: string | null;
    salesInvoiceId: string | null;
    invoiceNo: string | null;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    status: string;
    totalAmount: number;
    postedAt: string | null;
    reason: string | null;
    remarks: string | null;
  }>>`
    SELECT
      scn.id,
      scn."publicId",
      scn."creditNoteNo",
      scn."creditDate"::text AS "creditDate",
      scn."salesReturnId",
      sr."returnNo",
      scn."saleId",
      s."saleNo",
      scn."salesInvoiceId",
      si."invoiceNo",
      scn."customerId",
      c."customerCode",
      c.name AS "customerName",
      scn.channel,
      scn."locationId",
      l."locationCode",
      l."locationName",
      scn.status,
      scn."totalAmount",
      scn."postedAt"::text AS "postedAt",
      scn.reason,
      scn.remarks
    FROM "SalesCreditNote" scn
    INNER JOIN "SalesReturn" sr ON sr.id = scn."salesReturnId"
    INNER JOIN "Location" l ON l.id = scn."locationId"
    LEFT JOIN "Sale" s ON s.id = scn."saleId"
    LEFT JOIN "SalesInvoice" si ON si.id = scn."salesInvoiceId"
    LEFT JOIN "Customer" c ON c.id = scn."customerId"
    WHERE ${isPublicIdParam(id) ? sql`scn."publicId" = ${Number(id)}` : sql`scn.id = ${id}`}
      AND scn."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR scn."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    LIMIT 1
  `;

  const header = headerRows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const itemRows = await sql<Array<{
    id: string;
    salesReturnItemId: string | null;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId: string | null;
    uomCode: string | null;
    uomName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    reason: string | null;
  }>>`
    SELECT
      scni.id,
      scni."salesReturnItemId",
      scni."itemId",
      i."itemCode",
      i."itemName",
      scni."unitId",
      u.code AS "uomCode",
      u.name AS "uomName",
      scni.quantity,
      scni."unitPrice",
      scni."lineTotal",
      scni.reason
    FROM "SalesCreditNoteItem" scni
    INNER JOIN "Item" i ON i.id = scni."itemId"
    LEFT JOIN "Unit" u ON u.id = scni."unitId"
    WHERE scni."creditNoteId" = ${documentId}
    ORDER BY scni."createdAt" ASC
  `;

  return {
    id: header.id,
    creditNoteNo: header.creditNoteNo,
    creditDate: header.creditDate,
    salesReturnId: header.salesReturnId,
    returnNo: header.returnNo,
    saleId: header.saleId ?? undefined,
    saleNo: header.saleNo ?? undefined,
    salesInvoiceId: header.salesInvoiceId ?? undefined,
    invoiceNo: header.invoiceNo ?? undefined,
    customerId: header.customerId ?? undefined,
    customerCode: header.customerCode ?? undefined,
    customerName: header.customerName ?? undefined,
    channel: normalizeSalesChannel(header.channel),
    locationId: header.locationId,
    locationCode: header.locationCode,
    locationName: header.locationName,
    status: header.status,
    totalAmount: Number(header.totalAmount ?? 0),
    postedAt: header.postedAt ?? undefined,
    reason: header.reason ?? undefined,
    remarks: header.remarks ?? undefined,
    items: itemRows.map((row) => ({
      id: row.id,
      salesReturnItemId: row.salesReturnItemId ?? undefined,
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitId: row.unitId ?? undefined,
      uomCode: row.uomCode ?? undefined,
      uomName: row.uomName ?? undefined,
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      lineTotal: Number(row.lineTotal ?? 0),
      reason: row.reason ?? undefined,
    })),
  };
}

export async function voidSalesCreditNote(
  id: string,
  actor: { userId: string; userName: string },
  input: { reason?: string | null } = {},
  scope: SalesLocationScope = {},
) {
  return sql.begin(async (tx) => {
    const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
    const reason = String(input.reason ?? "").trim() || null;

    const rows = await tx<Array<{
      id: string;
      creditNoteNo: string;
      locationId: string;
      status: string;
      totalAmount: number;
    }>>`
      SELECT id, "creditNoteNo", "locationId", status, "totalAmount"
      FROM "SalesCreditNote"
      WHERE id = ${id}
        AND "isArchived" = false
      LIMIT 1
      FOR UPDATE
    `;

    const creditNote = rows[0];
    if (!creditNote) {
      throw new Error("Credit note was not found");
    }
    if (scope.accessibleLocationIds && locationIds.length > 0 && !locationIds.includes(creditNote.locationId)) {
      throw new Error("Credit note is outside your accessible locations");
    }
    if (String(creditNote.status).toUpperCase() !== "POSTED") {
      throw new Error("Only posted credit notes can be voided");
    }

    await tx`
      UPDATE "SalesCreditNote"
      SET
        status = 'VOIDED',
        remarks = CASE
          WHEN ${reason}::text IS NULL OR ${reason}::text = ''
            THEN remarks
          WHEN remarks IS NULL OR remarks = ''
            THEN CONCAT('Voided: ', ${reason})
          ELSE CONCAT(remarks, E'\nVoided: ', ${reason})
        END,
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await tx`
      UPDATE "SalesFinancePosting"
      SET
        status = 'VOIDED',
        memo = CASE
          WHEN ${reason}::text IS NULL OR ${reason}::text = ''
            THEN CONCAT(COALESCE(memo, ''), ' [Voided]')
          ELSE CONCAT(COALESCE(memo, ''), ' [Voided: ', ${reason}, ']')
        END,
        "updatedAt" = NOW()
      WHERE "sourceType" = 'sales.credit-note'
        AND "sourceId" = ${id}
    `;

    await reverseSalesJournalEntry(tx, {
      sourceType: "sales.credit-note",
      sourceId: id,
      reason: reason ?? `Credit note ${creditNote.creditNoteNo} voided`,
    });
    const invoiceRows = await tx<Array<{ salesInvoiceId: string | null }>>`
      SELECT "salesInvoiceId"
      FROM "SalesCreditNote"
      WHERE id = ${id}
      LIMIT 1
    `;
    if (invoiceRows[0]?.salesInvoiceId) {
      await syncSalesInvoiceBalance(tx, invoiceRows[0].salesInvoiceId);
    }

    await writeSalesAudit(tx, actor.userId, "sales.credit-note", "VOID", id, {
      creditNoteNo: creditNote.creditNoteNo,
      reason,
      totalAmount: Number(creditNote.totalAmount ?? 0),
    });
    await writeSalesHistory(
      tx,
      "sales.credit-note",
      id,
      "VOIDED",
      actor.userId,
      reason
        ? `Credit note ${creditNote.creditNoteNo} voided: ${reason}`
        : `Credit note ${creditNote.creditNoteNo} voided`,
    );

    return {
      id,
      creditNoteNo: creditNote.creditNoteNo,
      status: "VOIDED",
    };
  });
}
