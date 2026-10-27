import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  nextSalesDocumentNumber,
  normalizeSalesChannel,
  writeSalesAudit,
  writeSalesHistory,
  type SalesChannel,
  type Tx,
} from "@/services/sales/sales-shared.service";

export type DispatchStatus = "DRAFT" | "POSTED" | "CANCELLED";

type DispatchScope = {
  accessibleLocationIds?: string[] | null;
  channel?: string | null;
  tripId?: string | null;
};

type PostedDispatchLineInput = {
  loadingOrderItemId: string;
  salesOrderItemId?: string | null;
  saleItemId?: string | null;
  itemId: string;
  unitId?: string | null;
  priceListId?: string | null;
  priceListItemId?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxAmount?: number;
  discountAmount?: number;
  inventoryMovementId?: string | null;
  remarks?: string | null;
};

type PostedDispatchHeaderInput = {
  loadingOrderId: string;
  loadingNo: string;
  salesOrderId?: string | null;
  saleId?: string | null;
  channel: string;
  locationId: string;
  destinationLocationId?: string | null;
  customerId?: string | null;
  agentId?: string | null;
  truckId?: string | null;
  driverId?: string | null;
  tripId?: string | null;
  routeName?: string | null;
  remarks?: string | null;
};

export interface SalesDispatchSummary {
  id: string;
  publicId: number;
  dispatchNo: string;
  dispatchDate: string;
  channel: SalesChannel;
  status: DispatchStatus;
  locationId: string;
  locationCode: string;
  locationName: string;
  destinationLocationId?: string;
  destinationLocationCode?: string;
  destinationLocationName?: string;
  customerId?: string;
  customerName?: string;
  agentId?: string;
  agentName?: string;
  truckId?: string;
  truckLabel?: string;
  driverId?: string;
  driverName?: string;
  tripId?: string;
  tripLabel?: string;
  loadingOrderId: string;
  loadingNo: string;
  saleId?: string;
  saleNo?: string;
  invoiceId?: string;
  invoiceNo?: string;
  routeName?: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  postedAt?: string;
}

export interface SalesDispatchDetail extends SalesDispatchSummary {
  remarks?: string;
  postedById?: string;
  items: Array<{
    id: string;
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
    priceListCode?: string;
    inventoryMovementId?: string;
    loadingOrderItemId?: string;
    salesOrderItemId?: string;
    saleItemId?: string;
    remarks?: string;
  }>;
}

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeDispatchStatus(value?: string | null): DispatchStatus {
  const normalized = String(value ?? "POSTED").trim().toUpperCase();
  switch (normalized) {
    case "DRAFT":
    case "CANCELLED":
      return normalized;
    default:
      return "POSTED";
  }
}

