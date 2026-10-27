import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  computeCommercialTotals,
  createCommercialHistoryAndAudit,
  deriveHeaderPriceListId,
  ensureCommercialCustomer,
  ensureCommercialLocation,
  ensureCommercialUser,
  getLatestApproval,
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  normalizeQuotationStatus,
  normalizeSalesChannel,
  normalizeText,
  resolveCommercialLines,
  type CommercialLineInput,
  type QuotationStatus,
} from "@/services/sales/commercial-sales-shared.service";

export interface SalesQuotationScope {
  accessibleLocationIds?: string[] | null;
  channel?: string | null;
}

export interface SaveSalesQuotationInput {
  quotationDate: string;
  expiryDate?: string | null;
  customerId: string;
  channel: string;
  locationId: string;
  salesPersonId?: string | null;
  remarks?: string | null;
  status?: string | null;
  items: CommercialLineInput[];
}

export interface SalesQuotationSummary {
  id: string;
  publicId: number;
  quotationNo: string;
  quotationDate: string;
  expiryDate?: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  salesPersonId?: string;
  salesPersonName?: string;
  channel: string;
  status: QuotationStatus;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
}

export interface SalesQuotationDetail extends SalesQuotationSummary {
  remarks?: string;
  priceListId?: string;
  createdById: string;
  updatedById?: string;
  latestApproval?: {
    id: string;
    status: string;
    assignedApproverId?: string;
    assignedApproverName?: string;
    approvedById?: string;
    approvedByName?: string;
    comment?: string;
    createdAt: string;
    updatedAt: string;
  };
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId?: string;
    uomCode?: string;
    uomName?: string;
    availableQty: number;
    qty: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    taxPercent: number;
    taxAmount: number;
    lineTotal: number;
    priceListItemId?: string;
    priceListCode?: string;
    remarks?: string;
  }>;
}

