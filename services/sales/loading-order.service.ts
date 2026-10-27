import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  getReservationBySource,
  issueReservedStock,
  releaseReservation,
  reserveStock,
  updateReservation,
} from "@/services/inventory/reservation.service";
import { syncPostedSaleFinance } from "@/services/sales/sales-finance.service";
import {
  listDispatchesForLoadingOrder,
  recordPostedDispatch,
} from "@/services/sales/sales-dispatch.service";
import { syncSalesOrderProgress } from "@/services/sales/sales-order-allocation.service";
import {
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  normalizeSalesChannel,
  writeSalesAudit,
  writeSalesHistory,
  type SalesChannel,
  type Tx,
} from "@/services/sales/sales-shared.service";

export type LoadingOrderStatus =
  | "DRAFT"
  | "POSTED"
  | "PARTIALLY_CONFIRMED"
  | "CONFIRMED"
  | "CANCELLED";

interface LoadingScope {
  accessibleLocationIds?: string[] | null;
  channel?: string | null;
  tripId?: string | null;
}

export interface LoadingOrderLineInput {
  id?: string;
  itemId: string;
  unitId?: string | null;
  priceListId?: string | null;
  priceListItemId?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  remarks?: string | null;
}

export interface SaveLoadingOrderInput {
  loadingDate: string;
  channel: string;
  fromLocationId: string;
  destinationLocationId?: string | null;
  agentId?: string | null;
  customerId?: string | null;
  truckId?: string | null;
  driverId?: string | null;
  tripId?: string | null;
  routeName?: string | null;
  remarks?: string | null;
  status?: LoadingOrderStatus;
  cancellationReason?: string | null;
  lines: LoadingOrderLineInput[];
}

export interface LoadingOrderSummary {
  id: string;
  publicId: number;
  loadingNo: string;
  loadingDate: string;
  channel: SalesChannel;
  fromLocationId: string;
  fromLocationCode: string;
  fromLocationName: string;
  destinationLocationId?: string;
  destinationLocationCode?: string;
  destinationLocationName?: string;
  agentId?: string;
  agentName?: string;
  customerId?: string;
  customerName?: string;
  truckId?: string;
  truckLabel?: string;
  driverId?: string;
  driverName?: string;
  tripId?: string;
  tripLabel?: string;
  routeName?: string;
  status: LoadingOrderStatus;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  reservedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

export interface LoadingOrderDetail extends LoadingOrderSummary {
  remarks?: string;
  createdById: string;
  reservedById?: string;
  confirmedById?: string;
  cancelledById?: string;
  cancellationReason?: string;
  truckLabel?: string;
  driverName?: string;
  tripLabel?: string;
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId?: string;
    uomCode?: string;
    uomName?: string;
    quantity: number;
    reservedQty: number;
    issuedQty: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
    discountAmount: number;
    remarks?: string;
    priceListId?: string;
    priceListItemId?: string;
    priceListCode?: string;
    reservationStatus?: string;
    reservationNo?: string;
  }>;
  reservations: Array<{
    id: string;
    reservationNo: string;
    sourceItemId: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    quantity: number;
    releasedQty: number;
    issuedQty: number;
    activeQty: number;
    status: string;
    remarks?: string;
  }>;
  dispatches: Array<{
    id: string;
    dispatchNo: string;
    dispatchDate: string;
    status: string;
    saleId?: string;
    saleNo?: string;
    totalAmount: number;
    totalQuantity: number;
    postedAt?: string;
  }>;
}

type Counterparty = {
  id: string;
  customerCode: string;
  name: string;
  customerType: string | null;
  isActive: boolean;
};

type FleetVehicle = {
  id: string;
  vehicleCode: string;
  plateNumber: string;
  vehicleName: string;
  isActive: boolean;
};

type FleetDriverRow = {
  id: string;
  driverCode: string;
  fullName: string;
  isActive: boolean;
};

type FleetTripRow = {
  id: string;
  tripNo: string;
  routeName: string;
  vehicleId: string;
  driverId: string | null;
  fromLocationId: string | null;
  destinationId: string | null;
  isActive: boolean;
};

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeLoadingStatus(value?: string | null): LoadingOrderStatus {
  const normalized = String(value ?? "DRAFT").trim().toUpperCase();
  switch (normalized) {
    case "POSTED":
    case "PARTIALLY_CONFIRMED":
    case "CONFIRMED":
    case "CANCELLED":
      return normalized;
    default:
      return "DRAFT";
  }
}

function getLoadingPrefix(channel: SalesChannel) {
  switch (channel) {
    case "TRUCK":
      return "TLOAD";
    case "AGENT":
      return "ALOAD";
    case "BRANCH":
      return "BLOAD";
    default:
      return "LOAD";
  }
}

function getSalePrefix(channel: SalesChannel) {
  switch (channel) {
    case "TRUCK":
      return "TRK";
    case "AGENT":
      return "AGT";
    case "BRANCH":
      return "BRN";
    default:
      return "SALE";
  }
}

function validateLines(lines: LoadingOrderLineInput[]) {
  const filtered = lines.filter((line) => line.itemId && Number(line.quantity ?? 0) > 0);
  if (!filtered.length) {
    throw new Error("At least one loading line is required");
  }

  const seen = new Set<string>();
  return filtered.map((line) => {
    if (seen.has(line.itemId)) {
      throw new Error("Duplicate items are not allowed in the same loading order");
    }
    seen.add(line.itemId);

    const quantity = Number(line.quantity ?? 0);
    const unitPrice = Number(line.unitPrice ?? 0);
    if (!(quantity > 0)) {
      throw new Error("Loading quantity must be greater than zero");
    }
    if (!(unitPrice > 0)) {
      throw new Error("Unit price must be greater than zero");
    }
    if (!line.priceListId || !line.priceListItemId) {
      throw new Error("Each loading line must keep a saved price list snapshot");
    }

    return {
      id: line.id ?? randomUUID(),
      itemId: line.itemId,
      unitId: line.unitId ?? null,
      priceListId: line.priceListId,
      priceListItemId: line.priceListItemId,
      quantity,
      unitPrice,
      lineTotal: Number((line.lineTotal ?? quantity * unitPrice).toFixed(2)),
      taxAmount: Number(line.taxAmount ?? 0),
      discountAmount: Number(line.discountAmount ?? 0),
      remarks: normalizeText(line.remarks),
    };
  });
}

function totals(lines: ReturnType<typeof validateLines>) {
  return lines.reduce(
    (sum, line) => ({
      subtotal: sum.subtotal + line.lineTotal,
      taxAmount: sum.taxAmount + line.taxAmount,
      discountAmount: sum.discountAmount + line.discountAmount,
      totalAmount: sum.totalAmount + line.lineTotal,
    }),
    { subtotal: 0, taxAmount: 0, discountAmount: 0, totalAmount: 0 },
  );
}

