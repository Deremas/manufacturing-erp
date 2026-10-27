import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { issueForSales } from "@/services/inventory/inventory-posting.service";
import { reserveStock } from "@/services/inventory/reservation.service";
import { syncPostedSaleFinance } from "@/services/sales/sales-finance.service";
import { createSalesInvoiceFromSaleInTransaction } from "@/services/sales/sales-invoice.service";
import { syncSalesOrderProgress } from "@/services/sales/sales-order-allocation.service";
import {
  approveCommercialDocument,
  computeCommercialTotals,
  createCommercialHistoryAndAudit,
  deriveHeaderPriceListId,
  ensureCommercialCustomer,
  ensureCommercialLocation,
  ensureCommercialUser,
  getLatestApproval,
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  normalizeSalesChannel,
  normalizeSalesOrderApprovalStatus,
  normalizeSalesOrderStatus,
  normalizeText,
  rejectCommercialDocument,
  resolveCommercialLines,
  syncCommercialApproval,
  type CommercialLineInput,
  type SalesOrderApprovalStatus,
  type SalesOrderStatus,
} from "@/services/sales/commercial-sales-shared.service";

export interface SalesOrderScope {
  accessibleLocationIds?: string[] | null;
  channel?: string | null;
}

export interface SaveSalesOrderInput {
  quotationId?: string | null;
  customerId: string;
  channel: string;
  locationId: string;
  salesPersonId?: string | null;
  paymentTerms?: string | null;
  requiredDeliveryDate?: string | null;
  remarks?: string | null;
  assignedApproverId?: string | null;
  status?: string | null;
  items: CommercialLineInput[];
}

export interface ConvertOrderToLoadingInput {
  loadingDate: string;
  destinationLocationId?: string | null;
  agentId?: string | null;
  customerId?: string | null;
  truckId?: string | null;
  driverId?: string | null;
  tripId?: string | null;
  routeName?: string | null;
  remarks?: string | null;
  lines?: Array<{
    salesOrderItemId: string;
    quantity: number;
  }>;
}

export interface ConvertOrderToInvoiceInput {
  saleDate: string;
  customerId?: string | null;
  paymentMethod?: "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY" | null;
  bankAccountId?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
  lines?: Array<{
    salesOrderItemId: string;
    quantity: number;
  }>;
}

export interface SalesOrderSummary {
  id: string;
  publicId: number;
  orderNo: string;
  quotationId?: string;
  quotationNo?: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  channel: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  salesPersonId?: string;
  salesPersonName?: string;
  paymentTerms?: string;
  requiredDeliveryDate?: string;
  currency: string;
  status: SalesOrderStatus;
  approvalStatus: SalesOrderApprovalStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  reservedAmount: number;
  fulfilledAmount: number;
  itemCount: number;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
}

export interface SalesOrderDetail extends SalesOrderSummary {
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
    orderedQty: number;
    reservedQty: number;
    loadedQty: number;
    deliveredQty: number;
    dispatchedQty: number;
    invoicedQty: number;
    returnedQty: number;
    cancelledQty: number;
    remainingQty: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
    priceListItemId?: string;
    priceListCode?: string;
    remarks?: string;
  }>;
  relatedLoadingOrders: Array<{
    id: string;
    publicId: number;
    loadingNo: string;
    status: string;
    loadingDate: string;
    totalAmount: number;
  }>;
  relatedDispatches: Array<{
    id: string;
    publicId: number;
    dispatchNo: string;
    status: string;
    dispatchDate: string;
    totalAmount: number;
    loadingOrderId?: string;
    loadingNo?: string;
  }>;
  relatedInvoices: Array<{
    id: string;
    publicId: number;
    invoiceNo: string;
    status: string;
    invoiceDate: string;
    totalAmount: number;
    saleId?: string;
    saleNo?: string;
    dispatchId?: string;
    dispatchNo?: string;
  }>;
  relatedSales: Array<{
    id: string;
    publicId: number;
    saleNo: string;
    status: string;
    saleDate: string;
    totalAmount: number;
    paymentStatus: string;
  }>;
}

function normalizeSubmittedOrderStatus(value?: string | null): SalesOrderStatus {
  const normalized = normalizeSalesOrderStatus(value);
  return normalized === "DRAFT" ? normalized : normalized === "CANCELLED" ? normalized : "APPROVED";
}