function mapSummary(row: {
  id: string;
  publicId: number;
  quotationNo: string;
  quotationDate: string;
  expiryDate: string | null;
  customerId: string;
  customerCode: string;
  customerName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  salesPersonId: string | null;
  salesPersonName: string | null;
  channel: string;
  status: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
}): SalesQuotationSummary {
  return {
    id: row.id,
    publicId: Number(row.publicId),
    quotationNo: row.quotationNo,
    quotationDate: row.quotationDate,
    expiryDate: row.expiryDate ?? undefined,
    customerId: row.customerId,
    customerCode: row.customerCode,
    customerName: row.customerName,
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    salesPersonId: row.salesPersonId ?? undefined,
    salesPersonName: row.salesPersonName ?? undefined,
    channel: row.channel,
    status: normalizeQuotationStatus(row.status),
    currency: row.currency,
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    taxAmount: Number(row.taxAmount ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    itemCount: Number(row.itemCount ?? 0),
    approvedById: row.approvedById ?? undefined,
    approvedByName: row.approvedByName ?? undefined,
    approvedAt: row.approvedAt ?? undefined,
  };
}

async function insertQuotationItems(
  tx: typeof sql,
  quotationId: string,
  lines: Awaited<ReturnType<typeof resolveCommercialLines>>,
) {
  for (const line of lines) {
    await tx`
      INSERT INTO "SalesQuotationItem" (
        id, "quotationId", "itemId", "unitId", qty, "unitPrice", "discountPercent",
        "discountAmount", "taxPercent", "taxAmount", "lineTotal", "priceListItemId",
        remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${line.id},
        ${quotationId},
        ${line.itemId},
        ${line.unitId ?? null},
        ${line.quantity},
        ${line.unitPrice},
        ${line.discountPercent},
        ${line.discountAmount},
        ${line.taxPercent},
        ${line.taxAmount},
        ${line.lineTotal},
        ${line.priceListItemId},
        ${line.remarks ?? null},
        NOW(),
        NOW()
      )
    `;
  }
}

export async function listSalesQuotations(
  scope: SalesQuotationScope = {},
): Promise<SalesQuotationSummary[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const channel = normalizeText(scope.channel);
  const rows = await sql<
    Array<{
      id: string;
      quotationNo: string;
      quotationDate: string;
      expiryDate: string | null;
      customerId: string;
      customerCode: string;
      customerName: string;
      locationId: string;
      locationCode: string;
      locationName: string;
      salesPersonId: string | null;
      salesPersonName: string | null;
      channel: string;
      status: string;
      currency: string;
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      totalAmount: number;
      itemCount: number;
      approvedById: string | null;
      approvedByName: string | null;
      approvedAt: string | null;
    }>
  >`
    SELECT
      sq.id,
      sq."publicId",
      sq."quotationNo",
      sq."quotationDate"::text AS "quotationDate",
      sq."expiryDate"::text AS "expiryDate",
      sq."customerId",
      c."customerCode",
      c.name AS "customerName",
      sq."locationId",
      l."locationCode",
      l."locationName",
      sq."salesPersonId",
      sp.name AS "salesPersonName",
      sq.channel,
      sq.status,
      sq.currency,
      COALESCE(SUM(sqi."qty" * sqi."unitPrice"), 0)::double precision AS subtotal,
      COALESCE(SUM(sqi."discountAmount"), 0)::double precision AS "discountAmount",
      COALESCE(SUM(sqi."taxAmount"), 0)::double precision AS "taxAmount",
      COALESCE(SUM(sqi."lineTotal"), 0)::double precision AS "totalAmount",
      COUNT(sqi.id)::int AS "itemCount",
      sq."approvedById",
      approved.name AS "approvedByName",
      sq."approvedAt"::text AS "approvedAt"
    FROM "SalesQuotation" sq
    INNER JOIN "Customer" c ON c.id = sq."customerId"
    INNER JOIN "Location" l ON l.id = sq."locationId"
    LEFT JOIN "User" sp ON sp.id = sq."salesPersonId"
    LEFT JOIN "User" approved ON approved.id = sq."approvedById"
    LEFT JOIN "SalesQuotationItem" sqi ON sqi."quotationId" = sq.id
    WHERE sq."isArchived" = false
      AND (${channel ?? null}::text IS NULL OR sq.channel = ${channel ?? null})
      AND (${locationIds.length > 0 ? sql`sq."locationId" = ANY(${locationIds})` : sql`TRUE`})
    GROUP BY sq.id, c."customerCode", c.name, l."locationCode", l."locationName", sp.name, approved.name
    ORDER BY sq."quotationDate" DESC, sq."createdAt" DESC
  `;

  return rows.map(mapSummary);
}

export async function getSalesQuotationById(
  id: string,
  scope: SalesQuotationScope = {},
): Promise<SalesQuotationDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<
    Array<{
      id: string;
      quotationNo: string;
      quotationDate: string;
      expiryDate: string | null;
      customerId: string;
      customerCode: string;
      customerName: string;
      locationId: string;
      locationCode: string;
      locationName: string;
      salesPersonId: string | null;
      salesPersonName: string | null;
      channel: string;
      status: string;
      currency: string;
      priceListId: string | null;
      remarks: string | null;
      createdById: string;
      updatedById: string | null;
      approvedById: string | null;
      approvedByName: string | null;
      approvedAt: string | null;
    }>
  >`
    SELECT
      sq.id,
      sq."publicId",
      sq."quotationNo",
      sq."quotationDate"::text AS "quotationDate",
      sq."expiryDate"::text AS "expiryDate",
      sq."customerId",
      c."customerCode",
      c.name AS "customerName",
      sq."locationId",
      l."locationCode",
      l."locationName",
      sq."salesPersonId",
      sp.name AS "salesPersonName",
      sq.channel,
      sq.status,
      sq.currency,
      sq."priceListId",
      sq.remarks,
      sq."createdById",
      sq."updatedById",
      sq."approvedById",
      approved.name AS "approvedByName",
      sq."approvedAt"::text AS "approvedAt"
    FROM "SalesQuotation" sq
    INNER JOIN "Customer" c ON c.id = sq."customerId"
    INNER JOIN "Location" l ON l.id = sq."locationId"
    LEFT JOIN "User" sp ON sp.id = sq."salesPersonId"
    LEFT JOIN "User" approved ON approved.id = sq."approvedById"
    WHERE ${isPublicIdParam(id) ? sql`sq."publicId" = ${Number(id)}` : sql`sq.id = ${id}`}
      AND sq."isArchived" = false
      AND (${locationIds.length > 0 ? sql`sq."locationId" = ANY(${locationIds})` : sql`TRUE`})
    LIMIT 1
  `;

  const header = headerRows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const itemRows = await sql<
    Array<{
      id: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      unitId: string | null;
      uomCode: string | null;
      uomName: string | null;
      availableQty: number | null;
      qty: number;
      unitPrice: number;
      discountPercent: number;
      discountAmount: number;
      taxPercent: number;
      taxAmount: number;
      lineTotal: number;
      priceListItemId: string | null;
      priceListCode: string | null;
      remarks: string | null;
    }>
  >`
    SELECT
      sqi.id,
      sqi."itemId",
      i."itemCode",
      i."itemName",
      sqi."unitId",
      u.code AS "uomCode",
      u.name AS "uomName",
      sb."availableQuantity" AS "availableQty",
      sqi.qty,
      sqi."unitPrice",
      sqi."discountPercent",
      sqi."discountAmount",
      sqi."taxPercent",
      sqi."taxAmount",
      sqi."lineTotal",
      sqi."priceListItemId",
      pl.code AS "priceListCode",
      sqi.remarks
    FROM "SalesQuotationItem" sqi
    INNER JOIN "Item" i ON i.id = sqi."itemId"
    LEFT JOIN "Unit" u ON u.id = sqi."unitId"
    LEFT JOIN "PriceListItem" pli ON pli.id = sqi."priceListItemId"
    LEFT JOIN "PriceList" pl ON pl.id = pli."priceListId"
    LEFT JOIN "StockBalance" sb ON sb."locationId" = ${header.locationId} AND sb."itemId" = sqi."itemId" AND sb."isArchived" = false
    WHERE sqi."quotationId" = ${documentId}
    ORDER BY sqi."createdAt" ASC
  `;

  const latestApproval = await getLatestApproval(sql, "sales.quotation", id);
  const subtotal = itemRows.reduce((sum, item) => sum + Number(item.qty ?? 0) * Number(item.unitPrice ?? 0), 0);
  const discountAmount = itemRows.reduce((sum, item) => sum + Number(item.discountAmount ?? 0), 0);
  const taxAmount = itemRows.reduce((sum, item) => sum + Number(item.taxAmount ?? 0), 0);
  const totalAmount = itemRows.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0);

  return {
    ...mapSummary({
      ...header,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      itemCount: itemRows.length,
    }),
    priceListId: header.priceListId ?? undefined,
    remarks: header.remarks ?? undefined,
    createdById: header.createdById,
    updatedById: header.updatedById ?? undefined,
    latestApproval: latestApproval
      ? {
          id: latestApproval.id,
          status: latestApproval.status,
          assignedApproverId: latestApproval.assignedApproverId ?? undefined,
          assignedApproverName: latestApproval.assignedApproverName ?? undefined,
          approvedById: latestApproval.approvedById ?? undefined,
          approvedByName: latestApproval.approvedByName ?? undefined,
          comment: latestApproval.comment ?? undefined,
          createdAt: latestApproval.createdAt,
          updatedAt: latestApproval.updatedAt,
        }
      : undefined,
    items: itemRows.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unitId: item.unitId ?? undefined,
      uomCode: item.uomCode ?? undefined,
      uomName: item.uomName ?? undefined,
      availableQty: Number(item.availableQty ?? 0),
      qty: Number(item.qty ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      discountPercent: Number(item.discountPercent ?? 0),
      discountAmount: Number(item.discountAmount ?? 0),
      taxPercent: Number(item.taxPercent ?? 0),
      taxAmount: Number(item.taxAmount ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      priceListItemId: item.priceListItemId ?? undefined,
      priceListCode: item.priceListCode ?? undefined,
      remarks: item.remarks ?? undefined,
    })),
  };
}