function validateChannelSpecificFields(
  channel: SalesChannel,
  input: SaveLoadingOrderInput,
) {
  if (channel === "TRUCK" && normalizeText(input.tripId)) {
    return;
  }

  if (channel === "AGENT" && !normalizeText(input.agentId)) {
    throw new Error("Agent is required for AGENT loading");
  }

  if (channel === "BRANCH" && !normalizeText(input.destinationLocationId)) {
    throw new Error("Destination branch is required for BRANCH loading");
  }

  if (channel === "TRUCK" && !normalizeText(input.truckId)) {
    throw new Error("Truck reference is required for TRUCK loading");
  }
}

async function ensureLocation(tx: Tx, locationId: string, label: string) {
  const rows = await tx<Array<{ id: string; locationCode: string; locationName: string; isActive: boolean }>>`
    SELECT id, "locationCode", "locationName", "isActive"
    FROM "Location"
    WHERE id = ${locationId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const location = rows[0];
  if (!location) {
    throw new Error(`${label} location was not found`);
  }
  if (!location.isActive) {
    throw new Error(`${label} location is inactive`);
  }
  const holdLocations = await tx<Array<{ id: string }>>`SELECT id FROM "Location" WHERE id = ${locationId} AND "isQcHoldLocation" = true LIMIT 1`;
  if (holdLocations[0]) throw new Error(`${label} location is reserved for QC quarantine and cannot be loaded or dispatched`);
  return location;
}

async function ensureCustomerLike(
  tx: Tx,
  customerId: string | null | undefined,
  label: string,
): Promise<Counterparty | null> {
  if (!customerId) {
    return null;
  }

  const rows = await tx<Array<Counterparty>>`
    SELECT id, "customerCode", name, "customerType", "isActive"
    FROM "Customer"
    WHERE id = ${customerId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const customer = rows[0];
  if (!customer) {
    throw new Error(`${label} was not found`);
  }
  if (!customer.isActive) {
    throw new Error(`${label} is inactive`);
  }
  return customer;
}

async function ensureVehicle(
  tx: Tx,
  vehicleId: string | null | undefined,
): Promise<FleetVehicle | null> {
  if (!vehicleId) {
    return null;
  }

  const rows = await tx<Array<FleetVehicle>>`
    SELECT id, "vehicleCode", "plateNumber", "vehicleName", "isActive"
    FROM "Vehicle"
    WHERE id = ${vehicleId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const vehicle = rows[0];
  if (!vehicle) {
    throw new Error("Truck was not found");
  }
  if (!vehicle.isActive) {
    throw new Error("Truck is inactive");
  }
  return vehicle;
}

async function ensureFleetDriver(
  tx: Tx,
  driverId: string | null | undefined,
): Promise<FleetDriverRow | null> {
  if (!driverId) {
    return null;
  }

  const rows = await tx<Array<FleetDriverRow>>`
    SELECT id, "driverCode", "fullName", "isActive"
    FROM "FleetDriver"
    WHERE id = ${driverId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const driver = rows[0];
  if (!driver) {
    throw new Error("Driver was not found");
  }
  if (!driver.isActive) {
    throw new Error("Driver is inactive");
  }
  return driver;
}

async function ensureFleetTrip(
  tx: Tx,
  tripId: string | null | undefined,
): Promise<FleetTripRow | null> {
  if (!tripId) {
    return null;
  }

  const rows = await tx<Array<FleetTripRow>>`
    SELECT id, "tripNo", "routeName", "vehicleId", "driverId", "fromLocationId", "destinationId", "isActive"
    FROM "FleetTrip"
    WHERE id = ${tripId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const trip = rows[0];
  if (!trip) {
    throw new Error("Trip was not found");
  }
  if (!trip.isActive) {
    throw new Error("Trip is inactive");
  }
  return trip;
}

async function ensureLoadingEditable(tx: Tx, id: string) {
  const rows = await tx<Array<{ status: LoadingOrderStatus }>>`
    SELECT status::text AS status
    FROM "LoadingOrder"
    WHERE id = ${id}
      AND "isArchived" = false
    LIMIT 1
  `;

  const current = rows[0];
  if (!current) {
    throw new Error("Loading order was not found");
  }
  if (current.status === "CONFIRMED" || current.status === "CANCELLED") {
    throw new Error("Confirmed or cancelled loading orders cannot be edited");
  }
  return current.status;
}

async function getLoadingHeaderForUpdate(tx: Tx, id: string) {
  const rows = await tx<Array<{
    id: string;
    loadingNo: string;
    salesOrderId: string | null;
    channel: string;
    fromLocationId: string;
    destinationLocationId: string | null;
    agentId: string | null;
    customerId: string | null;
    truckId: string | null;
    tripId: string | null;
    tripNo: string | null;
    truckCode: string | null;
    truckPlateNumber: string | null;
    truckName: string | null;
    driverId: string | null;
    driverCode: string | null;
    driverName: string | null;
    routeName: string | null;
    status: LoadingOrderStatus;
    createdById: string;
  }>>`
    SELECT
      lo.id,
      lo."publicId",
      lo."loadingNo",
      lo."salesOrderId",
      lo.channel,
      lo."fromLocationId",
      lo."destinationLocationId",
      lo."agentId",
      lo."customerId",
      lo."truckId",
      lo."tripId",
      trip."tripNo",
      vehicle."vehicleCode" AS "truckCode",
      vehicle."plateNumber" AS "truckPlateNumber",
      vehicle."vehicleName" AS "truckName",
      lo."driverId",
      driver."driverCode" AS "driverCode",
      driver."fullName" AS "driverName",
      lo."routeName",
      lo.status::text AS status,
      lo."createdById"
    FROM "LoadingOrder" lo
    LEFT JOIN "FleetTrip" trip ON trip.id = lo."tripId"
    LEFT JOIN "Vehicle" vehicle ON vehicle.id = lo."truckId"
    LEFT JOIN "FleetDriver" driver ON driver.id = lo."driverId"
    WHERE ${isPublicIdParam(id) ? sql`lo."publicId" = ${Number(id)}` : sql`lo.id = ${id}`}
      AND lo."isArchived" = false
    LIMIT 1
    FOR UPDATE OF lo
  `;

  const loading = rows[0];
  if (!loading) {
    throw new Error("Loading order was not found");
  }
  return loading;
}

async function getLoadingItemsForUpdate(tx: Tx, loadingOrderId: string) {
  return tx<Array<{
    id: string;
    salesOrderItemId: string | null;
    itemId: string;
    unitId: string | null;
    priceListId: string | null;
    priceListItemId: string | null;
    quantity: number;
    reservedQty: number;
    issuedQty: number;
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
      "reservedQty",
      "issuedQty",
      "unitPrice",
      "lineTotal",
      "taxAmount",
      "discountAmount",
      remarks
    FROM "LoadingOrderItem"
    WHERE "loadingOrderId" = ${loadingOrderId}
    ORDER BY "createdAt" ASC
    FOR UPDATE
  `;
}

async function insertLoadingItems(
  tx: Tx,
  loadingOrderId: string,
  lines: Array<ReturnType<typeof validateLines>[number] & { reservedQty: number; issuedQty: number }>,
) {
  for (const line of lines) {
    await tx`
      INSERT INTO "LoadingOrderItem" (
        id, "loadingOrderId", "itemId", "unitId", "priceListId", "priceListItemId",
        quantity, "reservedQty", "issuedQty", "unitPrice", "lineTotal", "taxAmount",
        "discountAmount", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${line.id},
        ${loadingOrderId},
        ${line.itemId},
        ${line.unitId},
        ${line.priceListId},
        ${line.priceListItemId},
        ${line.quantity},
        ${line.reservedQty},
        ${line.issuedQty},
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
}

async function updateLoadingItem(
  tx: Tx,
  loadingOrderId: string,
  line: ReturnType<typeof validateLines>[number] & { reservedQty: number; issuedQty: number },
) {
  await tx`
    UPDATE "LoadingOrderItem"
    SET
      "itemId" = ${line.itemId},
      "unitId" = ${line.unitId},
      "priceListId" = ${line.priceListId},
      "priceListItemId" = ${line.priceListItemId},
      quantity = ${line.quantity},
      "reservedQty" = ${line.reservedQty},
      "issuedQty" = ${line.issuedQty},
      "unitPrice" = ${line.unitPrice},
      "lineTotal" = ${line.lineTotal},
      "taxAmount" = ${line.taxAmount},
      "discountAmount" = ${line.discountAmount},
      remarks = ${line.remarks},
      "updatedAt" = NOW()
    WHERE id = ${line.id}
      AND "loadingOrderId" = ${loadingOrderId}
  `;
}

async function getActiveReservationMap(tx: Tx, sourceId: string) {
  const reservations = await getReservationBySource("sales.loading", sourceId, { tx });
  return new Map(reservations.map((reservation) => [reservation.sourceItemId, reservation]));
}

async function createPostedSaleFromLoading(
  tx: Tx,
  loading: Awaited<ReturnType<typeof getLoadingHeaderForUpdate>>,
  items: Array<{
    loadingOrderItemId: string;
    salesOrderItemId: string | null;
    itemId: string;
    unitId: string | null;
    priceListId: string | null;
    priceListItemId: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    remarks: string | null;
    reservationId: string;
  }>,
  actor: { userId: string; userName: string },
) {
  const saleId = randomUUID();
  const saleNo = await nextSalesDocumentNumber(tx, getSalePrefix(normalizeSalesChannel(loading.channel)), "Loading order confirmed sale");
  const customerId = loading.customerId ?? loading.agentId ?? null;
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));

  await tx`
    INSERT INTO "Sale" (
      id, "saleNo", "saleDate", channel, "locationId", "customerId", "agentId", "truckId", "tripId", "routeName",
      status, subtotal, "taxAmount", "discountAmount", "totalAmount", "paymentStatus",
      "paymentMethod", "bankAccountId", "referenceNo", notes, "createdById", "postedById",
      "postedAt", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${saleId},
      ${saleNo},
      NOW(),
      ${loading.channel},
      ${loading.fromLocationId},
      ${customerId},
      ${loading.agentId ?? null},
      ${loading.truckId ?? null},
      ${loading.tripId ?? null},
      ${loading.routeName ?? null},
      'POSTED',
      ${subtotal},
      0,
      0,
      ${subtotal},
      'UNPAID',
      NULL,
      NULL,
      NULL,
      ${`Confirmed from loading ${loading.loadingNo}`},
      ${actor.userId},
      ${actor.userId},
      NOW(),
      false,
      NOW(),
      NOW()
    )
  `;

  const dispatchLines: Array<{
    loadingOrderItemId: string;
    salesOrderItemId: string | null;
    saleItemId: string;
    itemId: string;
    unitId: string | null;
    priceListId: string | null;
    priceListItemId: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
    discountAmount: number;
    inventoryMovementId: string | null;
    remarks: string | null;
  }> = [];

  for (const line of items) {
    const reservationResult = await issueReservedStock(
      {
        reservationId: line.reservationId,
        quantity: line.quantity,
        createdById: actor.userId,
        sourceModule: "sales.loading",
        sourceDocumentId: saleId,
        remarks: line.remarks ?? `Issued from loading ${loading.loadingNo}`,
      },
      { tx },
    );

    const saleItemId = randomUUID();

    await tx`
      INSERT INTO "SaleItem" (
        id, "saleId", "itemId", "unitId", "priceListId", "priceListItemId", quantity,
        "unitPrice", "lineTotal", "taxAmount", "discountAmount", "inventoryMovementId", "salesOrderItemId",
        remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${saleItemId},
        ${saleId},
        ${line.itemId},
        ${line.unitId},
        ${line.priceListId},
        ${line.priceListItemId},
        ${line.quantity},
        ${line.unitPrice},
        ${line.lineTotal},
        0,
        0,
        ${reservationResult.movement.movementId},
        ${line.salesOrderItemId},
        ${line.remarks},
        NOW(),
        NOW()
      )
    `;

    await tx`
      UPDATE "LoadingOrderItem"
      SET
        "issuedQty" = "issuedQty" + ${line.quantity},
        "reservedQty" = GREATEST("reservedQty" - ${line.quantity}, 0),
        "updatedAt" = NOW()
      WHERE id = ${reservationResult.reservation.sourceItemId}
    `;

    dispatchLines.push({
      loadingOrderItemId: line.loadingOrderItemId,
      salesOrderItemId: line.salesOrderItemId,
      saleItemId,
      itemId: line.itemId,
      unitId: line.unitId,
      priceListId: line.priceListId,
      priceListItemId: line.priceListItemId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      taxAmount: 0,
      discountAmount: 0,
      inventoryMovementId: reservationResult.movement.movementId,
      remarks: line.remarks,
    });
  }

  const dispatch = await recordPostedDispatch(
    tx,
    {
      loadingOrderId: loading.id,
      loadingNo: loading.loadingNo,
      salesOrderId: loading.salesOrderId ?? null,
      saleId,
      channel: loading.channel,
      locationId: loading.fromLocationId,
      destinationLocationId: loading.destinationLocationId ?? null,
      customerId,
      agentId: loading.agentId ?? null,
      truckId: loading.truckId ?? null,
      driverId: loading.driverId ?? null,
      tripId: loading.tripId ?? null,
      routeName: loading.routeName ?? null,
      remarks: `Dispatch created from loading ${loading.loadingNo}`,
    },
    dispatchLines,
    actor,
  );

  await syncPostedSaleFinance(tx, {
    saleId,
    userId: actor.userId,
  });

  await writeSalesAudit(tx, actor.userId, "sales.loading", "CONFIRM_SALE", loading.id, {
    loadingNo: loading.loadingNo,
    saleId,
    saleNo,
    channel: loading.channel,
    totalAmount: subtotal,
    lineCount: items.length,
  });
  await writeSalesHistory(
    tx,
    "sales.loading",
    loading.id,
    "CONFIRMED",
    actor.userId,
    `Loading ${loading.loadingNo} confirmed into sale ${saleNo}`,
  );
  await writeSalesHistory(
    tx,
    "sales.sale",
    saleId,
    "POSTED",
    actor.userId,
    `Confirmed from loading ${loading.loadingNo}`,
  );

  return {
    id: saleId,
    saleNo,
    totalAmount: subtotal,
    dispatchId: dispatch.id,
    dispatchNo: dispatch.dispatchNo,
  };
}

export async function createLoadingOrder(
  input: SaveLoadingOrderInput,
  actor: { userId: string; userName: string },
) {
  if (!input.loadingDate) {
    throw new Error("Loading date is required");
  }
  if (!input.fromLocationId) {
    throw new Error("From location is required");
  }

  const channel = normalizeSalesChannel(input.channel);
  const targetStatus = normalizeLoadingStatus(input.status);
  const lines = validateLines(input.lines);
  const totalsValue = totals(lines);
  validateChannelSpecificFields(channel, input);

  return sql.begin(async (tx) => {
    await ensureLocation(tx, input.fromLocationId, "Source");
    if (input.destinationLocationId) {
      await ensureLocation(tx, input.destinationLocationId, "Destination");
    }
    const agent = await ensureCustomerLike(tx, input.agentId, "Agent");
    const customer = await ensureCustomerLike(tx, input.customerId, "Customer");
    const trip = await ensureFleetTrip(tx, input.tripId);
    await ensureVehicle(tx, trip?.vehicleId ?? input.truckId);
    await ensureFleetDriver(tx, trip?.driverId ?? input.driverId);
    const loadingId = randomUUID();
    const loadingNo = await nextSalesDocumentNumber(tx, getLoadingPrefix(channel), "Sales loading order");

    await tx`
      INSERT INTO "LoadingOrder" (
        id, "loadingNo", "loadingDate", channel, status, "fromLocationId", "destinationLocationId",
        "agentId", "customerId", "truckId", "driverId", "tripId", "routeName", remarks, subtotal,
        "taxAmount", "discountAmount", "totalAmount", "reservedAt", "reservedById",
        "createdById", "updatedById", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${loadingId},
        ${loadingNo},
        ${input.loadingDate}::timestamptz,
        ${channel},
        ${targetStatus}::"LoadingOrderStatus",
        ${input.fromLocationId},
        ${normalizeText(input.destinationLocationId)},
        ${agent?.id ?? null},
        ${customer?.id ?? null},
        ${trip?.vehicleId ?? normalizeText(input.truckId)},
        ${trip?.driverId ?? normalizeText(input.driverId)},
        ${trip?.id ?? null},
        ${trip?.routeName ?? normalizeText(input.routeName)},
        ${normalizeText(input.remarks)},
        ${totalsValue.subtotal},
        ${totalsValue.taxAmount},
        ${totalsValue.discountAmount},
        ${totalsValue.totalAmount},
        ${targetStatus === "POSTED" ? sql`NOW()` : null},
        ${targetStatus === "POSTED" ? actor.userId : null},
        ${actor.userId},
        ${actor.userId},
        false,
        NOW(),
        NOW()
      )
    `;

    const rowsToInsert: Array<ReturnType<typeof validateLines>[number] & { reservedQty: number; issuedQty: number }> = [];
    for (const line of lines) {
      let reservedQty = 0;
      if (targetStatus === "POSTED") {
        await reserveStock(
          {
            sourceType: "sales.loading",
            sourceId: loadingId,
            sourceItemId: line.id,
            itemId: line.itemId,
            locationId: input.fromLocationId,
            quantity: line.quantity,
            createdById: actor.userId,
            remarks: line.remarks,
          },
          { tx },
        );
        reservedQty = line.quantity;
      }

      rowsToInsert.push({
        ...line,
        reservedQty,
        issuedQty: 0,
      });
    }

    await insertLoadingItems(tx, loadingId, rowsToInsert);

    await writeSalesAudit(tx, actor.userId, "sales.loading", targetStatus === "POSTED" ? "CREATE_POST" : "CREATE_DRAFT", loadingId, {
      loadingNo,
      channel,
      fromLocationId: input.fromLocationId,
      destinationLocationId: input.destinationLocationId ?? null,
      totalAmount: totalsValue.totalAmount,
      lineCount: rowsToInsert.length,
    });
    await writeSalesHistory(
      tx,
      "sales.loading",
      loadingId,
      targetStatus === "POSTED" ? "POSTED" : "CREATED",
      actor.userId,
      `${loadingNo} ${targetStatus === "POSTED" ? "reserved stock" : "saved as draft"}`,
    );

    const pub = await tx<Array<{ publicId: number }>>`SELECT "publicId" FROM "LoadingOrder" WHERE id = ${loadingId} LIMIT 1`;
    return {
      id: loadingId,
      publicId: Number(pub[0]?.publicId ?? 0),
      loadingNo,
      status: targetStatus,
      totalAmount: Number(totalsValue.totalAmount.toFixed(2)),
      channel,
    };
  });
}

export async function updateLoadingOrder(
  id: string,
  input: SaveLoadingOrderInput,
  actor: { userId: string; userName: string },
) {
  if (!input.loadingDate) {
    throw new Error("Loading date is required");
  }
  if (!input.fromLocationId) {
    throw new Error("From location is required");
  }

  const channel = normalizeSalesChannel(input.channel);
  const targetStatus = normalizeLoadingStatus(input.status);
  const lines = validateLines(input.lines);
  const totalsValue = totals(lines);
  validateChannelSpecificFields(channel, input);

  return sql.begin(async (tx) => {
    const existingStatus = await ensureLoadingEditable(tx, id);
    const header = await getLoadingHeaderForUpdate(tx, id);
    const existingItems = await getLoadingItemsForUpdate(tx, id);
    const reservationMap = await getActiveReservationMap(tx, id);

    if (header.channel !== channel) {
      throw new Error("Loading channel cannot be changed after creation");
    }

    await ensureLocation(tx, input.fromLocationId, "Source");
    if (input.destinationLocationId) {
      await ensureLocation(tx, input.destinationLocationId, "Destination");
    }
    const agent = await ensureCustomerLike(tx, input.agentId, "Agent");
    const customer = await ensureCustomerLike(tx, input.customerId, "Customer");
    const trip = await ensureFleetTrip(tx, input.tripId);
    await ensureVehicle(tx, trip?.vehicleId ?? input.truckId);
    await ensureFleetDriver(tx, trip?.driverId ?? input.driverId);

    const incomingIds = new Set(lines.map((line) => line.id));
    const shouldReserve = existingStatus === "POSTED" || targetStatus === "POSTED";

    for (const current of existingItems) {
      if (incomingIds.has(current.id)) {
        continue;
      }

      const reservation = reservationMap.get(current.id);
      if (shouldReserve && reservation && reservation.activeQty > 0) {
        await releaseReservation(
          {
            reservationId: reservation.id,
            releasedById: actor.userId,
            quantity: reservation.activeQty,
            status: "CANCELLED",
            remarks: "Released because the loading line was removed",
          },
          { tx },
        );
      }

      await tx`
        DELETE FROM "LoadingOrderItem"
        WHERE id = ${current.id}
          AND "loadingOrderId" = ${id}
      `;
    }

    for (const line of lines) {
      const current = existingItems.find((item) => item.id === line.id);
      const reservation = reservationMap.get(line.id);

      if (!current) {
        let reservedQty = 0;
        if (shouldReserve) {
          await reserveStock(
            {
              sourceType: "sales.loading",
              sourceId: id,
              sourceItemId: line.id,
              itemId: line.itemId,
              locationId: input.fromLocationId,
              quantity: line.quantity,
              createdById: actor.userId,
              remarks: line.remarks,
            },
            { tx },
          );
          reservedQty = line.quantity;
        }

        await insertLoadingItems(tx, id, [{ ...line, reservedQty, issuedQty: 0 }]);
        continue;
      }

      if (current.itemId !== line.itemId) {
        if (reservation?.activeQty) {
          await releaseReservation(
            {
              reservationId: reservation.id,
              releasedById: actor.userId,
              quantity: reservation.activeQty,
              status: "CANCELLED",
              remarks: "Released because the loading item changed",
            },
            { tx },
          );
        }

        if (shouldReserve) {
          await reserveStock(
            {
              sourceType: "sales.loading",
              sourceId: id,
              sourceItemId: line.id,
              itemId: line.itemId,
              locationId: input.fromLocationId,
              quantity: line.quantity,
              createdById: actor.userId,
              remarks: line.remarks,
            },
            { tx },
          );
        }
      } else if (shouldReserve && reservation) {
        await updateReservation(
          {
            reservationId: reservation.id,
            targetQuantity: line.quantity,
            updatedById: actor.userId,
            remarks: line.remarks,
          },
          { tx },
        );
      } else if (shouldReserve && !reservation) {
        await reserveStock(
          {
            sourceType: "sales.loading",
            sourceId: id,
            sourceItemId: line.id,
            itemId: line.itemId,
            locationId: input.fromLocationId,
            quantity: line.quantity,
            createdById: actor.userId,
            remarks: line.remarks,
          },
          { tx },
        );
      }

      await updateLoadingItem(tx, id, {
        ...line,
        reservedQty: shouldReserve ? line.quantity : 0,
        issuedQty: Number(current.issuedQty ?? 0),
      });
    }

    await tx`
      UPDATE "LoadingOrder"
      SET
        "loadingDate" = ${input.loadingDate}::timestamptz,
        "fromLocationId" = ${input.fromLocationId},
        "destinationLocationId" = ${normalizeText(input.destinationLocationId)},
        "agentId" = ${agent?.id ?? null},
        "customerId" = ${customer?.id ?? null},
        "truckId" = ${trip?.vehicleId ?? normalizeText(input.truckId)},
        "driverId" = ${trip?.driverId ?? normalizeText(input.driverId)},
        "tripId" = ${trip?.id ?? null},
        "routeName" = ${trip?.routeName ?? normalizeText(input.routeName)},
        remarks = ${normalizeText(input.remarks)},
        subtotal = ${totalsValue.subtotal},
        "taxAmount" = ${totalsValue.taxAmount},
        "discountAmount" = ${totalsValue.discountAmount},
        "totalAmount" = ${totalsValue.totalAmount},
        status = ${shouldReserve ? "POSTED" : existingStatus}::"LoadingOrderStatus",
        "reservedAt" = CASE
          WHEN ${existingStatus === "DRAFT" && shouldReserve} THEN NOW()
          ELSE "reservedAt"
        END,
        "reservedById" = CASE
          WHEN ${existingStatus === "DRAFT" && shouldReserve} THEN ${actor.userId}
          ELSE "reservedById"
        END,
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeSalesAudit(tx, actor.userId, "sales.loading", "UPDATE", id, {
      loadingNo: header.loadingNo,
      totalAmount: totalsValue.totalAmount,
      lineCount: lines.length,
    });
    await writeSalesHistory(tx, "sales.loading", id, "UPDATED", actor.userId, `Updated loading ${header.loadingNo}`);
    if (header.salesOrderId) {
      await syncSalesOrderProgress(tx, header.salesOrderId);
    }

    return {
      id,
      loadingNo: header.loadingNo,
      status: shouldReserve ? "POSTED" : existingStatus,
      totalAmount: Number(totalsValue.totalAmount.toFixed(2)),
      channel,
    };
  });
}

export async function postLoadingOrder(
  id: string,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => {
    const header = await getLoadingHeaderForUpdate(tx, id);
    if (header.status === "POSTED") {
      return { id: header.id, loadingNo: header.loadingNo, status: header.status };
    }
    if (header.status === "CONFIRMED" || header.status === "CANCELLED") {
      throw new Error("Confirmed or cancelled loading orders cannot be posted");
    }

    const items = await getLoadingItemsForUpdate(tx, id);
    if (!items.length) {
      throw new Error("Loading order must have at least one line before posting");
    }

    for (const item of items) {
      await reserveStock(
        {
          sourceType: "sales.loading",
          sourceId: id,
          sourceItemId: item.id,
          itemId: item.itemId,
          locationId: header.fromLocationId,
          quantity: Number(item.quantity ?? 0),
          createdById: actor.userId,
          remarks: item.remarks,
        },
        { tx },
      );

      await tx`
        UPDATE "LoadingOrderItem"
        SET
          "reservedQty" = ${Number(item.quantity ?? 0)},
          "updatedAt" = NOW()
        WHERE id = ${item.id}
      `;
    }

    await tx`
      UPDATE "LoadingOrder"
      SET
        status = 'POSTED'::"LoadingOrderStatus",
        "reservedAt" = NOW(),
        "reservedById" = ${actor.userId},
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeSalesAudit(tx, actor.userId, "sales.loading", "POST_RESERVE", id, {
      loadingNo: header.loadingNo,
      lineCount: items.length,
    });
    await writeSalesHistory(tx, "sales.loading", id, "POSTED", actor.userId, `Reserved stock for loading ${header.loadingNo}`);
    if (header.salesOrderId) {
      await syncSalesOrderProgress(tx, header.salesOrderId);
    }

    return { id, loadingNo: header.loadingNo, status: "POSTED" as const };
  });
}

export async function cancelLoadingOrder(
  id: string,
  cancellationReason: string | null | undefined,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => {
    const header = await getLoadingHeaderForUpdate(tx, id);
    if (header.status === "CONFIRMED" || header.status === "PARTIALLY_CONFIRMED") {
      throw new Error("Confirmed loading orders cannot be cancelled");
    }
    if (header.status === "CANCELLED") {
      return { id, loadingNo: header.loadingNo, status: header.status };
    }

    if (header.status === "POSTED") {
      const reservations = await getReservationBySource("sales.loading", id, { tx });
      for (const reservation of reservations) {
        if (reservation.activeQty <= 0) {
          continue;
        }
        await releaseReservation(
          {
            reservationId: reservation.id,
            releasedById: actor.userId,
            quantity: reservation.activeQty,
            status: "CANCELLED",
            remarks: cancellationReason ?? "Loading order cancelled",
          },
          { tx },
        );

        await tx`
          UPDATE "LoadingOrderItem"
          SET
            "reservedQty" = GREATEST("reservedQty" - ${reservation.activeQty}, 0),
            "updatedAt" = NOW()
          WHERE id = ${reservation.sourceItemId}
        `;
      }
    }

    await tx`
      UPDATE "LoadingOrder"
      SET
        status = 'CANCELLED'::"LoadingOrderStatus",
        "cancelledAt" = NOW(),
        "cancelledById" = ${actor.userId},
        "cancellationReason" = ${normalizeText(cancellationReason)},
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeSalesAudit(tx, actor.userId, "sales.loading", "CANCEL", id, {
      loadingNo: header.loadingNo,
      reason: normalizeText(cancellationReason),
    });
    await writeSalesHistory(tx, "sales.loading", id, "CANCELLED", actor.userId, `Cancelled loading ${header.loadingNo}`);
    if (header.salesOrderId) {
      await syncSalesOrderProgress(tx, header.salesOrderId);
    }

    return { id, loadingNo: header.loadingNo, status: "CANCELLED" as const };
  });
}