function mapOrderSummary(row: {
  id: string;
  publicId: number;
  orderNo: string;
  quotationId: string | null;
  quotationNo: string | null;
  customerId: string;
  customerCode: string;
  customerName: string;
  channel: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  salesPersonId: string | null;
  salesPersonName: string | null;
  paymentTerms: string | null;
  requiredDeliveryDate: string | null;
  currency: string;
  status: string;
  approvalStatus: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  reservedAmount: number;
  fulfilledAmount: number;
  itemCount: number;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
}): SalesOrderSummary {
  return {
    id: row.id,
    publicId: Number(row.publicId),
    orderNo: row.orderNo,
    quotationId: row.quotationId ?? undefined,
    quotationNo: row.quotationNo ?? undefined,
    customerId: row.customerId,
    customerCode: row.customerCode,
    customerName: row.customerName,
    channel: row.channel,
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    salesPersonId: row.salesPersonId ?? undefined,
    salesPersonName: row.salesPersonName ?? undefined,
    paymentTerms: row.paymentTerms ?? undefined,
    requiredDeliveryDate: row.requiredDeliveryDate ?? undefined,
    currency: row.currency,
    status: normalizeSalesOrderStatus(row.status),
    approvalStatus: normalizeSalesOrderApprovalStatus(row.approvalStatus),
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    taxAmount: Number(row.taxAmount ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    reservedAmount: Number(row.reservedAmount ?? 0),
    fulfilledAmount: Number(row.fulfilledAmount ?? 0),
    itemCount: Number(row.itemCount ?? 0),
    approvedById: row.approvedById ?? undefined,
    approvedByName: row.approvedByName ?? undefined,
    approvedAt: row.approvedAt ?? undefined,
  };
}

async function insertOrderItems(
  tx: typeof sql,
  salesOrderId: string,
  lines: Awaited<ReturnType<typeof resolveCommercialLines>>,
) {
  for (const line of lines) {
    await tx`
      INSERT INTO "SalesOrderItem" (
        id, "salesOrderId", "itemId", "unitId", "orderedQty", "reservedQty", "loadedQty",
        "deliveredQty", "returnedQty", "cancelledQty", "unitPrice", "discountAmount",
        "taxAmount", "lineTotal", "priceListItemId", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${line.id},
        ${salesOrderId},
        ${line.itemId},
        ${line.unitId ?? null},
        ${line.quantity},
        0,
        0,
        0,
        0,
        0,
        ${line.unitPrice},
        ${line.discountAmount},
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

async function getOrderHeaderForUpdate(tx: typeof sql, id: string) {
  const rows = await tx<
    Array<{
      id: string;
      orderNo: string;
      quotationId: string | null;
      customerId: string;
      channel: string;
      locationId: string;
      priceListId: string | null;
      status: string;
      approvalStatus: string;
      paymentTerms: string | null;
      requiredDeliveryDate: string | null;
      remarks: string | null;
      currency: string;
    }>
  >`
    SELECT
      id,
      "orderNo",
      "quotationId",
      "customerId",
      channel,
      "locationId",
      "priceListId",
      status,
      "approvalStatus",
      "paymentTerms",
      "requiredDeliveryDate"::text AS "requiredDeliveryDate",
      remarks,
      currency
    FROM "SalesOrder"
    WHERE id = ${id}
      AND "isArchived" = false
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getOrderItemsForConversion(tx: typeof sql, id: string) {
  return tx<
    Array<{
      id: string;
      itemId: string;
      unitId: string | null;
      orderedQty: number;
      reservedQty: number;
      loadedQty: number;
      deliveredQty: number;
      dispatchedQty: number;
      invoicedQty: number;
      returnedQty: number;
      cancelledQty: number;
      unitPrice: number;
      lineTotal: number;
      priceListItemId: string | null;
      remarks: string | null;
    }>
  >`
    SELECT
      id,
      "itemId",
      "unitId",
      "orderedQty",
      "reservedQty",
      "loadedQty",
      "deliveredQty",
      "returnedQty",
      "cancelledQty",
      "unitPrice",
      "lineTotal",
      "priceListItemId",
      remarks
    FROM "SalesOrderItem"
    WHERE "salesOrderId" = ${id}
    ORDER BY "createdAt" ASC
  `;
}

export async function listSalesOrders(scope: SalesOrderScope = {}): Promise<SalesOrderSummary[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const channel = normalizeText(scope.channel);
  const rows = await sql<
    Array<{
      id: string;
      orderNo: string;
      quotationId: string | null;
      quotationNo: string | null;
      customerId: string;
      customerCode: string;
      customerName: string;
      channel: string;
      locationId: string;
      locationCode: string;
      locationName: string;
      salesPersonId: string | null;
      salesPersonName: string | null;
      paymentTerms: string | null;
      requiredDeliveryDate: string | null;
      currency: string;
      status: string;
      approvalStatus: string;
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      totalAmount: number;
      reservedAmount: number;
      fulfilledAmount: number;
      itemCount: number;
      approvedById: string | null;
      approvedByName: string | null;
      approvedAt: string | null;
    }>
  >`
    SELECT
      so.id,
      so."publicId",
      so."orderNo",
      so."quotationId",
      sq."quotationNo",
      so."customerId",
      c."customerCode",
      c.name AS "customerName",
      so.channel,
      so."locationId",
      l."locationCode",
      l."locationName",
      so."salesPersonId",
      sp.name AS "salesPersonName",
      so."paymentTerms",
      so."requiredDeliveryDate"::text AS "requiredDeliveryDate",
      so.currency,
      so.status,
      so."approvalStatus",
      so.subtotal,
      so."discountAmount",
      so."taxAmount",
      so."totalAmount",
      so."reservedAmount",
      so."fulfilledAmount",
      COUNT(soi.id)::int AS "itemCount",
      so."approvedById",
      approved.name AS "approvedByName",
      so."approvedAt"::text AS "approvedAt"
    FROM "SalesOrder" so
    INNER JOIN "Customer" c ON c.id = so."customerId"
    INNER JOIN "Location" l ON l.id = so."locationId"
    LEFT JOIN "SalesQuotation" sq ON sq.id = so."quotationId"
    LEFT JOIN "User" sp ON sp.id = so."salesPersonId"
    LEFT JOIN "User" approved ON approved.id = so."approvedById"
    LEFT JOIN "SalesOrderItem" soi ON soi."salesOrderId" = so.id
    WHERE so."isArchived" = false
      AND (${channel ?? null}::text IS NULL OR so.channel = ${channel ?? null})
      AND (${locationIds.length > 0 ? sql`so."locationId" = ANY(${locationIds})` : sql`TRUE`})
    GROUP BY so.id, sq."quotationNo", c."customerCode", c.name, l."locationCode", l."locationName", sp.name, approved.name
    ORDER BY so."createdAt" DESC
  `;

  return rows.map(mapOrderSummary);
}

export async function getSalesOrderById(
  id: string,
  scope: SalesOrderScope = {},
): Promise<SalesOrderDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<
    Array<{
      id: string;
      orderNo: string;
      quotationId: string | null;
      quotationNo: string | null;
      customerId: string;
      customerCode: string;
      customerName: string;
      channel: string;
      locationId: string;
      locationCode: string;
      locationName: string;
      salesPersonId: string | null;
      salesPersonName: string | null;
      paymentTerms: string | null;
      requiredDeliveryDate: string | null;
      currency: string;
      status: string;
      approvalStatus: string;
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      totalAmount: number;
      reservedAmount: number;
      fulfilledAmount: number;
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
      so.id,
      so."publicId",
      so."orderNo",
      so."quotationId",
      sq."quotationNo",
      so."customerId",
      c."customerCode",
      c.name AS "customerName",
      so.channel,
      so."locationId",
      l."locationCode",
      l."locationName",
      so."salesPersonId",
      sp.name AS "salesPersonName",
      so."paymentTerms",
      so."requiredDeliveryDate"::text AS "requiredDeliveryDate",
      so.currency,
      so.status,
      so."approvalStatus",
      so.subtotal,
      so."discountAmount",
      so."taxAmount",
      so."totalAmount",
      so."reservedAmount",
      so."fulfilledAmount",
      so."priceListId",
      so.remarks,
      so."createdById",
      so."updatedById",
      so."approvedById",
      approved.name AS "approvedByName",
      so."approvedAt"::text AS "approvedAt"
    FROM "SalesOrder" so
    INNER JOIN "Customer" c ON c.id = so."customerId"
    INNER JOIN "Location" l ON l.id = so."locationId"
    LEFT JOIN "SalesQuotation" sq ON sq.id = so."quotationId"
    LEFT JOIN "User" sp ON sp.id = so."salesPersonId"
    LEFT JOIN "User" approved ON approved.id = so."approvedById"
    WHERE ${isPublicIdParam(id) ? sql`so."publicId" = ${Number(id)}` : sql`so.id = ${id}`}
      AND so."isArchived" = false
      AND (${locationIds.length > 0 ? sql`so."locationId" = ANY(${locationIds})` : sql`TRUE`})
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
      orderedQty: number;
      reservedQty: number;
      loadedQty: number;
      deliveredQty: number;
      dispatchedQty: number;
      invoicedQty: number;
      returnedQty: number;
      cancelledQty: number;
      unitPrice: number;
      discountAmount: number;
      taxAmount: number;
      lineTotal: number;
      priceListItemId: string | null;
      priceListCode: string | null;
      remarks: string | null;
    }>
  >`
    SELECT
      soi.id,
      soi."itemId",
      i."itemCode",
      i."itemName",
      soi."unitId",
      u.code AS "uomCode",
      u.name AS "uomName",
      sb."availableQuantity" AS "availableQty",
      soi."orderedQty",
      soi."reservedQty",
      soi."loadedQty",
      soi."deliveredQty",
      COALESCE(dispatch_progress."dispatchedQty", 0) AS "dispatchedQty",
      COALESCE(invoice_progress."invoicedQty", 0) AS "invoicedQty",
      soi."returnedQty",
      soi."cancelledQty",
      soi."unitPrice",
      soi."discountAmount",
      soi."taxAmount",
      soi."lineTotal",
      soi."priceListItemId",
      pl.code AS "priceListCode",
      soi.remarks
    FROM "SalesOrderItem" soi
    INNER JOIN "Item" i ON i.id = soi."itemId"
    LEFT JOIN "Unit" u ON u.id = soi."unitId"
    LEFT JOIN "PriceListItem" pli ON pli.id = soi."priceListItemId"
    LEFT JOIN "PriceList" pl ON pl.id = pli."priceListId"
    LEFT JOIN "StockBalance" sb ON sb."locationId" = ${header.locationId} AND sb."itemId" = soi."itemId" AND sb."isArchived" = false
    LEFT JOIN (
      SELECT sdi."salesOrderItemId", SUM(sdi.quantity)::double precision AS "dispatchedQty"
      FROM "SalesDispatchItem" sdi
      INNER JOIN "SalesDispatch" sd ON sd.id = sdi."dispatchId"
      WHERE sd."salesOrderId" = ${documentId} AND sd."isArchived" = false AND sd.status <> 'CANCELLED'
      GROUP BY sdi."salesOrderItemId"
    ) dispatch_progress ON dispatch_progress."salesOrderItemId" = soi.id
    LEFT JOIN (
      SELECT sii."salesOrderItemId", SUM(sii.quantity)::double precision AS "invoicedQty"
      FROM "SalesInvoiceItem" sii
      INNER JOIN "SalesInvoice" sinv ON sinv.id = sii."invoiceId"
      WHERE sinv."salesOrderId" = ${documentId} AND sinv."isArchived" = false AND sinv.status <> 'CANCELLED'
      GROUP BY sii."salesOrderItemId"
    ) invoice_progress ON invoice_progress."salesOrderItemId" = soi.id
    WHERE soi."salesOrderId" = ${documentId}
    ORDER BY soi."createdAt" ASC
  `;

  const [loadingRows, dispatchRows, invoiceRows, saleRows, latestApproval] = await Promise.all([
    sql<
      Array<{ id: string; publicId: number; loadingNo: string; status: string; loadingDate: string; totalAmount: number }>
    >`
      SELECT id, "publicId", "loadingNo", status, "loadingDate"::text AS "loadingDate", "totalAmount"
      FROM "LoadingOrder"
      WHERE "salesOrderId" = ${documentId}
        AND "isArchived" = false
      ORDER BY "createdAt" DESC
    `,
    sql<
      Array<{
        id: string;
        publicId: number;
        dispatchNo: string;
        status: string;
        dispatchDate: string;
        totalAmount: number;
        loadingOrderId: string | null;
        loadingNo: string | null;
      }>
    >`
      SELECT
        sd.id,
        sd."publicId",
        sd."dispatchNo",
        sd.status,
        sd."dispatchDate"::text AS "dispatchDate",
        sd."totalAmount",
        sd."loadingOrderId",
        lo."loadingNo"
      FROM "SalesDispatch" sd
      LEFT JOIN "LoadingOrder" lo ON lo.id = sd."loadingOrderId"
      WHERE sd."salesOrderId" = ${documentId}
        AND sd."isArchived" = false
      ORDER BY sd."createdAt" DESC
    `,
    sql<
      Array<{
        id: string;
        publicId: number;
        invoiceNo: string;
        status: string;
        invoiceDate: string;
        totalAmount: number;
        saleId: string | null;
        saleNo: string | null;
        dispatchId: string | null;
        dispatchNo: string | null;
      }>
    >`
      SELECT
        si.id,
        si."publicId",
        si."invoiceNo",
        si.status::text AS status,
        si."invoiceDate"::text AS "invoiceDate",
        si."totalAmount",
        si."saleId",
        s."saleNo",
        si."dispatchId",
        sd."dispatchNo"
      FROM "SalesInvoice" si
      LEFT JOIN "Sale" s ON s.id = si."saleId"
      LEFT JOIN "SalesDispatch" sd ON sd.id = si."dispatchId"
      WHERE si."salesOrderId" = ${documentId}
        AND si."isArchived" = false
      ORDER BY si."createdAt" DESC
    `,
    sql<
      Array<{ id: string; publicId: number; saleNo: string; status: string; saleDate: string; totalAmount: number; paymentStatus: string }>
    >`
      SELECT id, "publicId", "saleNo", status, "saleDate"::text AS "saleDate", "totalAmount", "paymentStatus"
      FROM "Sale"
      WHERE "salesOrderId" = ${documentId}
        AND "isArchived" = false
      ORDER BY "createdAt" DESC
    `,
    getLatestApproval(sql, "sales.order", documentId),
  ]);

  return {
    ...mapOrderSummary({
      ...header,
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
    items: itemRows.map((item) => {
      const remainingQty = Math.max(Number(item.orderedQty ?? 0) - Number(item.deliveredQty ?? 0) - Number(item.cancelledQty ?? 0), 0);
      return {
        id: item.id,
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unitId: item.unitId ?? undefined,
        uomCode: item.uomCode ?? undefined,
        uomName: item.uomName ?? undefined,
        availableQty: Number(item.availableQty ?? 0),
        orderedQty: Number(item.orderedQty ?? 0),
        reservedQty: Number(item.reservedQty ?? 0),
        loadedQty: Number(item.loadedQty ?? 0),
        deliveredQty: Number(item.deliveredQty ?? 0),
        dispatchedQty: Number(item.dispatchedQty ?? 0),
        invoicedQty: Number(item.invoicedQty ?? 0),
        returnedQty: Number(item.returnedQty ?? 0),
        cancelledQty: Number(item.cancelledQty ?? 0),
        remainingQty,
        unitPrice: Number(item.unitPrice ?? 0),
        discountAmount: Number(item.discountAmount ?? 0),
        taxAmount: Number(item.taxAmount ?? 0),
        lineTotal: Number(item.lineTotal ?? 0),
        priceListItemId: item.priceListItemId ?? undefined,
        priceListCode: item.priceListCode ?? undefined,
        remarks: item.remarks ?? undefined,
      };
    }),
    relatedLoadingOrders: loadingRows.map((item) => ({
      id: item.id,
      publicId: Number(item.publicId),
      loadingNo: item.loadingNo,
      status: item.status,
      loadingDate: item.loadingDate,
      totalAmount: Number(item.totalAmount ?? 0),
    })),
    relatedDispatches: dispatchRows.map((item) => ({
      id: item.id,
      publicId: Number(item.publicId),
      dispatchNo: item.dispatchNo,
      status: item.status,
      dispatchDate: item.dispatchDate,
      totalAmount: Number(item.totalAmount ?? 0),
      loadingOrderId: item.loadingOrderId ?? undefined,
      loadingNo: item.loadingNo ?? undefined,
    })),
    relatedInvoices: invoiceRows.map((item) => ({
      id: item.id,
      publicId: Number(item.publicId),
      invoiceNo: item.invoiceNo,
      status: item.status,
      invoiceDate: item.invoiceDate,
      totalAmount: Number(item.totalAmount ?? 0),
      saleId: item.saleId ?? undefined,
      saleNo: item.saleNo ?? undefined,
      dispatchId: item.dispatchId ?? undefined,
      dispatchNo: item.dispatchNo ?? undefined,
    })),
    relatedSales: saleRows.map((item) => ({
      id: item.id,
      publicId: Number(item.publicId),
      saleNo: item.saleNo,
      status: item.status,
      saleDate: item.saleDate,
      totalAmount: Number(item.totalAmount ?? 0),
      paymentStatus: item.paymentStatus,
    })),
  };
}

export async function createSalesOrder(
  input: SaveSalesOrderInput,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => {
    const customer = await ensureCommercialCustomer(tx, input.customerId);
    await ensureCommercialLocation(tx, input.locationId);
    await ensureCommercialUser(tx, input.salesPersonId, "Sales person");
    await ensureCommercialUser(tx, input.assignedApproverId, "Assigned approver");

    const lines = await resolveCommercialLines(tx, {
      lines: input.items,
      channel: input.channel,
      transactionDate: input.requiredDeliveryDate ?? new Date().toISOString(),
      customerId: customer.id,
      locationId: input.locationId,
      customerGroup: customer.customerType ?? null,
    });
    const totals = computeCommercialTotals(lines);
    const orderId = randomUUID();
    const orderNo = await nextSalesDocumentNumber(tx, "SO", "Sales order");
    const requireApproval = Boolean(normalizeText(input.assignedApproverId));
    const approvalStatus = requireApproval ? "PENDING" : "NOT_REQUIRED";
    const status = requireApproval
      ? "PENDING_APPROVAL"
      : normalizeSubmittedOrderStatus(input.status);
    const currency = await getSalesDefaultCurrency(tx);

    await tx`
      INSERT INTO "SalesOrder" (
        id, "orderNo", "quotationId", "customerId", channel, "locationId", "priceListId",
        status, "approvalStatus", "requiredDeliveryDate", "salesPersonId", "paymentTerms",
        currency, subtotal, "discountAmount", "taxAmount", "totalAmount", "reservedAmount",
        "fulfilledAmount", remarks, "createdById", "updatedById", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${orderId},
        ${orderNo},
        ${normalizeText(input.quotationId)},
        ${customer.id},
        ${normalizeSalesChannel(input.channel)},
        ${input.locationId},
        ${deriveHeaderPriceListId(lines)},
        ${status},
        ${approvalStatus},
        ${normalizeText(input.requiredDeliveryDate)}::timestamptz,
        ${normalizeText(input.salesPersonId)},
        ${normalizeText(input.paymentTerms ?? customer.paymentTerms ?? null)},
        ${currency},
        ${totals.subtotal},
        ${totals.discountAmount},
        ${totals.taxAmount},
        ${totals.totalAmount},
        0,
        0,
        ${normalizeText(input.remarks)},
        ${actor.userId},
        ${actor.userId},
        false,
        NOW(),
        NOW()
      )
    `;

    await insertOrderItems(tx, orderId, lines);

    if (requireApproval) {
      await syncCommercialApproval(tx, {
        referenceType: "sales.order",
        referenceId: orderId,
        requestedById: actor.userId,
        assignedApproverId: normalizeText(input.assignedApproverId),
        requireApproval: true,
        comment: "Sales order awaiting approval",
      });
    }

    if (input.quotationId) {
      await tx`
        UPDATE "SalesQuotation"
        SET
          status = 'CONVERTED',
          "updatedById" = ${actor.userId},
          "updatedAt" = NOW()
        WHERE id = ${input.quotationId}
      `;
    }

    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "CREATE",
      recordId: orderId,
      referenceType: "sales.order",
      historyAction: status === "PENDING_APPROVAL" ? "SUBMITTED" : "CREATED",
      historyComment: `Sales order ${orderNo} created`,
      newValue: {
        orderNo,
        quotationId: normalizeText(input.quotationId),
        customerId: customer.id,
        channel: normalizeSalesChannel(input.channel),
        totalAmount: totals.totalAmount,
        approvalStatus,
      },
    });

    const pub = await tx<Array<{ publicId: number }>>`SELECT "publicId" FROM "SalesOrder" WHERE id = ${orderId} LIMIT 1`;
    return {
      id: orderId,
      publicId: Number(pub[0]?.publicId ?? 0),
      orderNo,
      status,
      approvalStatus,
      totalAmount: totals.totalAmount,
    };
  });
}

export async function updateSalesOrder(
  id: string,
  input: SaveSalesOrderInput,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => {
    const existing = await getOrderHeaderForUpdate(tx, id);
    if (!existing) {
      throw new Error("Sales order was not found");
    }
    if (["COMPLETED", "CANCELLED", "RESERVED", "PARTIALLY_RESERVED", "PARTIALLY_LOADED", "LOADED", "PARTIALLY_INVOICED"].includes(existing.status)) {
      throw new Error("Reserved, loaded, invoiced, completed, or cancelled orders cannot be edited");
    }

    const customer = await ensureCommercialCustomer(tx, input.customerId);
    await ensureCommercialLocation(tx, input.locationId);
    await ensureCommercialUser(tx, input.salesPersonId, "Sales person");
    await ensureCommercialUser(tx, input.assignedApproverId, "Assigned approver");

    const lines = await resolveCommercialLines(tx, {
      lines: input.items,
      channel: input.channel,
      transactionDate: input.requiredDeliveryDate ?? new Date().toISOString(),
      customerId: customer.id,
      locationId: input.locationId,
      customerGroup: customer.customerType ?? null,
    });
    const totals = computeCommercialTotals(lines);
    const requireApproval = Boolean(normalizeText(input.assignedApproverId));
    const approvalStatus =
      existing.approvalStatus === "APPROVED"
        ? "APPROVED"
        : requireApproval
          ? "PENDING"
          : "NOT_REQUIRED";
    const status =
      approvalStatus === "APPROVED"
        ? "APPROVED"
        : requireApproval
          ? "PENDING_APPROVAL"
          : normalizeSubmittedOrderStatus(input.status ?? existing.status);

    await tx`DELETE FROM "SalesOrderItem" WHERE "salesOrderId" = ${id}`;
    await insertOrderItems(tx, id, lines);

    await tx`
      UPDATE "SalesOrder"
      SET
        "quotationId" = ${normalizeText(input.quotationId)},
        "customerId" = ${customer.id},
        channel = ${normalizeSalesChannel(input.channel)},
        "locationId" = ${input.locationId},
        "priceListId" = ${deriveHeaderPriceListId(lines)},
        status = ${status},
        "approvalStatus" = ${approvalStatus},
        "requiredDeliveryDate" = ${normalizeText(input.requiredDeliveryDate)}::timestamptz,
        "salesPersonId" = ${normalizeText(input.salesPersonId)},
        "paymentTerms" = ${normalizeText(input.paymentTerms ?? customer.paymentTerms ?? null)},
        subtotal = ${totals.subtotal},
        "discountAmount" = ${totals.discountAmount},
        "taxAmount" = ${totals.taxAmount},
        "totalAmount" = ${totals.totalAmount},
        remarks = ${normalizeText(input.remarks)},
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await syncCommercialApproval(tx, {
      referenceType: "sales.order",
      referenceId: id,
      requestedById: actor.userId,
      assignedApproverId: normalizeText(input.assignedApproverId),
      requireApproval,
      comment: requireApproval ? "Sales order awaiting approval" : "Approval cleared",
    });

    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "UPDATE",
      recordId: id,
      referenceType: "sales.order",
      historyAction: "UPDATED",
      historyComment: `Sales order ${existing.orderNo} updated`,
      newValue: {
        orderNo: existing.orderNo,
        status,
        approvalStatus,
        totalAmount: totals.totalAmount,
      },
    });

    return {
      id,
      orderNo: existing.orderNo,
      status,
      approvalStatus,
      totalAmount: totals.totalAmount,
    };
  });
}

export async function approveSalesOrder(
  id: string,
  actor: { userId: string; userName: string },
  comment?: string | null,
) {
  return sql.begin(async (tx) => {
    const header = await getOrderHeaderForUpdate(tx, id);
    if (!header) {
      throw new Error("Sales order was not found");
    }

    await approveCommercialDocument(tx, "sales.order", id, actor.userId, comment);
    await tx`
      UPDATE "SalesOrder"
      SET
        status = 'APPROVED',
        "approvalStatus" = 'APPROVED',
        "approvedById" = ${actor.userId},
        "approvedAt" = NOW(),
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "APPROVE",
      recordId: id,
      referenceType: "sales.order",
      historyAction: "APPROVED",
      historyComment: `Sales order ${header.orderNo} approved`,
      newValue: { orderNo: header.orderNo, comment: normalizeText(comment) },
    });

    return { id, orderNo: header.orderNo, status: "APPROVED" as const };
  });
}