export async function recordPostedDispatch(
  tx: Tx,
  header: PostedDispatchHeaderInput,
  lines: PostedDispatchLineInput[],
  actor: { userId: string; userName: string },
) {
  const dispatchId = randomUUID();
  const dispatchNo = await nextSalesDocumentNumber(tx, "DSP", "Sales dispatch");
  const subtotal = Number(lines.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0).toFixed(2));

  await tx`
    INSERT INTO "SalesDispatch" (
      id, "dispatchNo", "loadingOrderId", "salesOrderId", "saleId", "dispatchDate",
      channel, "locationId", "destinationLocationId", "customerId", "agentId", "truckId",
      "driverId", "tripId", "routeName", status, subtotal, "taxAmount", "discountAmount",
      "totalAmount", "postedAt", "postedById", remarks, "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${dispatchId},
      ${dispatchNo},
      ${header.loadingOrderId},
      ${header.salesOrderId ?? null},
      ${header.saleId ?? null},
      NOW(),
      ${normalizeSalesChannel(header.channel)},
      ${header.locationId},
      ${header.destinationLocationId ?? null},
      ${header.customerId ?? null},
      ${header.agentId ?? null},
      ${header.truckId ?? null},
      ${header.driverId ?? null},
      ${header.tripId ?? null},
      ${normalizeText(header.routeName)},
      'POSTED',
      ${subtotal},
      0,
      0,
      ${subtotal},
      NOW(),
      ${actor.userId},
      ${normalizeText(header.remarks) ?? `Dispatched from loading ${header.loadingNo}`},
      false,
      NOW(),
      NOW()
    )
  `;

  for (const line of lines) {
    await tx`
      INSERT INTO "SalesDispatchItem" (
        id, "dispatchId", "loadingOrderItemId", "salesOrderItemId", "saleItemId", "itemId",
        "unitId", "priceListId", "priceListItemId", quantity, "unitPrice", "lineTotal",
        "taxAmount", "discountAmount", "inventoryMovementId", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${dispatchId},
        ${line.loadingOrderItemId},
        ${line.salesOrderItemId ?? null},
        ${line.saleItemId ?? null},
        ${line.itemId},
        ${line.unitId ?? null},
        ${line.priceListId ?? null},
        ${line.priceListItemId ?? null},
        ${line.quantity},
        ${line.unitPrice},
        ${line.lineTotal},
        ${Number(line.taxAmount ?? 0)},
        ${Number(line.discountAmount ?? 0)},
        ${line.inventoryMovementId ?? null},
        ${normalizeText(line.remarks)},
        NOW(),
        NOW()
      )
    `;
  }

  await writeSalesAudit(tx, actor.userId, "sales.dispatch", "POST", dispatchId, {
    dispatchNo,
    loadingOrderId: header.loadingOrderId,
    loadingNo: header.loadingNo,
    saleId: header.saleId ?? null,
    channel: normalizeSalesChannel(header.channel),
    totalAmount: subtotal,
    lineCount: lines.length,
  });
  await writeSalesHistory(
    tx,
    "sales.dispatch",
    dispatchId,
    "POSTED",
    actor.userId,
    `Dispatch ${dispatchNo} posted from loading ${header.loadingNo}`,
  );

  return {
    id: dispatchId,
    dispatchNo,
    totalAmount: subtotal,
  };
}