export async function confirmLoadingOrderSale(
  id: string,
  confirmation:
    | {
        lines?: Array<{
          loadingOrderItemId: string;
          quantity: number;
        }>;
      }
    | undefined,
  actor: { userId: string; userName: string },
) {
  return sql.begin(async (tx) => {
    const header = await getLoadingHeaderForUpdate(tx, id);
    if (header.status !== "POSTED" && header.status !== "PARTIALLY_CONFIRMED") {
      throw new Error("Only posted loading orders can be confirmed as sale");
    }

    const items = await getLoadingItemsForUpdate(tx, id);
    const reservationMap = await getActiveReservationMap(tx, id);
    const requested = new Map(
      (confirmation?.lines ?? [])
        .map((line) => ({
          loadingOrderItemId: String(line.loadingOrderItemId ?? "").trim(),
          quantity: Number(line.quantity ?? 0),
        }))
        .filter((line) => line.loadingOrderItemId.length > 0 && line.quantity > 0)
        .map((line) => [line.loadingOrderItemId, line.quantity]),
    );
    const confirmableLines = items
      .map((item) => {
        const reservation = reservationMap.get(item.id);
        const activeQty = reservation?.activeQty ?? 0;
        if (!(activeQty > 0)) {
          return null;
        }

        const selectedQty = requested.size > 0 ? Number(requested.get(item.id) ?? 0) : activeQty;
        if (!(selectedQty > 0)) {
          return null;
        }
        if (selectedQty > activeQty) {
          throw new Error(`Confirm quantity cannot exceed reserved quantity for item ${item.itemId}`);
        }

        return {
          loadingOrderItemId: item.id,
          salesOrderItemId: item.salesOrderItemId,
          itemId: item.itemId,
          unitId: item.unitId,
          priceListId: item.priceListId,
          priceListItemId: item.priceListItemId,
          quantity: selectedQty,
          unitPrice: Number(item.unitPrice ?? 0),
          lineTotal: Number((selectedQty * Number(item.unitPrice ?? 0)).toFixed(2)),
          remarks: item.remarks,
          reservationId: reservation!.id,
        };
      })
      .filter(Boolean) as Array<{
      loadingOrderItemId: string;
      salesOrderItemId: string | null;
      itemId: string;
      unitId: string | null;
      priceListId: string | null;
      priceListItemId: string | null;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      remarks: string | null;
      reservationId: string;
    }>;

    if (!confirmableLines.length) {
      throw new Error("No active reserved quantities remain to confirm");
    }

    const sale = await createPostedSaleFromLoading(tx, header, confirmableLines, actor);
    const remainingReservations = await getReservationBySource("sales.loading", id, { tx });
    const hasRemainingActiveReservations = remainingReservations.some((reservation) => reservation.activeQty > 0);

    await tx`
      UPDATE "LoadingOrder"
      SET
        status = ${hasRemainingActiveReservations ? "PARTIALLY_CONFIRMED" : "CONFIRMED"}::"LoadingOrderStatus",
        "confirmedAt" = NOW(),
        "confirmedById" = ${actor.userId},
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    const nextStatus: LoadingOrderStatus = hasRemainingActiveReservations
      ? "PARTIALLY_CONFIRMED"
      : "CONFIRMED";
    if (header.salesOrderId) {
      await syncSalesOrderProgress(tx, header.salesOrderId);
    }

    return {
      id,
      loadingNo: header.loadingNo,
      status: nextStatus,
      saleId: sale.id,
      saleNo: sale.saleNo,
      dispatchId: sale.dispatchId,
      dispatchNo: sale.dispatchNo,
      totalAmount: sale.totalAmount,
    };
  });
}

export async function listLoadingOrders(scope: LoadingScope = {}): Promise<LoadingOrderSummary[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const channel = scope.channel ? normalizeSalesChannel(scope.channel) : null;
  const tripId = normalizeText(scope.tripId);
  const rows = await sql<Array<{
    id: string;
    loadingNo: string;
    loadingDate: string;
    channel: string;
    fromLocationId: string;
    fromLocationCode: string;
    fromLocationName: string;
    destinationLocationId: string | null;
    destinationLocationCode: string | null;
    destinationLocationName: string | null;
    agentId: string | null;
    agentName: string | null;
    customerId: string | null;
    customerName: string | null;
    truckId: string | null;
    tripId: string | null;
    tripNo: string | null;
    truckCode: string | null;
    truckPlateNumber: string | null;
    truckName: string | null;
    driverId: string | null;
    driverCode: string | null;
    driverName: string | null;
    routeName: string | null;
    status: LoadingOrderStatus;
    itemCount: number;
    totalQuantity: number;
    totalAmount: number;
    reservedAt: string | null;
    confirmedAt: string | null;
    cancelledAt: string | null;
  }>>`
    SELECT
      lo.id,
      lo."publicId",
      lo."loadingNo",
      lo."loadingDate"::text AS "loadingDate",
      lo.channel,
      lo."fromLocationId",
      fl."locationCode" AS "fromLocationCode",
      fl."locationName" AS "fromLocationName",
      lo."destinationLocationId",
      dl."locationCode" AS "destinationLocationCode",
      dl."locationName" AS "destinationLocationName",
      lo."agentId",
      agent.name AS "agentName",
      lo."customerId",
      customer.name AS "customerName",
      lo."truckId",
      lo."tripId",
      trip."tripNo",
      vehicle."vehicleCode" AS "truckCode",
      vehicle."plateNumber" AS "truckPlateNumber",
      vehicle."vehicleName" AS "truckName",
      lo."driverId",
      driver."driverCode" AS "driverCode",
      driver."fullName" AS "driverName",
      lo."routeName",
      lo.status::text AS status,
      COUNT(lli.id)::int AS "itemCount",
      COALESCE(SUM(lli.quantity), 0)::double precision AS "totalQuantity",
      lo."totalAmount",
      lo."reservedAt"::text AS "reservedAt",
      lo."confirmedAt"::text AS "confirmedAt",
      lo."cancelledAt"::text AS "cancelledAt"
    FROM "LoadingOrder" lo
    INNER JOIN "Location" fl ON fl.id = lo."fromLocationId"
    LEFT JOIN "Location" dl ON dl.id = lo."destinationLocationId"
    LEFT JOIN "Customer" agent ON agent.id = lo."agentId"
    LEFT JOIN "Customer" customer ON customer.id = lo."customerId"
    LEFT JOIN "FleetTrip" trip ON trip.id = lo."tripId"
    LEFT JOIN "Vehicle" vehicle ON vehicle.id = lo."truckId"
    LEFT JOIN "FleetDriver" driver ON driver.id = lo."driverId"
    LEFT JOIN "LoadingOrderItem" lli ON lli."loadingOrderId" = lo.id
    WHERE lo."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR lo."fromLocationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
      AND (${channel}::text IS NULL OR lo.channel = ${channel})
      AND (${tripId}::text IS NULL OR lo."tripId" = ${tripId})
    GROUP BY lo.id, fl.id, dl.id, agent.id, customer.id, trip.id, vehicle.id, driver.id
    ORDER BY lo."loadingDate" DESC, lo."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    loadingNo: row.loadingNo,
    loadingDate: row.loadingDate,
    channel: normalizeSalesChannel(row.channel),
    fromLocationId: row.fromLocationId,
    fromLocationCode: row.fromLocationCode,
    fromLocationName: row.fromLocationName,
    destinationLocationId: row.destinationLocationId ?? undefined,
    destinationLocationCode: row.destinationLocationCode ?? undefined,
    destinationLocationName: row.destinationLocationName ?? undefined,
    agentId: row.agentId ?? undefined,
    agentName: row.agentName ?? undefined,
    customerId: row.customerId ?? undefined,
    customerName: row.customerName ?? undefined,
    truckId: row.truckId ?? undefined,
    tripId: row.tripId ?? undefined,
    tripLabel: row.tripNo ? `${row.tripNo}${row.routeName ? ` - ${row.routeName}` : ""}` : undefined,
    truckLabel: row.truckCode ? `${row.truckCode} - ${row.truckPlateNumber ?? row.truckName ?? "Truck"}` : undefined,
    driverId: row.driverId ?? undefined,
    driverName: row.driverCode ? `${row.driverCode} - ${row.driverName ?? "Driver"}` : undefined,
    routeName: row.routeName ?? undefined,
    status: row.status,
    itemCount: Number(row.itemCount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    reservedAt: row.reservedAt ?? undefined,
    confirmedAt: row.confirmedAt ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
  }));
}

