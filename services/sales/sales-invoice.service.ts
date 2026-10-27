import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  normalizeSalesChannel,
  writeSalesAudit,
  writeSalesHistory,
  type SalesChannel,
  type Tx,
} from "@/services/sales/sales-shared.service";

type InvoiceScope = {
  accessibleLocationIds?: string[] | null;
  channel?: string | null;
};

export interface SalesInvoiceSummary {
  id: string;
  publicId: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  channel: SalesChannel;
  locationId: string;
  locationCode: string;
  locationName: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  salesOrderId?: string;
  saleId: string;
  saleNo: string;
  dispatchId?: string;
  dispatchNo?: string;
  currency: string;
  paymentStatus: string;
  status: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  postedAt?: string;
}

export interface SalesInvoiceDetail extends SalesInvoiceSummary {
  remarks?: string;
  createdById: string;
  postedById?: string;
  items: Array<{
    id: string;
    saleItemId?: string;
    dispatchItemId?: string;
    salesOrderItemId?: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId?: string;
    uomCode?: string;
    uomName?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
    discountAmount: number;
    priceListId?: string;
    priceListItemId?: string;
    remarks?: string;
  }>;
  payments: Array<{
    id: string;
    paymentDate: string;
    paymentMethod: string;
    amount: number;
    referenceNo?: string;
    status: string;
  }>;
}

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function createSalesInvoiceFromSaleInTransaction(
  tx: Tx,
  input: {
    saleId: string;
    dispatchId?: string | null;
    invoiceDate?: string | null;
    dueDate?: string | null;
    remarks?: string | null;
  },
  actor: { userId: string; userName: string },
) {
  const existingRows = await tx<Array<{ id: string; invoiceNo: string }>>`
    SELECT id, "invoiceNo"
    FROM "SalesInvoice"
    WHERE "saleId" = ${input.saleId}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (existingRows[0]) {
    return existingRows[0];
  }

  const saleRows = await tx<Array<{
    id: string;
    saleNo: string;
    salesOrderId: string | null;
    saleDate: string;
    channel: string;
    locationId: string;
    customerId: string | null;
    paymentStatus: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    notes: string | null;
  }>>`
    SELECT
      id,
      "saleNo",
      "salesOrderId",
      "saleDate"::text AS "saleDate",
      channel,
      "locationId",
      "customerId",
      "paymentStatus",
      subtotal,
      "taxAmount",
      "discountAmount",
      "totalAmount",
      notes
    FROM "Sale"
    WHERE id = ${input.saleId}
      AND "isArchived" = false
    LIMIT 1
  `;
  const sale = saleRows[0];
  if (!sale) {
    throw new Error("Posted sale not found for invoice creation");
  }

  const itemRows = await tx<Array<{
    id: string;
    salesOrderItemId: string | null;
    itemId: string;
    unitId: string | null;
    priceListId: string | null;
    priceListItemId: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
    discountAmount: number;
    remarks: string | null;
  }>>`
    SELECT
      id,
      "salesOrderItemId",
      "itemId",
      "unitId",
      "priceListId",
      "priceListItemId",
      quantity,
      "unitPrice",
      "lineTotal",
      "taxAmount",
      "discountAmount",
      remarks
    FROM "SaleItem"
    WHERE "saleId" = ${input.saleId}
    ORDER BY "createdAt" ASC
  `;

  const dispatchItemMap = input.dispatchId
    ? new Map(
        (
          await tx<Array<{ saleItemId: string | null; id: string }>>`
            SELECT "saleItemId", id
            FROM "SalesDispatchItem"
            WHERE "dispatchId" = ${input.dispatchId}
          `
        )
          .filter((row) => row.saleItemId)
          .map((row) => [row.saleItemId as string, row.id]),
      )
    : new Map<string, string>();

  const invoiceId = randomUUID();
  const invoiceNo = await nextSalesDocumentNumber(tx, "INV", "Sales invoice");
  const currency = await getSalesDefaultCurrency(tx);
  const paidAmountRows = await tx<Array<{ total: number }>>`
    SELECT COALESCE(SUM(amount), 0)::double precision AS total
    FROM "SalesPayment"
    WHERE "saleId" = ${sale.id}
      AND "isArchived" = false
      AND status = 'POSTED'
  `;
  const amountPaid = Number(paidAmountRows[0]?.total ?? 0);
  const balanceDue = Math.max(Number(sale.totalAmount ?? 0) - amountPaid, 0);
  const paymentStatus =
    balanceDue <= 0
      ? "PAID"
      : amountPaid > 0
        ? "PARTIAL"
        : String(sale.paymentStatus ?? "UNPAID").toUpperCase();

  await tx`
    INSERT INTO "SalesInvoice" (
      id, "invoiceNo", "salesOrderId", "saleId", "dispatchId", "invoiceDate", "dueDate",
      channel, "locationId", "customerId", currency, status, "paymentStatus", subtotal,
      "taxAmount", "discountAmount", "totalAmount", "amountPaid", "balanceDue", remarks, "createdById", "postedById",
      "postedAt", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${invoiceId},
      ${invoiceNo},
      ${sale.salesOrderId},
      ${sale.id},
      ${input.dispatchId ?? null},
      ${input.invoiceDate ? sql`${input.invoiceDate}::timestamptz` : sql`${sale.saleDate}::timestamptz`},
      ${input.dueDate ? sql`${input.dueDate}::timestamptz` : null},
      ${sale.channel},
      ${sale.locationId},
      ${sale.customerId},
      ${currency},
      'POSTED',
      ${paymentStatus},
      ${Number(sale.subtotal ?? 0)},
      ${Number(sale.taxAmount ?? 0)},
      ${Number(sale.discountAmount ?? 0)},
      ${Number(sale.totalAmount ?? 0)},
      ${amountPaid},
      ${balanceDue},
      ${normalizeText(input.remarks) ?? normalizeText(sale.notes) ?? `Invoice created from sale ${sale.saleNo}`},
      ${actor.userId},
      ${actor.userId},
      NOW(),
      false,
      NOW(),
      NOW()
    )
  `;

  for (const line of itemRows) {
    await tx`
      INSERT INTO "SalesInvoiceItem" (
        id, "invoiceId", "saleItemId", "dispatchItemId", "salesOrderItemId", "itemId", "unitId",
        "priceListId", "priceListItemId", quantity, "unitPrice", "lineTotal", "taxAmount",
        "discountAmount", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${invoiceId},
        ${line.id},
        ${dispatchItemMap.get(line.id) ?? null},
        ${line.salesOrderItemId},
        ${line.itemId},
        ${line.unitId},
        ${line.priceListId},
        ${line.priceListItemId},
        ${line.quantity},
        ${line.unitPrice},
        ${line.lineTotal},
        ${line.taxAmount},
        ${line.discountAmount},
        ${line.remarks},
        NOW(),
        NOW()
      )
    `;
  }

  await writeSalesAudit(tx, actor.userId, "sales.invoice", "POST", invoiceId, {
    invoiceNo,
    saleId: sale.id,
    saleNo: sale.saleNo,
    dispatchId: input.dispatchId ?? null,
    totalAmount: sale.totalAmount,
    lineCount: itemRows.length,
  });
  await writeSalesHistory(
    tx,
    "sales.invoice",
    invoiceId,
    "POSTED",
    actor.userId,
    `Invoice ${invoiceNo} created from sale ${sale.saleNo}`,
  );

  return { id: invoiceId, invoiceNo };
}

export async function createSalesInvoiceFromDispatch(
  dispatchId: string,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; saleId: string | null; dispatchNo: string }>>`
      SELECT id, "saleId", "dispatchNo"
      FROM "SalesDispatch"
      WHERE id = ${dispatchId}
        AND "isArchived" = false
      LIMIT 1
    `;
    const dispatch = rows[0];
    if (!dispatch) {
      throw new Error("Dispatch was not found");
    }
    if (!dispatch.saleId) {
      throw new Error("Dispatch is not linked to a posted sale");
    }

    const invoice = await createSalesInvoiceFromSaleInTransaction(
      tx,
      {
        saleId: dispatch.saleId,
        dispatchId: dispatch.id,
        remarks: `Invoice created from dispatch ${dispatch.dispatchNo}`,
      },
      actor,
    );

    return {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      dispatchId: dispatch.id,
    };
  });
}

export async function createSalesInvoiceFromSale(
  saleId: string,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => createSalesInvoiceFromSaleInTransaction(tx, { saleId }, actor));
}

export async function listSalesInvoices(scope: InvoiceScope = {}): Promise<SalesInvoiceSummary[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const channel = scope.channel ? normalizeSalesChannel(scope.channel) : null;
  const rows = await sql<Array<{
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    dueDate: string | null;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    salesOrderId: string | null;
    saleId: string;
    saleNo: string;
    dispatchId: string | null;
    dispatchNo: string | null;
    currency: string;
    paymentStatus: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    postedAt: string | null;
    itemCount: number;
    totalQuantity: number;
  }>>`
    SELECT
      si.id,
      si."publicId",
      si."invoiceNo",
      si."invoiceDate"::text AS "invoiceDate",
      si."dueDate"::text AS "dueDate",
      si.channel,
      si."locationId",
      l."locationCode",
      l."locationName",
      si."customerId",
      c."customerCode",
      c.name AS "customerName",
      si."salesOrderId",
      si."saleId",
      s."saleNo",
      si."dispatchId",
      sd."dispatchNo",
      si.currency,
      si."paymentStatus",
      si.status::text AS status,
      si."totalAmount",
      si."amountPaid",
      si."balanceDue",
      si."postedAt"::text AS "postedAt",
      COUNT(sii.id)::int AS "itemCount",
      COALESCE(SUM(sii.quantity), 0)::double precision AS "totalQuantity"
    FROM "SalesInvoice" si
    INNER JOIN "Sale" s ON s.id = si."saleId"
    INNER JOIN "Location" l ON l.id = si."locationId"
    LEFT JOIN "Customer" c ON c.id = si."customerId"
    LEFT JOIN "SalesDispatch" sd ON sd.id = si."dispatchId"
    LEFT JOIN "SalesInvoiceItem" sii ON sii."invoiceId" = si.id
    WHERE si."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR si."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      AND (${channel}::text IS NULL OR si.channel = ${channel})
    GROUP BY si.id, s.id, l.id, c.id, sd.id
    ORDER BY si."invoiceDate" DESC, si."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    invoiceNo: row.invoiceNo,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate ?? undefined,
    channel: normalizeSalesChannel(row.channel),
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    customerId: row.customerId ?? undefined,
    customerCode: row.customerCode ?? undefined,
    customerName: row.customerName ?? undefined,
    salesOrderId: row.salesOrderId ?? undefined,
    saleId: row.saleId,
    saleNo: row.saleNo,
    dispatchId: row.dispatchId ?? undefined,
    dispatchNo: row.dispatchNo ?? undefined,
    currency: row.currency,
    paymentStatus: row.paymentStatus,
    status: row.status,
    itemCount: Number(row.itemCount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    amountPaid: Number(row.amountPaid ?? 0),
    balanceDue: Number(row.balanceDue ?? 0),
    postedAt: row.postedAt ?? undefined,
  }));
}