export async function listDispatchesForLoadingOrder(
  loadingOrderId: string,
  tx: Tx | typeof sql = sql,
) {
  const rows = await tx<Array<{
    id: string;
    dispatchNo: string;
    dispatchDate: string;
    status: string;
    saleId: string | null;
    saleNo: string | null;
    invoiceId: string | null;
    invoiceNo: string | null;
    totalAmount: number;
    totalQuantity: number;
    postedAt: string | null;
  }>>`
    SELECT
      sd.id,
      sd."publicId",
      sd."dispatchNo",
      sd."dispatchDate"::text AS "dispatchDate",
      sd.status::text AS status,
      sd."saleId",
      s."saleNo",
      si.id AS "invoiceId",
      si."invoiceNo",
      sd."totalAmount",
      COALESCE(SUM(sdi.quantity), 0)::double precision AS "totalQuantity",
      sd."postedAt"::text AS "postedAt"
    FROM "SalesDispatch" sd
    LEFT JOIN "SalesDispatchItem" sdi ON sdi."dispatchId" = sd.id
    LEFT JOIN "Sale" s ON s.id = sd."saleId"
    LEFT JOIN "SalesInvoice" si ON si."dispatchId" = sd.id AND si."isArchived" = false
    WHERE sd."loadingOrderId" = ${loadingOrderId}
      AND sd."isArchived" = false
    GROUP BY sd.id, s.id, si.id
    ORDER BY sd."dispatchDate" DESC, sd."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    dispatchNo: row.dispatchNo,
    dispatchDate: row.dispatchDate,
    status: normalizeDispatchStatus(row.status),
    saleId: row.saleId ?? undefined,
    saleNo: row.saleNo ?? undefined,
    invoiceId: row.invoiceId ?? undefined,
    invoiceNo: row.invoiceNo ?? undefined,
    totalAmount: Number(row.totalAmount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    postedAt: row.postedAt ?? undefined,
  }));
}

export async function listSalesDispatches(scope: DispatchScope = {}): Promise<SalesDispatchSummary[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const channel = scope.channel ? normalizeSalesChannel(scope.channel) : null;
  const tripId = normalizeText(scope.tripId);
  const rows = await sql<Array<{
    id: string;
    dispatchNo: string;
    dispatchDate: string;
    channel: string;
    status: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    destinationLocationId: string | null;
    destinationLocationCode: string | null;
    destinationLocationName: string | null;
    customerId: string | null;
    customerName: string | null;
    agentId: string | null;
    agentName: string | null;
    truckId: string | null;
    truckCode: string | null;
    truckPlateNumber: string | null;
    truckName: string | null;
    driverId: string | null;
    driverCode: string | null;
    driverName: string | null;
    tripId: string | null;
    tripNo: string | null;
    routeName: string | null;
    loadingOrderId: string;
    loadingNo: string;
    saleId: string | null;
    saleNo: string | null;
    invoiceId: string | null;
    invoiceNo: string | null;
    totalAmount: number;
    postedAt: string | null;
    itemCount: number;
    totalQuantity: number;
  }>>`
    SELECT
      sd.id,
      sd."publicId",
      sd."dispatchNo",
      sd."dispatchDate"::text AS "dispatchDate",
      sd.channel,
      sd.status::text AS status,
      sd."locationId",
      l."locationCode",
      l."locationName",
      sd."destinationLocationId",
      dl."locationCode" AS "destinationLocationCode",
      dl."locationName" AS "destinationLocationName",
      sd."customerId",
      customer.name AS "customerName",
      sd."agentId",
      agent.name AS "agentName",
      sd."truckId",
      vehicle."vehicleCode" AS "truckCode",
      vehicle."plateNumber" AS "truckPlateNumber",
      vehicle."vehicleName" AS "truckName",
      sd."driverId",
      driver."driverCode",
      driver."fullName" AS "driverName",
      sd."tripId",
      trip."tripNo",
      sd."routeName",
      sd."loadingOrderId",
      lo."loadingNo",
      sd."saleId",
      s."saleNo",
      si.id AS "invoiceId",
      si."invoiceNo",
      sd."totalAmount",
      sd."postedAt"::text AS "postedAt",
      COUNT(sdi.id)::int AS "itemCount",
      COALESCE(SUM(sdi.quantity), 0)::double precision AS "totalQuantity"
    FROM "SalesDispatch" sd
    INNER JOIN "Location" l ON l.id = sd."locationId"
    INNER JOIN "LoadingOrder" lo ON lo.id = sd."loadingOrderId"
    LEFT JOIN "Location" dl ON dl.id = sd."destinationLocationId"
    LEFT JOIN "Customer" customer ON customer.id = sd."customerId"
    LEFT JOIN "Customer" agent ON agent.id = sd."agentId"
    LEFT JOIN "Vehicle" vehicle ON vehicle.id = sd."truckId"
    LEFT JOIN "FleetDriver" driver ON driver.id = sd."driverId"
    LEFT JOIN "FleetTrip" trip ON trip.id = sd."tripId"
    LEFT JOIN "Sale" s ON s.id = sd."saleId"
    LEFT JOIN "SalesInvoice" si ON si."dispatchId" = sd.id AND si."isArchived" = false
    LEFT JOIN "SalesDispatchItem" sdi ON sdi."dispatchId" = sd.id
    WHERE sd."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR sd."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      AND (${channel}::text IS NULL OR sd.channel = ${channel})
      AND (${tripId}::text IS NULL OR sd."tripId" = ${tripId})
    GROUP BY sd.id, l.id, dl.id, customer.id, agent.id, vehicle.id, driver.id, trip.id, lo.id, s.id, si.id
    ORDER BY sd."dispatchDate" DESC, sd."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    dispatchNo: row.dispatchNo,
    dispatchDate: row.dispatchDate,
    channel: normalizeSalesChannel(row.channel),
    status: normalizeDispatchStatus(row.status),
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    destinationLocationId: row.destinationLocationId ?? undefined,
    destinationLocationCode: row.destinationLocationCode ?? undefined,
    destinationLocationName: row.destinationLocationName ?? undefined,
    customerId: row.customerId ?? undefined,
    customerName: row.customerName ?? undefined,
    agentId: row.agentId ?? undefined,
    agentName: row.agentName ?? undefined,
    truckId: row.truckId ?? undefined,
    truckLabel: row.truckCode ? `${row.truckCode} - ${row.truckPlateNumber ?? row.truckName ?? "Truck"}` : undefined,
    driverId: row.driverId ?? undefined,
    driverName: row.driverCode ? `${row.driverCode} - ${row.driverName ?? "Driver"}` : undefined,
    tripId: row.tripId ?? undefined,
    tripLabel: row.tripNo ? `${row.tripNo}${row.routeName ? ` - ${row.routeName}` : ""}` : undefined,
    loadingOrderId: row.loadingOrderId,
    loadingNo: row.loadingNo,
    saleId: row.saleId ?? undefined,
    saleNo: row.saleNo ?? undefined,
    invoiceId: row.invoiceId ?? undefined,
    invoiceNo: row.invoiceNo ?? undefined,
    routeName: row.routeName ?? undefined,
    itemCount: Number(row.itemCount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    postedAt: row.postedAt ?? undefined,
  }));
}