export async function createSalesQuotation(
  input: SaveSalesQuotationInput,
  actor: { userId: string; userName: string },
) {
  if (!input.quotationDate) {
    throw new Error("Quotation date is required");
  }

  return sql.begin(async (tx) => {
    const customer = await ensureCommercialCustomer(tx, input.customerId);
    await ensureCommercialLocation(tx, input.locationId);
    await ensureCommercialUser(tx, input.salesPersonId, "Sales person");
    const lines = await resolveCommercialLines(tx, {
      lines: input.items,
      channel: input.channel,
      transactionDate: input.quotationDate,
      customerId: customer.id,
      locationId: input.locationId,
      customerGroup: customer.customerType ?? null,
    });
    const totals = computeCommercialTotals(lines);
    const currency = await getSalesDefaultCurrency(tx);
    const quotationId = randomUUID();
    const quotationNo = await nextSalesDocumentNumber(tx, "QUO", "Sales quotation");
    const status = normalizeQuotationStatus(input.status);

    await tx`
      INSERT INTO "SalesQuotation" (
        id, "quotationNo", "customerId", channel, "locationId", "salesPersonId", status,
        currency, "priceListId", "quotationDate", "expiryDate", remarks, "createdById",
        "updatedById", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${quotationId},
        ${quotationNo},
        ${customer.id},
        ${normalizeSalesChannel(input.channel)},
        ${input.locationId},
        ${normalizeText(input.salesPersonId)},
        ${status},
        ${currency},
        ${deriveHeaderPriceListId(lines)},
        ${input.quotationDate}::timestamptz,
        ${normalizeText(input.expiryDate)}::timestamptz,
        ${normalizeText(input.remarks)},
        ${actor.userId},
        ${actor.userId},
        false,
        NOW(),
        NOW()
      )
    `;

    await insertQuotationItems(tx, quotationId, lines);
    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.quotation",
      action: "CREATE",
      recordId: quotationId,
      referenceType: "sales.quotation",
      historyAction: status === "SENT" ? "SENT" : "CREATED",
      historyComment: `Quotation ${quotationNo} created`,
      newValue: {
        quotationNo,
        customerId: customer.id,
        channel: normalizeSalesChannel(input.channel),
        locationId: input.locationId,
        totalAmount: totals.totalAmount,
        lineCount: lines.length,
      },
    });

    const pub = await tx<Array<{ publicId: number }>>`SELECT "publicId" FROM "SalesQuotation" WHERE id = ${quotationId} LIMIT 1`;
    return {
      id: quotationId,
      publicId: Number(pub[0]?.publicId ?? 0),
      quotationNo,
      status,
      totalAmount: totals.totalAmount,
    };
  });
}