export async function getSalesInvoiceById(
  id: string,
  scope: InvoiceScope = {},
): Promise<SalesInvoiceDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<Array<{
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    dueDate: string | null;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    salesOrderId: string | null;
    saleId: string;
    saleNo: string;
    dispatchId: string | null;
    dispatchNo: string | null;
    currency: string;
    paymentStatus: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    postedAt: string | null;
    remarks: string | null;
    createdById: string;
    postedById: string | null;
  }>>`
    SELECT
      si.id,
      si."publicId",
      si."invoiceNo",
      si."invoiceDate"::text AS "invoiceDate",
      si."dueDate"::text AS "dueDate",
      si.channel,
      si."locationId",
      l."locationCode",
      l."locationName",
      si."customerId",
      c."customerCode",
      c.name AS "customerName",
      si."salesOrderId",
      si."saleId",
      s."saleNo",
      si."dispatchId",
      sd."dispatchNo",
      si.currency,
      si."paymentStatus",
      si.status::text AS status,
      si."totalAmount",
      si."amountPaid",
      si."balanceDue",
      si."postedAt"::text AS "postedAt",
      si.remarks,
      si."createdById",
      si."postedById"
    FROM "SalesInvoice" si
    INNER JOIN "Sale" s ON s.id = si."saleId"
    INNER JOIN "Location" l ON l.id = si."locationId"
    LEFT JOIN "Customer" c ON c.id = si."customerId"
    LEFT JOIN "SalesDispatch" sd ON sd.id = si."dispatchId"
    WHERE ${isPublicIdParam(id) ? sql`si."publicId" = ${Number(id)}` : sql`si.id = ${id}`}
      AND si."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR si."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    LIMIT 1
  `;
  const header = headerRows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const [itemRows, paymentRows, totals] = await Promise.all([
    sql<Array<{
      id: string;
      saleItemId: string | null;
      dispatchItemId: string | null;
      salesOrderItemId: string | null;
      itemId: string;
      itemCode: string;
      itemName: string;
      unitId: string | null;
      uomCode: string | null;
      uomName: string | null;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      taxAmount: number;
      discountAmount: number;
      priceListId: string | null;
      priceListItemId: string | null;
      remarks: string | null;
    }>>`
      SELECT
        sii.id,
        sii."saleItemId",
        sii."dispatchItemId",
        sii."salesOrderItemId",
        sii."itemId",
        i."itemCode",
        i."itemName",
        sii."unitId",
        u.code AS "uomCode",
        u.name AS "uomName",
        sii.quantity,
        sii."unitPrice",
        sii."lineTotal",
        sii."taxAmount",
        sii."discountAmount",
        sii."priceListId",
        sii."priceListItemId",
        sii.remarks
      FROM "SalesInvoiceItem" sii
      INNER JOIN "Item" i ON i.id = sii."itemId"
      LEFT JOIN "Unit" u ON u.id = sii."unitId"
      WHERE sii."invoiceId" = ${documentId}
      ORDER BY sii."createdAt" ASC
    `,
    sql<Array<{
      id: string;
      paymentDate: string;
      paymentMethod: string;
      amount: number;
      referenceNo: string | null;
      status: string;
    }>>`
      SELECT
        id,
        "paymentDate"::text AS "paymentDate",
        "paymentMethod"::text AS "paymentMethod",
        amount,
        "referenceNo",
        status
      FROM "SalesPayment"
      WHERE "saleId" = ${header.saleId}
        AND "isArchived" = false
      ORDER BY "paymentDate" ASC, "createdAt" ASC
    `,
    sql<Array<{ itemCount: number; totalQuantity: number }>>`
      SELECT COUNT(id)::int AS "itemCount", COALESCE(SUM(quantity), 0)::double precision AS "totalQuantity"
      FROM "SalesInvoiceItem"
      WHERE "invoiceId" = ${documentId}
    `,
  ]);

  return {
    id: header.id,
    invoiceNo: header.invoiceNo,
    invoiceDate: header.invoiceDate,
    dueDate: header.dueDate ?? undefined,
    channel: normalizeSalesChannel(header.channel),
    locationId: header.locationId,
    locationCode: header.locationCode,
    locationName: header.locationName,
    customerId: header.customerId ?? undefined,
    customerCode: header.customerCode ?? undefined,
    customerName: header.customerName ?? undefined,
    salesOrderId: header.salesOrderId ?? undefined,
    saleId: header.saleId,
    saleNo: header.saleNo,
    dispatchId: header.dispatchId ?? undefined,
    dispatchNo: header.dispatchNo ?? undefined,
    currency: header.currency,
    paymentStatus: header.paymentStatus,
    status: header.status,
    itemCount: Number(totals[0]?.itemCount ?? 0),
    totalQuantity: Number(totals[0]?.totalQuantity ?? 0),
    totalAmount: Number(header.totalAmount ?? 0),
    amountPaid: Number(header.amountPaid ?? 0),
    balanceDue: Number(header.balanceDue ?? 0),
    postedAt: header.postedAt ?? undefined,
    remarks: header.remarks ?? undefined,
    createdById: header.createdById,
    postedById: header.postedById ?? undefined,
    items: itemRows.map((row) => ({
      id: row.id,
      saleItemId: row.saleItemId ?? undefined,
      dispatchItemId: row.dispatchItemId ?? undefined,
      salesOrderItemId: row.salesOrderItemId ?? undefined,
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitId: row.unitId ?? undefined,
      uomCode: row.uomCode ?? undefined,
      uomName: row.uomName ?? undefined,
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      lineTotal: Number(row.lineTotal ?? 0),
      taxAmount: Number(row.taxAmount ?? 0),
      discountAmount: Number(row.discountAmount ?? 0),
      priceListId: row.priceListId ?? undefined,
      priceListItemId: row.priceListItemId ?? undefined,
      remarks: row.remarks ?? undefined,
    })),
    payments: paymentRows.map((row) => ({
      id: row.id,
      paymentDate: row.paymentDate,
      paymentMethod: row.paymentMethod,
      amount: Number(row.amount ?? 0),
      referenceNo: row.referenceNo ?? undefined,
      status: row.status,
    })),
  };
}