export async function rejectSalesOrder(
  id: string,
  actor: { userId: string; userName: string },
  comment?: string | null,
) {
  return sql.begin(async (tx) => {
    const header = await getOrderHeaderForUpdate(tx, id);
    if (!header) {
      throw new Error("Sales order was not found");
    }

    await rejectCommercialDocument(tx, "sales.order", id, actor.userId, comment);
    await tx`
      UPDATE "SalesOrder"
      SET
        status = 'DRAFT',
        "approvalStatus" = 'REJECTED',
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "REJECT",
      recordId: id,
      referenceType: "sales.order",
      historyAction: "REJECTED",
      historyComment: `Sales order ${header.orderNo} rejected`,
      newValue: { orderNo: header.orderNo, comment: normalizeText(comment) },
    });

    return { id, orderNo: header.orderNo, status: "DRAFT" as const };
  });
}

export async function convertQuotationToSalesOrder(
  quotationId: string,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => {
    const quotationRows = await tx<
      Array<{
        id: string;
        quotationNo: string;
        customerId: string;
        channel: string;
        locationId: string;
        salesPersonId: string | null;
        remarks: string | null;
        currency: string;
        status: string;
        priceListId: string | null;
      }>
    >`
      SELECT id, "quotationNo", "customerId", channel, "locationId", "salesPersonId", remarks, currency, status, "priceListId"
      FROM "SalesQuotation"
      WHERE id = ${quotationId}
        AND "isArchived" = false
      LIMIT 1
    `;
    const quotation = quotationRows[0];
    if (!quotation) {
      throw new Error("Quotation was not found");
    }
    if (quotation.status !== "ACCEPTED") {
      throw new Error("Only accepted quotations can be converted to sales orders");
    }

    const itemRows = await tx<
      Array<{
        itemId: string;
        unitId: string | null;
        qty: number;
        unitPrice: number;
        discountAmount: number;
        taxAmount: number;
        lineTotal: number;
        priceListItemId: string | null;
        remarks: string | null;
      }>
    >`
      SELECT "itemId", "unitId", qty, "unitPrice", "discountAmount", "taxAmount", "lineTotal", "priceListItemId", remarks
      FROM "SalesQuotationItem"
      WHERE "quotationId" = ${quotationId}
      ORDER BY "createdAt" ASC
    `;
    if (!itemRows.length) {
      throw new Error("Quotation has no lines to convert");
    }

    const orderId = randomUUID();
    const orderNo = await nextSalesDocumentNumber(tx, "SO", "Sales order");
    const subtotal = itemRows.reduce((sum, line) => sum + Number(line.qty ?? 0) * Number(line.unitPrice ?? 0), 0);
    const discountAmount = itemRows.reduce((sum, line) => sum + Number(line.discountAmount ?? 0), 0);
    const taxAmount = itemRows.reduce((sum, line) => sum + Number(line.taxAmount ?? 0), 0);
    const totalAmount = itemRows.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0);

    await tx`
      INSERT INTO "SalesOrder" (
        id, "orderNo", "quotationId", "customerId", channel, "locationId", "priceListId",
        status, "approvalStatus", "requiredDeliveryDate", "salesPersonId", "paymentTerms",
        currency, subtotal, "discountAmount", "taxAmount", "totalAmount", "reservedAmount",
        "fulfilledAmount", remarks, "createdById", "updatedById", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${orderId},
        ${orderNo},
        ${quotation.id},
        ${quotation.customerId},
        ${quotation.channel},
        ${quotation.locationId},
        ${quotation.priceListId},
        'APPROVED',
        'NOT_REQUIRED',
        NULL,
        ${quotation.salesPersonId},
        NULL,
        ${quotation.currency},
        ${Number(subtotal.toFixed(2))},
        ${Number(discountAmount.toFixed(2))},
        ${Number(taxAmount.toFixed(2))},
        ${Number(totalAmount.toFixed(2))},
        0,
        0,
        ${quotation.remarks},
        ${actor.userId},
        ${actor.userId},
        false,
        NOW(),
        NOW()
      )
    `;

    for (const line of itemRows) {
      await tx`
        INSERT INTO "SalesOrderItem" (
          id, "salesOrderId", "itemId", "unitId", "orderedQty", "reservedQty", "loadedQty", "deliveredQty",
          "returnedQty", "cancelledQty", "unitPrice", "discountAmount", "taxAmount", "lineTotal",
          "priceListItemId", remarks, "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${orderId},
          ${line.itemId},
          ${line.unitId},
          ${line.qty},
          0,
          0,
          0,
          0,
          0,
          ${line.unitPrice},
          ${line.discountAmount},
          ${line.taxAmount},
          ${line.lineTotal},
          ${line.priceListItemId},
          ${line.remarks},
          NOW(),
          NOW()
        )
      `;
    }

    await tx`
      UPDATE "SalesQuotation"
      SET
        status = 'CONVERTED',
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${quotationId}
    `;

    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "CONVERT_FROM_QUOTATION",
      recordId: orderId,
      referenceType: "sales.order",
      historyAction: "CREATED",
      historyComment: `Sales order ${orderNo} created from quotation ${quotation.quotationNo}`,
      newValue: { orderNo, quotationId },
    });

    return { id: orderId, orderNo, quotationId };
  });
}

export async function cancelSalesOrder(
  id: string,
  actor: { userId: string; userName: string },
  reason: string,
) {
  const cancellationReason = normalizeText(reason);
  if (!cancellationReason) {
    throw new Error("Cancellation reason is required");
  }

  return sql.begin(async (tx) => {
    const header = await getOrderHeaderForUpdate(tx, id);
    if (!header) {
      throw new Error("Sales order was not found");
    }
    if (["COMPLETED", "INVOICED", "CANCELLED"].includes(header.status)) {
      throw new Error("Completed, invoiced, or cancelled sales orders cannot be cancelled");
    }
    const downstream = await tx<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "LoadingOrder"
      WHERE "salesOrderId" = ${id}
        AND "isArchived" = false
        AND status <> 'CANCELLED'
    `;
    if (Number(downstream[0]?.count ?? 0) > 0) {
      throw new Error("Cancel active loading orders and release their reservations before cancelling this order");
    }

    await tx`
      UPDATE "SalesOrder"
      SET status = 'CANCELLED', remarks = CONCAT_WS(E'\n', remarks, ${`Cancellation: ${cancellationReason}`}),
          "updatedById" = ${actor.userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "CANCEL",
      recordId: id,
      referenceType: "sales.order",
      historyAction: "CANCELLED",
      historyComment: `Sales order ${header.orderNo} cancelled: ${cancellationReason}`,
      oldValue: { status: header.status },
      newValue: { status: "CANCELLED", reason: cancellationReason },
    });
    return { id, orderNo: header.orderNo, status: "CANCELLED" as const };
  });
}

export async function convertSalesOrderToLoading(
  salesOrderId: string,
  input: ConvertOrderToLoadingInput,
  actor: { userId: string; userName: string },
) {
  if (!input.loadingDate) {
    throw new Error("Loading date is required");
  }

  return sql.begin(async (tx) => {
    const header = await getOrderHeaderForUpdate(tx, salesOrderId);
    if (!header) {
      throw new Error("Sales order was not found");
    }
    if (!["APPROVED", "PARTIALLY_RESERVED", "RESERVED", "PARTIALLY_LOADED"].includes(header.status)) {
      throw new Error("Only approved or open sales orders can be converted to loading");
    }

    const orderItems = await getOrderItemsForConversion(tx, salesOrderId);
    const requested = new Map(
      (input.lines ?? [])
        .map((line) => [String(line.salesOrderItemId ?? "").trim(), Number(line.quantity ?? 0)] as const)
        .filter(([id, quantity]) => id.length > 0 && quantity > 0),
    );

    const selectedLines = orderItems
      .map((line) => {
        const remaining = Math.max(Number(line.orderedQty ?? 0) - Number(line.reservedQty ?? 0) - Number(line.deliveredQty ?? 0) - Number(line.cancelledQty ?? 0), 0);
        if (!(remaining > 0)) {
          return null;
        }
        const quantity = requested.size > 0 ? Number(requested.get(line.id) ?? 0) : remaining;
        if (!(quantity > 0)) {
          return null;
        }
        if (quantity > remaining) {
          throw new Error("Loading quantity cannot exceed remaining open order quantity");
        }
        return { ...line, quantity };
      })
      .filter(Boolean) as Array<{
      id: string;
      itemId: string;
      unitId: string | null;
      quantity: number;
      unitPrice: number;
      priceListItemId: string | null;
      remarks: string | null;
    }>;

    if (!selectedLines.length) {
      throw new Error("No open order quantities remain for loading");
    }

    const loadingId = randomUUID();
    const loadingNo = await nextSalesDocumentNumber(tx, "LOAD", "Sales loading order");
    const totalAmount = selectedLines.reduce(
      (sum, line) => sum + Number((line.quantity * Number(line.unitPrice ?? 0)).toFixed(2)),
      0,
    );

    await tx`
      INSERT INTO "LoadingOrder" (
        id, "loadingNo", "salesOrderId", "loadingDate", channel, status, "fromLocationId", "destinationLocationId",
        "agentId", "customerId", "truckId", "driverId", "tripId", "routeName", remarks,
        subtotal, "taxAmount", "discountAmount", "totalAmount", "reservedAt", "reservedById",
        "createdById", "updatedById", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${loadingId},
        ${loadingNo},
        ${salesOrderId},
        ${input.loadingDate}::timestamptz,
        ${header.channel},
        'POSTED'::"LoadingOrderStatus",
        ${header.locationId},
        ${normalizeText(input.destinationLocationId)},
        ${normalizeText(input.agentId)},
        ${normalizeText(input.customerId) ?? header.customerId},
        ${normalizeText(input.truckId)},
        ${normalizeText(input.driverId)},
        ${normalizeText(input.tripId)},
        ${normalizeText(input.routeName)},
        ${normalizeText(input.remarks)},
        ${Number(totalAmount.toFixed(2))},
        0,
        0,
        ${Number(totalAmount.toFixed(2))},
        NOW(),
        ${actor.userId},
        ${actor.userId},
        ${actor.userId},
        false,
        NOW(),
        NOW()
      )
    `;

    for (const line of selectedLines) {
      const loadingLineId = randomUUID();
      await reserveStock(
        {
          sourceType: "sales.loading",
          sourceId: loadingId,
          sourceItemId: loadingLineId,
          itemId: line.itemId,
          locationId: header.locationId,
          quantity: line.quantity,
          createdById: actor.userId,
          remarks: line.remarks,
        },
        { tx },
      );

      await tx`
        INSERT INTO "LoadingOrderItem" (
          id, "loadingOrderId", "salesOrderItemId", "itemId", "unitId", "priceListId", "priceListItemId",
          quantity, "reservedQty", "issuedQty", "unitPrice", "lineTotal", "taxAmount", "discountAmount",
          remarks, "createdAt", "updatedAt"
        )
        VALUES (
          ${loadingLineId},
          ${loadingId},
          ${line.id},
          ${line.itemId},
          ${line.unitId},
          ${header.priceListId ?? null},
          ${line.priceListItemId},
          ${line.quantity},
          ${line.quantity},
          0,
          ${line.unitPrice},
          ${Number((line.quantity * Number(line.unitPrice ?? 0)).toFixed(2))},
          0,
          0,
          ${line.remarks},
          NOW(),
          NOW()
        )
      `;
    }

    await syncSalesOrderProgress(tx, salesOrderId);
    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "CONVERT_LOADING",
      recordId: salesOrderId,
      referenceType: "sales.order",
      historyAction: "RESERVED",
      historyComment: `Sales order ${header.orderNo} converted to loading ${loadingNo}`,
      newValue: { loadingId, loadingNo, lineCount: selectedLines.length },
    });

    return { id: loadingId, loadingNo, salesOrderId };
  });
}

export async function convertSalesOrderToInvoice(
  salesOrderId: string,
  input: ConvertOrderToInvoiceInput,
  actor: { userId: string; userName: string },
) {
  if (!input.saleDate) {
    throw new Error("Sale date is required");
  }

  return sql.begin(async (tx) => {
    const header = await getOrderHeaderForUpdate(tx, salesOrderId);
    if (!header) {
      throw new Error("Sales order was not found");
    }
    if (!["APPROVED", "PARTIALLY_RESERVED", "RESERVED", "PARTIALLY_LOADED", "LOADED", "PARTIALLY_DISPATCHED", "DISPATCHED", "PARTIALLY_INVOICED"].includes(header.status)) {
      throw new Error("Only open sales orders can be converted to invoice");
    }

    const orderItems = await getOrderItemsForConversion(tx, salesOrderId);
    const requested = new Map(
      (input.lines ?? [])
        .map((line) => [String(line.salesOrderItemId ?? "").trim(), Number(line.quantity ?? 0)] as const)
        .filter(([id, quantity]) => id.length > 0 && quantity > 0),
    );

    const saleLines = [] as Array<{
      salesOrderItemId: string;
      itemId: string;
      unitId: string | null;
      quantity: number;
      unitPrice: number;
      priceListId: string | null;
      priceListItemId: string | null;
      lineTotal: number;
      remarks: string | null;
      inventoryMovementId: string;
    }>;

    for (const line of orderItems) {
      const remaining = Math.max(Number(line.orderedQty ?? 0) - Number(line.deliveredQty ?? 0) - Number(line.cancelledQty ?? 0), 0);
      if (!(remaining > 0)) {
        continue;
      }
      const quantity = requested.size > 0 ? Number(requested.get(line.id) ?? 0) : remaining;
      if (!(quantity > 0)) {
        continue;
      }
      if (quantity > remaining) {
        throw new Error("Invoice quantity cannot exceed remaining open order quantity");
      }

      const balanceRows = await tx<Array<{ averageCost: number; availableQuantity: number }>>`
        SELECT COALESCE("averageCost", 0) AS "averageCost", COALESCE("availableQuantity", 0) AS "availableQuantity"
        FROM "StockBalance"
        WHERE "itemId" = ${line.itemId}
          AND "locationId" = ${header.locationId}
          AND "isArchived" = false
        LIMIT 1
      `;
      const balance = balanceRows[0];
      if (!balance || Number(balance.availableQuantity ?? 0) < quantity) {
        throw new Error("Invoice quantity cannot exceed available stock");
      }

      const movement = await issueForSales(
        {
          itemId: line.itemId,
          locationId: header.locationId,
          sourceModule: "sales.order",
          sourceDocumentId: salesOrderId,
          qtyIn: quantity,
          qtyOut: 0,
          unitCost: Number(balance.averageCost ?? 0),
          remarks: line.remarks ?? undefined,
          createdById: actor.userId,
        },
        { tx },
      );

      const lineTotal = Number((quantity * Number(line.unitPrice ?? 0)).toFixed(2));
      saleLines.push({
        salesOrderItemId: line.id,
        itemId: line.itemId,
        unitId: line.unitId,
        quantity,
        unitPrice: Number(line.unitPrice ?? 0),
        priceListId: header.priceListId ?? null,
        priceListItemId: line.priceListItemId,
        lineTotal,
        remarks: line.remarks,
        inventoryMovementId: movement.movementId,
      });
    }

    if (!saleLines.length) {
      throw new Error("No open order quantities remain for invoicing");
    }

    const saleId = randomUUID();
    const saleNo = await nextSalesDocumentNumber(tx, "SALE", "Sales invoice");
    const subtotal = saleLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const customerId = normalizeText(input.customerId) ?? header.customerId;
    const paymentStatus = input.paymentMethod ? "PAID" : "UNPAID";

    await tx`
      INSERT INTO "Sale" (
        id, "saleNo", "salesOrderId", "saleDate", channel, "locationId", "customerId",
        status, subtotal, "taxAmount", "discountAmount", "totalAmount", "paymentStatus",
        "paymentMethod", "bankAccountId", "referenceNo", notes, "createdById", "postedById",
        "postedAt", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${saleId},
        ${saleNo},
        ${salesOrderId},
        ${input.saleDate}::timestamptz,
        ${header.channel},
        ${header.locationId},
        ${customerId},
        'POSTED',
        ${Number(subtotal.toFixed(2))},
        0,
        0,
        ${Number(subtotal.toFixed(2))},
        ${paymentStatus},
        ${input.paymentMethod ?? null}::"PaymentMethod",
        ${normalizeText(input.bankAccountId)},
        ${normalizeText(input.referenceNo)},
        ${normalizeText(input.notes) ?? `Created from sales order ${header.orderNo}`},
        ${actor.userId},
        ${actor.userId},
        NOW(),
        false,
        NOW(),
        NOW()
      )
    `;

    for (const line of saleLines) {
      await tx`
        INSERT INTO "SaleItem" (
          id, "saleId", "salesOrderItemId", "itemId", "unitId", "priceListId", "priceListItemId", quantity,
          "unitPrice", "lineTotal", "taxAmount", "discountAmount", "inventoryMovementId", remarks,
          "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${saleId},
          ${line.salesOrderItemId},
          ${line.itemId},
          ${line.unitId},
          ${line.priceListId},
          ${line.priceListItemId},
          ${line.quantity},
          ${line.unitPrice},
          ${line.lineTotal},
          0,
          0,
          ${line.inventoryMovementId},
          ${line.remarks},
          NOW(),
          NOW()
        )
      `;
    }

    if (input.paymentMethod) {
      await tx`
        INSERT INTO "SalesPayment" (
          id, "saleId", "paymentDate", "paymentMethod", "bankAccountId", amount, "referenceNo",
          status, "createdById", "isArchived", "createdAt"
        )
        VALUES (
          ${randomUUID()},
          ${saleId},
          ${input.saleDate}::timestamptz,
          ${input.paymentMethod}::"PaymentMethod",
          ${normalizeText(input.bankAccountId)},
          ${Number(subtotal.toFixed(2))},
          ${normalizeText(input.referenceNo)},
          'POSTED',
          ${actor.userId},
          false,
          NOW()
        )
      `;
    }

    await syncPostedSaleFinance(tx, { saleId, userId: actor.userId });
    const invoice = await createSalesInvoiceFromSaleInTransaction(
      tx,
      {
        saleId,
        invoiceDate: input.saleDate,
        remarks: `Invoice created from sales order ${header.orderNo}`,
      },
      actor,
    );
    await syncSalesOrderProgress(tx, salesOrderId);

    await createCommercialHistoryAndAudit(tx, {
      userId: actor.userId,
      module: "sales.order",
      action: "CONVERT_INVOICE",
      recordId: salesOrderId,
      referenceType: "sales.order",
      historyAction: "INVOICED",
      historyComment: `Sales order ${header.orderNo} converted to invoice ${invoice.invoiceNo}`,
      newValue: { saleId, saleNo, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, totalAmount: subtotal },
    });

    return { id: invoice.id, invoiceNo: invoice.invoiceNo, saleId, saleNo, salesOrderId };
  });
}