export async function getSalesDispatchById(
  id: string,
  scope: DispatchScope = {},
): Promise<SalesDispatchDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<Array<{
    id: string;
    dispatchNo: string;
    dispatchDate: string;
    channel: string;
    status: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    destinationLocationId: string | null;
    destinationLocationCode: string | null;
    destinationLocationName: string | null;
    customerId: string | null;
    customerName: string | null;
    agentId: string | null;
    agentName: string | null;
    truckId: string | null;
    truckCode: string | null;
    truckPlateNumber: string | null;
    truckName: string | null;
    driverId: string | null;
    driverCode: string | null;
    driverName: string | null;
    tripId: string | null;
    tripNo: string | null;
    routeName: string | null;
    loadingOrderId: string;
    loadingNo: string;
    saleId: string | null;
    saleNo: string | null;
    invoiceId: string | null;
    invoiceNo: string | null;
    totalAmount: number;
    postedAt: string | null;
    remarks: string | null;
    postedById: string | null;
    itemCount: number;
    totalQuantity: number;
  }>>`
    SELECT
      sd.id,
      sd."publicId",
      sd."dispatchNo",
      sd."dispatchDate"::text AS "dispatchDate",
      sd.channel,
      sd.status::text AS status,
      sd."locationId",
      l."locationCode",
      l."locationName",
      sd."destinationLocationId",
      dl."locationCode" AS "destinationLocationCode",
      dl."locationName" AS "destinationLocationName",
      sd."customerId",
      customer.name AS "customerName",
      sd."agentId",
      agent.name AS "agentName",
      sd."truckId",
      vehicle."vehicleCode" AS "truckCode",
      vehicle."plateNumber" AS "truckPlateNumber",
      vehicle."vehicleName" AS "truckName",
      sd."driverId",
      driver."driverCode",
      driver."fullName" AS "driverName",
      sd."tripId",
      trip."tripNo",
      sd."routeName",
      sd."loadingOrderId",
      lo."loadingNo",
      sd."saleId",
      s."saleNo",
      si.id AS "invoiceId",
      si."invoiceNo",
      sd."totalAmount",
      sd."postedAt"::text AS "postedAt",
      sd.remarks,
      sd."postedById",
      COUNT(sdi.id)::int AS "itemCount",
      COALESCE(SUM(sdi.quantity), 0)::double precision AS "totalQuantity"
    FROM "SalesDispatch" sd
    INNER JOIN "Location" l ON l.id = sd."locationId"
    INNER JOIN "LoadingOrder" lo ON lo.id = sd."loadingOrderId"
    LEFT JOIN "Location" dl ON dl.id = sd."destinationLocationId"
    LEFT JOIN "Customer" customer ON customer.id = sd."customerId"
    LEFT JOIN "Customer" agent ON agent.id = sd."agentId"
    LEFT JOIN "Vehicle" vehicle ON vehicle.id = sd."truckId"
    LEFT JOIN "FleetDriver" driver ON driver.id = sd."driverId"
    LEFT JOIN "FleetTrip" trip ON trip.id = sd."tripId"
    LEFT JOIN "Sale" s ON s.id = sd."saleId"
    LEFT JOIN "SalesInvoice" si ON si."dispatchId" = sd.id AND si."isArchived" = false
    LEFT JOIN "SalesDispatchItem" sdi ON sdi."dispatchId" = sd.id
    WHERE ${isPublicIdParam(id) ? sql`sd."publicId" = ${Number(id)}` : sql`sd.id = ${id}`}
      AND sd."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR sd."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    GROUP BY sd.id, l.id, dl.id, customer.id, agent.id, vehicle.id, driver.id, trip.id, lo.id, s.id, si.id
    LIMIT 1
  `;

  const header = headerRows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const itemRows = await sql<Array<{
    id: string;
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
    priceListCode: string | null;
    inventoryMovementId: string | null;
    loadingOrderItemId: string | null;
    salesOrderItemId: string | null;
    saleItemId: string | null;
    remarks: string | null;
  }>>`
    SELECT
      sdi.id,
      sdi."itemId",
      i."itemCode",
      i."itemName",
      sdi."unitId",
      u.code AS "uomCode",
      u.name AS "uomName",
      sdi.quantity,
      sdi."unitPrice",
      sdi."lineTotal",
      sdi."taxAmount",
      sdi."discountAmount",
      sdi."priceListId",
      sdi."priceListItemId",
      pl.code AS "priceListCode",
      sdi."inventoryMovementId",
      sdi."loadingOrderItemId",
      sdi."salesOrderItemId",
      sdi."saleItemId",
      sdi.remarks
    FROM "SalesDispatchItem" sdi
    INNER JOIN "Item" i ON i.id = sdi."itemId"
    LEFT JOIN "Unit" u ON u.id = sdi."unitId"
    LEFT JOIN "PriceList" pl ON pl.id = sdi."priceListId"
    WHERE sdi."dispatchId" = ${documentId}
    ORDER BY sdi."createdAt" ASC
  `;

  return {
    id: header.id,
    dispatchNo: header.dispatchNo,
    dispatchDate: header.dispatchDate,
    channel: normalizeSalesChannel(header.channel),
    status: normalizeDispatchStatus(header.status),
    locationId: header.locationId,
    locationCode: header.locationCode,
    locationName: header.locationName,
    destinationLocationId: header.destinationLocationId ?? undefined,
    destinationLocationCode: header.destinationLocationCode ?? undefined,
    destinationLocationName: header.destinationLocationName ?? undefined,
    customerId: header.customerId ?? undefined,
    customerName: header.customerName ?? undefined,
    agentId: header.agentId ?? undefined,
    agentName: header.agentName ?? undefined,
    truckId: header.truckId ?? undefined,
    truckLabel: header.truckCode ? `${header.truckCode} - ${header.truckPlateNumber ?? header.truckName ?? "Truck"}` : undefined,
    driverId: header.driverId ?? undefined,
    driverName: header.driverCode ? `${header.driverCode} - ${header.driverName ?? "Driver"}` : undefined,
    tripId: header.tripId ?? undefined,
    tripLabel: header.tripNo ? `${header.tripNo}${header.routeName ? ` - ${header.routeName}` : ""}` : undefined,
    loadingOrderId: header.loadingOrderId,
    loadingNo: header.loadingNo,
    saleId: header.saleId ?? undefined,
    saleNo: header.saleNo ?? undefined,
    invoiceId: header.invoiceId ?? undefined,
    invoiceNo: header.invoiceNo ?? undefined,
    routeName: header.routeName ?? undefined,
    itemCount: Number(header.itemCount ?? 0),
    totalQuantity: Number(header.totalQuantity ?? 0),
    totalAmount: Number(header.totalAmount ?? 0),
    postedAt: header.postedAt ?? undefined,
    remarks: header.remarks ?? undefined,
    postedById: header.postedById ?? undefined,
    items: itemRows.map((row) => ({
      id: row.id,
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
      priceListCode: row.priceListCode ?? undefined,
      inventoryMovementId: row.inventoryMovementId ?? undefined,
      loadingOrderItemId: row.loadingOrderItemId ?? undefined,
      salesOrderItemId: row.salesOrderItemId ?? undefined,
      saleItemId: row.saleItemId ?? undefined,
      remarks: row.remarks ?? undefined,
    })),
  };
}