export async function getLoadingOrderById(id: string, scope: LoadingScope = {}): Promise<LoadingOrderDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<Array<{
    id: string;
    loadingNo: string;
    loadingDate: string;
    channel: string;
    fromLocationId: string;
    fromLocationCode: string;
    fromLocationName: string;
    destinationLocationId: string | null;
    destinationLocationCode: string | null;
    destinationLocationName: string | null;
    agentId: string | null;
    agentName: string | null;
    customerId: string | null;
    customerName: string | null;
    truckId: string | null;
    tripId: string | null;
    tripNo: string | null;
    truckCode: string | null;
    truckPlateNumber: string | null;
    truckName: string | null;
    driverId: string | null;
    driverCode: string | null;
    driverName: string | null;
    routeName: string | null;
    status: LoadingOrderStatus;
    itemCount: number;
    totalQuantity: number;
    totalAmount: number;
    reservedAt: string | null;
    confirmedAt: string | null;
    cancelledAt: string | null;
    remarks: string | null;
    createdById: string;
    reservedById: string | null;
    confirmedById: string | null;
    cancelledById: string | null;
    cancellationReason: string | null;
  }>>`
    SELECT
      lo.id,
      lo."publicId",
      lo."loadingNo",
      lo."loadingDate"::text AS "loadingDate",
      lo.channel,
      lo."fromLocationId",
      fl."locationCode" AS "fromLocationCode",
      fl."locationName" AS "fromLocationName",
      lo."destinationLocationId",
      dl."locationCode" AS "destinationLocationCode",
      dl."locationName" AS "destinationLocationName",
      lo."agentId",
      agent.name AS "agentName",
      lo."customerId",
      customer.name AS "customerName",
      lo."truckId",
      lo."tripId",
      trip."tripNo",
      vehicle."vehicleCode" AS "truckCode",
      vehicle."plateNumber" AS "truckPlateNumber",
      vehicle."vehicleName" AS "truckName",
      lo."driverId",
      driver."driverCode" AS "driverCode",
      driver."fullName" AS "driverName",
      lo."routeName",
      lo.status::text AS status,
      COUNT(lli.id)::int AS "itemCount",
      COALESCE(SUM(lli.quantity), 0)::double precision AS "totalQuantity",
      lo."totalAmount",
      lo."reservedAt"::text AS "reservedAt",
      lo."confirmedAt"::text AS "confirmedAt",
      lo."cancelledAt"::text AS "cancelledAt",
      lo.remarks,
      lo."createdById",
      lo."reservedById",
      lo."confirmedById",
      lo."cancelledById",
      lo."cancellationReason"
    FROM "LoadingOrder" lo
    INNER JOIN "Location" fl ON fl.id = lo."fromLocationId"
    LEFT JOIN "Location" dl ON dl.id = lo."destinationLocationId"
    LEFT JOIN "Customer" agent ON agent.id = lo."agentId"
    LEFT JOIN "Customer" customer ON customer.id = lo."customerId"
    LEFT JOIN "FleetTrip" trip ON trip.id = lo."tripId"
    LEFT JOIN "Vehicle" vehicle ON vehicle.id = lo."truckId"
    LEFT JOIN "FleetDriver" driver ON driver.id = lo."driverId"
    LEFT JOIN "LoadingOrderItem" lli ON lli."loadingOrderId" = lo.id
    WHERE ${isPublicIdParam(id) ? sql`lo."publicId" = ${Number(id)}` : sql`lo.id = ${id}`}
      AND lo."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR lo."fromLocationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    GROUP BY lo.id, fl.id, dl.id, agent.id, customer.id, trip.id, vehicle.id, driver.id
    LIMIT 1
  `;

  const header = headerRows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const [itemRows, reservationRows, dispatches] = await Promise.all([
    sql<Array<{
      id: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      unitId: string | null;
      uomCode: string | null;
      uomName: string | null;
      quantity: number;
      reservedQty: number;
      issuedQty: number;
      unitPrice: number;
      lineTotal: number;
      taxAmount: number;
      discountAmount: number;
      remarks: string | null;
      priceListId: string | null;
      priceListItemId: string | null;
      priceListCode: string | null;
    }>>`
      SELECT
        loi.id,
        loi."itemId",
        i."itemCode",
        i."itemName",
        loi."unitId",
        u.code AS "uomCode",
        u.name AS "uomName",
        loi.quantity,
        loi."reservedQty",
        loi."issuedQty",
        loi."unitPrice",
        loi."lineTotal",
        loi."taxAmount",
        loi."discountAmount",
        loi.remarks,
        loi."priceListId",
        loi."priceListItemId",
        pl.code AS "priceListCode"
      FROM "LoadingOrderItem" loi
      INNER JOIN "Item" i ON i.id = loi."itemId"
      LEFT JOIN "Unit" u ON u.id = loi."unitId"
      LEFT JOIN "PriceList" pl ON pl.id = loi."priceListId"
      WHERE loi."loadingOrderId" = ${documentId}
      ORDER BY loi."createdAt" ASC
    `,
    sql<Array<{
      id: string;
      reservationNo: string;
      sourceItemId: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      locationId: string;
      locationCode: string;
      locationName: string;
      quantity: number;
      releasedQty: number;
      issuedQty: number;
      status: string;
      remarks: string | null;
    }>>`
      SELECT
        sr.id,
        sr."reservationNo",
        sr."sourceItemId",
        sr."itemId",
        i."itemCode",
        i."itemName",
        sr."locationId",
        l."locationCode",
        l."locationName",
        sr.quantity,
        sr."releasedQty",
        sr."issuedQty",
        sr.status::text AS status,
        sr.remarks
      FROM "StockReservation" sr
      INNER JOIN "Item" i ON i.id = sr."itemId"
      INNER JOIN "Location" l ON l.id = sr."locationId"
      WHERE sr."sourceType" = 'sales.loading'
        AND sr."sourceId" = ${documentId}
        AND sr."isArchived" = false
      ORDER BY sr."createdAt" ASC
    `,
    listDispatchesForLoadingOrder(documentId, sql),
  ]);

  const reservationBySourceItem = new Map(reservationRows.map((row) => [row.sourceItemId, row]));

  return {
    id: header.id,
    publicId: Number(header.publicId),
    loadingNo: header.loadingNo,
    loadingDate: header.loadingDate,
    channel: normalizeSalesChannel(header.channel),
    fromLocationId: header.fromLocationId,
    fromLocationCode: header.fromLocationCode,
    fromLocationName: header.fromLocationName,
    destinationLocationId: header.destinationLocationId ?? undefined,
    destinationLocationCode: header.destinationLocationCode ?? undefined,
    destinationLocationName: header.destinationLocationName ?? undefined,
    agentId: header.agentId ?? undefined,
    agentName: header.agentName ?? undefined,
    customerId: header.customerId ?? undefined,
    customerName: header.customerName ?? undefined,
    truckId: header.truckId ?? undefined,
    tripId: header.tripId ?? undefined,
    tripLabel: header.tripNo ? `${header.tripNo}${header.routeName ? ` - ${header.routeName}` : ""}` : undefined,
    truckLabel: header.truckCode ? `${header.truckCode} - ${header.truckPlateNumber ?? header.truckName ?? "Truck"}` : undefined,
    driverId: header.driverId ?? undefined,
    driverName: header.driverCode ? `${header.driverCode} - ${header.driverName ?? "Driver"}` : undefined,
    routeName: header.routeName ?? undefined,
    status: header.status,
    itemCount: Number(header.itemCount ?? 0),
    totalQuantity: Number(header.totalQuantity ?? 0),
    totalAmount: Number(header.totalAmount ?? 0),
    reservedAt: header.reservedAt ?? undefined,
    confirmedAt: header.confirmedAt ?? undefined,
    cancelledAt: header.cancelledAt ?? undefined,
    remarks: header.remarks ?? undefined,
    createdById: header.createdById,
    reservedById: header.reservedById ?? undefined,
    confirmedById: header.confirmedById ?? undefined,
    cancelledById: header.cancelledById ?? undefined,
    cancellationReason: header.cancellationReason ?? undefined,
    items: itemRows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitId: row.unitId ?? undefined,
      uomCode: row.uomCode ?? undefined,
      uomName: row.uomName ?? undefined,
      quantity: Number(row.quantity ?? 0),
      reservedQty: Number(row.reservedQty ?? 0),
      issuedQty: Number(row.issuedQty ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      lineTotal: Number(row.lineTotal ?? 0),
      taxAmount: Number(row.taxAmount ?? 0),
      discountAmount: Number(row.discountAmount ?? 0),
      remarks: row.remarks ?? undefined,
      priceListId: row.priceListId ?? undefined,
      priceListItemId: row.priceListItemId ?? undefined,
      priceListCode: row.priceListCode ?? undefined,
      reservationStatus: reservationBySourceItem.get(row.id)?.status,
      reservationNo: reservationBySourceItem.get(row.id)?.reservationNo,
    })),
    reservations: reservationRows.map((row) => ({
      id: row.id,
      reservationNo: row.reservationNo,
      sourceItemId: row.sourceItemId,
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      locationId: row.locationId,
      locationCode: row.locationCode,
      locationName: row.locationName,
      quantity: Number(row.quantity ?? 0),
      releasedQty: Number(row.releasedQty ?? 0),
      issuedQty: Number(row.issuedQty ?? 0),
      activeQty: Number(row.quantity ?? 0) - Number(row.releasedQty ?? 0) - Number(row.issuedQty ?? 0),
      status: row.status,
      remarks: row.remarks ?? undefined,
    })),
    dispatches,
  };
}