export async function updateSalesQuotation(
  id: string,
  input: SaveSalesQuotationInput,
  actor: { userId: string; userName: string },
) {
  if (!input.quotationDate) {
    throw new Error("Quotation date is required");
  }

  return sql.begin(async (tx) => {
    const existingRows = await tx<Array<{ id: string; quotationNo: string; status: string }>>`
      SELECT id, "quotationNo", status
      FROM "SalesQuotation"
      WHERE id = ${id}
        AND "isArchived" = false
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      throw new Error("Quotation was not found");
    }
    if (["CONVERTED", "EXPIRED"].includes(existing.status)) {
      throw new Error("Converted or expired quotations cannot be edited");
    }

    const customer = await ensureCommercialCustomer(tx, input.customerId);
    await ensureCommercialLocation(tx, input.locationId);
    await ensureCommercialUser(tx, input.salesPersonId, "Sales person");
    const lines = await resolveCommercialLines(tx, {
      lines: input.items,
      channel: input.channel,
      transactionDate: input.quotationDate,
      customerId: customer.id,
      locationId: input.locationId,
      customerGroup: customer.customerType ?? null,
    });
    const status = normalizeQuotationStatus(input.status ?? existing.status);

    await tx`DELETE FROM "SalesQuotationItem" WHERE "quotationId" = ${id}`;
    await insertQuotationItems(tx, id, lines);

    await tx`
      UPDATE "SalesQuotation"
      SET
        "customerId" = ${customer.id},
        channel = ${normalizeSalesChannel(input.channel)},
        "locationId" = ${input.locationId},
        "salesPersonId" = ${normalizeText(input.salesPersonId)},
        status = ${status},
        "priceListId" = ${deriveHeaderPriceListId(lines)},
        "quotationDate" = ${input.quotationDate}::timestamptz,
        "expiryDate" = ${normalizeText(input.expiryDate)}::timestamptz,
        remarks = ${normalizeText(input.remarks)},
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.quotation",
      action: "UPDATE",
      recordId: id,
      referenceType: "sales.quotation",
      historyAction: "UPDATED",
      historyComment: `Quotation ${existing.quotationNo} updated`,
      newValue: {
        quotationNo: existing.quotationNo,
        status,
        lineCount: lines.length,
      },
    });

    return {
      id,
      quotationNo: existing.quotationNo,
      status,
      totalAmount: computeCommercialTotals(lines).totalAmount,
    };
  });
}

export async function transitionSalesQuotation(
  id: string,
  targetStatus: Exclude<QuotationStatus, "CONVERTED">,
  actor: { userId: string; userName: string },
  comment?: string | null,
) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; quotationNo: string; status: string }>>`
      SELECT id, "quotationNo", status
      FROM "SalesQuotation"
      WHERE id = ${id}
        AND "isArchived" = false
      LIMIT 1
      FOR UPDATE
    `;
    const quotation = rows[0];
    if (!quotation) {
      throw new Error("Quotation was not found");
    }

    const currentStatus = normalizeQuotationStatus(quotation.status);
    const allowed: Record<QuotationStatus, QuotationStatus[]> = {
      DRAFT: ["SENT"],
      SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
      CONVERTED: [],
    };
    if (!allowed[currentStatus].includes(targetStatus)) {
      throw new Error(`Quotation cannot move from ${currentStatus} to ${targetStatus}`);
    }

    await tx`
      UPDATE "SalesQuotation"
      SET status = ${targetStatus}, "updatedById" = ${actor.userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.quotation",
      action: targetStatus,
      recordId: id,
      referenceType: "sales.quotation",
      historyAction: targetStatus,
      historyComment: `Quotation ${quotation.quotationNo} marked ${targetStatus.toLowerCase()}`,
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus, comment: normalizeText(comment) },
    });

    return { id, quotationNo: quotation.quotationNo, status: targetStatus };
  });
}
