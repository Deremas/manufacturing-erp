import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { allocateNextDocumentNumber } from "@/lib/document-numbering";
import { issueForSales } from "@/services/inventory/inventory-posting.service";

type Tx = typeof sql;

export type ReservationStatus =
  | "ACTIVE"
  | "PARTIALLY_RELEASED"
  | "RELEASED"
  | "ISSUED"
  | "CANCELLED";

interface ReservationOptions {
  tx?: Tx;
}

export interface ReserveStockInput {
  sourceType: string;
  sourceId: string;
  sourceItemId: string;
  itemId: string;
  locationId: string;
  quantity: number;
  createdById: string;
  remarks?: string | null;
}

export interface UpdateReservationInput {
  reservationId: string;
  targetQuantity: number;
  updatedById: string;
  remarks?: string | null;
}

export interface ReleaseReservationInput {
  reservationId: string;
  quantity?: number;
  releasedById: string;
  status?: Extract<ReservationStatus, "RELEASED" | "CANCELLED" | "PARTIALLY_RELEASED">;
  remarks?: string | null;
}

export interface IssueReservedStockInput {
  reservationId: string;
  quantity?: number;
  createdById: string;
  sourceModule: string;
  sourceDocumentId: string;
  unitCost?: number;
  remarks?: string | null;
}

export interface AdjustReservedStockInput {
  itemId: string;
  locationId: string;
  quantityDelta: number;
  sourceType: string;
  sourceId: string;
  adjustedById: string;
  remarks?: string | null;
}

export interface StockReservationRow {
  id: string;
  reservationNo: string;
  sourceType: string;
  sourceId: string;
  sourceItemId: string;
  itemId: string;
  locationId: string;
  quantity: number;
  releasedQty: number;
  issuedQty: number;
  activeQty: number;
  status: ReservationStatus;
  reservedById: string;
  reservedAt: string;
  releasedAt?: string | null;
  issuedAt?: string | null;
  remarks?: string | null;
}

async function nextReservationNumber(tx: Tx, prefix: string) {
  return allocateNextDocumentNumber(tx, prefix, `Inventory reservation sequence for ${prefix}`);
}

async function ensureItemAndLocation(tx: Tx, itemId: string, locationId: string) {
  const [itemRows, locationRows] = await Promise.all([
    tx<Array<{ id: string }>>`
      SELECT id
      FROM "Item"
      WHERE id = ${itemId}
        AND "isArchived" = false
      LIMIT 1
    `,
    tx<Array<{ id: string; isActive: boolean; isQcHoldLocation: boolean }>>`
      SELECT id, "isActive", "isQcHoldLocation"
      FROM "Location"
      WHERE id = ${locationId}
        AND "isArchived" = false
      LIMIT 1
    `,
  ]);

  if (!itemRows[0]) {
    throw new Error("Reservation item was not found");
  }

  if (!locationRows[0]) {
    throw new Error("Reservation location was not found");
  }

  if (!locationRows[0].isActive) {
    throw new Error("Reservation location is inactive");
  }
  if (locationRows[0].isQcHoldLocation) {
    throw new Error("Stock in a QC hold location cannot be reserved for sales or dispatch");
  }
}

async function getLockedBalance(tx: Tx, itemId: string, locationId: string) {
  const rows = await tx<Array<{
    id: string;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    averageCost: number;
  }>>`
    SELECT id, quantity, "reservedQuantity", "availableQuantity", "averageCost"
    FROM "StockBalance"
    WHERE "itemId" = ${itemId}
      AND "locationId" = ${locationId}
      AND "isArchived" = false
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

function getActiveQuantity(reservation: {
  quantity: number;
  releasedQty: number;
  issuedQty: number;
}) {
  return Number(reservation.quantity ?? 0) - Number(reservation.releasedQty ?? 0) - Number(reservation.issuedQty ?? 0);
}

async function writeReservationAudit(
  tx: Tx,
  userId: string,
  action: string,
  reservationId: string,
  oldValue: unknown,
  newValue: unknown,
) {
  await tx`
    INSERT INTO "AuditLog" (
      id, "userId", action, module, "recordId", "oldValue", "newValue", "isArchived", timestamp
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      ${action},
      'inventory.reservation',
      ${reservationId},
      ${oldValue ? JSON.stringify(oldValue) : null},
      ${newValue ? JSON.stringify(newValue) : null},
      false,
      NOW()
    )
  `;
}

async function writeReservationHistory(
  tx: Tx,
  sourceType: string,
  sourceId: string,
  action: string,
  performedById: string,
  comment?: string | null,
) {
  await tx`
    INSERT INTO "DocumentHistory" (
      id, "referenceType", "referenceId", action, comment, "performedById", "isArchived", "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${sourceType},
      ${sourceId},
      ${action},
      ${comment ?? null},
      ${performedById},
      false,
      NOW()
    )
  `;
}

async function getReservationForUpdate(tx: Tx, reservationId: string) {
  const rows = await tx<Array<{
    id: string;
    reservationNo: string;
    sourceType: string;
    sourceId: string;
    sourceItemId: string;
    itemId: string;
    locationId: string;
    quantity: number;
    releasedQty: number;
    issuedQty: number;
    status: ReservationStatus;
    reservedById: string;
    reservedAt: Date;
    releasedAt: Date | null;
    issuedAt: Date | null;
    remarks: string | null;
  }>>`
    SELECT
      id,
      "reservationNo",
      "sourceType",
      "sourceId",
      "sourceItemId",
      "itemId",
      "locationId",
      quantity,
      "releasedQty",
      "issuedQty",
      status::text AS status,
      "reservedById",
      "reservedAt",
      "releasedAt",
      "issuedAt",
      remarks
    FROM "StockReservation"
    WHERE id = ${reservationId}
      AND "isArchived" = false
    LIMIT 1
    FOR UPDATE
  `;

  const reservation = rows[0];
  if (!reservation) {
    throw new Error("Stock reservation was not found");
  }

  return reservation;
}

function mapReservationRow(row: Awaited<ReturnType<typeof getReservationForUpdate>>): StockReservationRow {
  return {
    id: row.id,
    reservationNo: row.reservationNo,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceItemId: row.sourceItemId,
    itemId: row.itemId,
    locationId: row.locationId,
    quantity: Number(row.quantity ?? 0),
    releasedQty: Number(row.releasedQty ?? 0),
    issuedQty: Number(row.issuedQty ?? 0),
    activeQty: getActiveQuantity(row),
    status: row.status,
    reservedById: row.reservedById,
    reservedAt: row.reservedAt.toISOString(),
    releasedAt: row.releasedAt?.toISOString() ?? null,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    remarks: row.remarks ?? null,
  };
}

export async function validateAvailableForReservation(
  itemId: string,
  locationId: string,
  quantity: number,
  options: ReservationOptions = {},
) {
  const execute = async (tx: Tx) => {
    await ensureItemAndLocation(tx, itemId, locationId);
    const balance = await getLockedBalance(tx, itemId, locationId);
    if (!balance) {
      throw new Error("No stock balance exists for the selected item and location");
    }

    const availableQuantity = Number(balance.availableQuantity ?? balance.quantity - balance.reservedQuantity);
    if (availableQuantity < quantity) {
      throw new Error("Requested quantity exceeds available stock for reservation");
    }

    return {
      quantity: Number(balance.quantity ?? 0),
      reservedQuantity: Number(balance.reservedQuantity ?? 0),
      availableQuantity,
      averageCost: Number(balance.averageCost ?? 0),
    };
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

/**
 * Adjusts non-sales reservations, such as QC quarantine holds, while keeping
 * StockBalance writes inside the Inventory boundary.
 */
export async function adjustReservedStock(
  input: AdjustReservedStockInput,
  options: ReservationOptions = {},
) {
  const execute = async (tx: Tx) => {
    const delta = Number(input.quantityDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      throw new Error("Reservation adjustment must be a non-zero quantity");
    }

    const [itemRows, locationRows] = await Promise.all([
      tx<Array<{ id: string }>>`SELECT id FROM "Item" WHERE id = ${input.itemId} AND "isArchived" = false LIMIT 1`,
      tx<Array<{ id: string; isActive: boolean }>>`SELECT id, "isActive" FROM "Location" WHERE id = ${input.locationId} AND "isArchived" = false LIMIT 1`,
    ]);
    if (!itemRows[0]) throw new Error("Reservation item was not found");
    if (!locationRows[0]?.isActive) throw new Error("Reservation location was not found or is inactive");

    const balance = await getLockedBalance(tx, input.itemId, input.locationId);
    if (!balance) throw new Error("No stock balance exists for the selected item and location");

    const oldReserved = Number(balance.reservedQuantity ?? 0);
    const quantity = Number(balance.quantity ?? 0);
    const available = Number(balance.availableQuantity ?? quantity - oldReserved);
    if (delta > 0 && available + 0.000001 < delta) {
      throw new Error("Requested hold quantity exceeds available stock");
    }
    if (delta < 0 && oldReserved + 0.000001 < Math.abs(delta)) {
      throw new Error("Reservation release exceeds the location's reserved stock");
    }

    const reservedQuantity = oldReserved + delta;
    const availableQuantity = quantity - reservedQuantity;
    await tx`
      UPDATE "StockBalance"
      SET "reservedQuantity" = ${reservedQuantity},
          "availableQuantity" = ${availableQuantity},
          "updatedAt" = NOW()
      WHERE id = ${balance.id}
    `;
    await writeReservationAudit(
      tx,
      input.adjustedById,
      delta > 0 ? "HOLD" : "RELEASE_HOLD",
      input.sourceId,
      { reservedQuantity: oldReserved, availableQuantity: available },
      { reservedQuantity, availableQuantity, quantityDelta: delta },
    );
    await writeReservationHistory(
      tx,
      input.sourceType,
      input.sourceId,
      delta > 0 ? "RESERVE_STOCK" : "RELEASE_RESERVED_STOCK",
      input.adjustedById,
      input.remarks ?? null,
    );
    return { quantity, reservedQuantity, availableQuantity, appliedQuantity: delta };
  };

  if (options.tx) return execute(options.tx);
  return sql.begin(execute);
}

export async function getReservationBySource(
  sourceType: string,
  sourceId: string,
  options: ReservationOptions = {},
) {
  const execute = async (tx: Tx) => tx<Array<{
    id: string;
    reservationNo: string;
    sourceType: string;
    sourceId: string;
    sourceItemId: string;
    itemId: string;
    locationId: string;
    quantity: number;
    releasedQty: number;
    issuedQty: number;
    status: ReservationStatus;
    reservedById: string;
    reservedAt: Date;
    releasedAt: Date | null;
    issuedAt: Date | null;
    remarks: string | null;
  }>>`
    SELECT
      id,
      "reservationNo",
      "sourceType",
      "sourceId",
      "sourceItemId",
      "itemId",
      "locationId",
      quantity,
      "releasedQty",
      "issuedQty",
      status::text AS status,
      "reservedById",
      "reservedAt",
      "releasedAt",
      "issuedAt",
      remarks
    FROM "StockReservation"
    WHERE "sourceType" = ${sourceType}
      AND "sourceId" = ${sourceId}
      AND "isArchived" = false
    ORDER BY "createdAt" ASC
  `;

  const rows = options.tx ? await execute(options.tx) : await execute(sql);

  return rows.map((row) => mapReservationRow(row));
}

export async function reserveStock(
  input: ReserveStockInput,
  options: ReservationOptions = {},
) {
  const execute = async (tx: Tx) => {
    const quantity = Number(input.quantity ?? 0);
    if (!(quantity > 0)) {
      throw new Error("Reservation quantity must be greater than zero");
    }

    await ensureItemAndLocation(tx, input.itemId, input.locationId);
    const balance = await getLockedBalance(tx, input.itemId, input.locationId);
    if (!balance) {
      throw new Error("No stock balance exists for the selected item and location");
    }

    const availableQuantity = Number(balance.availableQuantity ?? balance.quantity - balance.reservedQuantity);
    if (availableQuantity < quantity) {
      throw new Error("Requested quantity exceeds available stock for reservation");
    }

    const reservationId = randomUUID();
    const reservationNo = await nextReservationNumber(tx, "RSV");
    const nextReservedQuantity = Number(balance.reservedQuantity ?? 0) + quantity;
    const nextAvailableQuantity = Number(balance.quantity ?? 0) - nextReservedQuantity;

    await tx`
      UPDATE "StockBalance"
      SET
        "reservedQuantity" = ${nextReservedQuantity},
        "availableQuantity" = ${nextAvailableQuantity},
        "updatedAt" = NOW()
      WHERE id = ${balance.id}
    `;

    await tx`
      INSERT INTO "StockReservation" (
        id, "reservationNo", "sourceType", "sourceId", "sourceItemId", "itemId", "locationId",
        quantity, "releasedQty", "issuedQty", status, "reservedById", "reservedAt", remarks,
        "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${reservationId},
        ${reservationNo},
        ${input.sourceType},
        ${input.sourceId},
        ${input.sourceItemId},
        ${input.itemId},
        ${input.locationId},
        ${quantity},
        0,
        0,
        'ACTIVE'::"ReservationStatus",
        ${input.createdById},
        NOW(),
        ${input.remarks ?? null},
        false,
        NOW(),
        NOW()
      )
    `;

    const snapshot = {
      reservationNo,
      itemId: input.itemId,
      locationId: input.locationId,
      quantity,
      reservedQuantity: nextReservedQuantity,
      availableQuantity: nextAvailableQuantity,
    };

    await writeReservationAudit(tx, input.createdById, "RESERVE", reservationId, null, snapshot);
    await writeReservationHistory(
      tx,
      input.sourceType,
      input.sourceId,
      "RESERVED",
      input.createdById,
      `Reserved ${quantity} units under ${reservationNo}`,
    );

    return {
      id: reservationId,
      reservationNo,
      itemId: input.itemId,
      locationId: input.locationId,
      quantity,
      reservedQuantity: nextReservedQuantity,
      availableQuantity: nextAvailableQuantity,
    };
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function updateReservation(
  input: UpdateReservationInput,
  options: ReservationOptions = {},
) {
  const execute = async (tx: Tx) => {
    const targetQuantity = Number(input.targetQuantity ?? 0);
    if (targetQuantity < 0) {
      throw new Error("Target reservation quantity cannot be negative");
    }

    const reservation = await getReservationForUpdate(tx, input.reservationId);
    if (reservation.status === "ISSUED" || reservation.status === "CANCELLED") {
      throw new Error("Issued or cancelled reservations cannot be updated");
    }

    const currentActiveQuantity = getActiveQuantity(reservation);
    const diff = targetQuantity - currentActiveQuantity;
    if (diff === 0) {
      return mapReservationRow(reservation);
    }

    const balance = await getLockedBalance(tx, reservation.itemId, reservation.locationId);
    if (!balance) {
      throw new Error("No stock balance exists for this reservation");
    }

    let nextReservedQuantity = Number(balance.reservedQuantity ?? 0);
    let nextAvailableQuantity = Number(balance.availableQuantity ?? balance.quantity - balance.reservedQuantity);
    let nextQuantity = Number(reservation.quantity ?? 0);
    let nextReleasedQty = Number(reservation.releasedQty ?? 0);
    let nextStatus: ReservationStatus = reservation.status;

    if (diff > 0) {
      if (nextAvailableQuantity < diff) {
        throw new Error("Requested quantity exceeds available stock for reservation");
      }
      nextReservedQuantity += diff;
      nextAvailableQuantity = Number(balance.quantity ?? 0) - nextReservedQuantity;
      nextQuantity += diff;
      nextStatus = "ACTIVE";
    } else {
      const releaseQty = Math.abs(diff);
      if (currentActiveQuantity < releaseQty) {
        throw new Error("Cannot release more than the currently active reserved quantity");
      }
      nextReservedQuantity -= releaseQty;
      nextAvailableQuantity = Number(balance.quantity ?? 0) - nextReservedQuantity;
      nextReleasedQty += releaseQty;
      nextStatus = targetQuantity === 0 ? "RELEASED" : "PARTIALLY_RELEASED";
    }

    await tx`
      UPDATE "StockBalance"
      SET
        "reservedQuantity" = ${nextReservedQuantity},
        "availableQuantity" = ${nextAvailableQuantity},
        "updatedAt" = NOW()
      WHERE id = ${balance.id}
    `;

    await tx`
      UPDATE "StockReservation"
      SET
        quantity = ${nextQuantity},
        "releasedQty" = ${nextReleasedQty},
        status = ${nextStatus}::"ReservationStatus",
        remarks = ${input.remarks ?? reservation.remarks},
        "releasedAt" = CASE
          WHEN ${diff} < 0 THEN NOW()
          ELSE "releasedAt"
        END,
        "updatedAt" = NOW()
      WHERE id = ${reservation.id}
    `;

    await writeReservationAudit(
      tx,
      input.updatedById,
      "UPDATE_RESERVATION",
      reservation.id,
      mapReservationRow(reservation),
      {
        targetQuantity,
        diff,
        reservedQuantity: nextReservedQuantity,
        availableQuantity: nextAvailableQuantity,
        status: nextStatus,
      },
    );
    await writeReservationHistory(
      tx,
      reservation.sourceType,
      reservation.sourceId,
      diff > 0 ? "RESERVATION_INCREASED" : "RESERVATION_RELEASED",
      input.updatedById,
      diff > 0
        ? `Increased reservation by ${diff}`
        : `Released ${Math.abs(diff)} from reservation`,
    );

    const refreshed = await getReservationForUpdate(tx, reservation.id);
    return mapReservationRow(refreshed);
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function releaseReservation(
  input: ReleaseReservationInput,
  options: ReservationOptions = {},
) {
  const execute = async (tx: Tx) => {
    const reservation = await getReservationForUpdate(tx, input.reservationId);
    const activeQuantity = getActiveQuantity(reservation);
    if (activeQuantity <= 0) {
      return mapReservationRow(reservation);
    }

    const releaseQty = Math.min(
      activeQuantity,
      Number(input.quantity ?? activeQuantity),
    );
    if (!(releaseQty > 0)) {
      throw new Error("Release quantity must be greater than zero");
    }

    const balance = await getLockedBalance(tx, reservation.itemId, reservation.locationId);
    if (!balance) {
      throw new Error("No stock balance exists for this reservation");
    }

    const nextReservedQuantity = Number(balance.reservedQuantity ?? 0) - releaseQty;
    const nextAvailableQuantity = Number(balance.quantity ?? 0) - nextReservedQuantity;
    const nextReleasedQty = Number(reservation.releasedQty ?? 0) + releaseQty;
    const remainingActive = activeQuantity - releaseQty;
    const nextStatus =
      remainingActive > 0
        ? (input.status ?? "PARTIALLY_RELEASED")
        : (input.status ?? "RELEASED");

    await tx`
      UPDATE "StockBalance"
      SET
        "reservedQuantity" = ${nextReservedQuantity},
        "availableQuantity" = ${nextAvailableQuantity},
        "updatedAt" = NOW()
      WHERE id = ${balance.id}
    `;

    await tx`
      UPDATE "StockReservation"
      SET
        "releasedQty" = ${nextReleasedQty},
        status = ${nextStatus}::"ReservationStatus",
        remarks = ${input.remarks ?? reservation.remarks},
        "releasedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${reservation.id}
    `;

    await writeReservationAudit(
      tx,
      input.releasedById,
      nextStatus === "CANCELLED" ? "CANCEL_RESERVATION" : "RELEASE_RESERVATION",
      reservation.id,
      mapReservationRow(reservation),
      {
        releaseQty,
        reservedQuantity: nextReservedQuantity,
        availableQuantity: nextAvailableQuantity,
        status: nextStatus,
      },
    );
    await writeReservationHistory(
      tx,
      reservation.sourceType,
      reservation.sourceId,
      nextStatus === "CANCELLED" ? "RESERVATION_CANCELLED" : "RESERVATION_RELEASED",
      input.releasedById,
      `${nextStatus === "CANCELLED" ? "Cancelled" : "Released"} ${releaseQty} from reservation ${reservation.reservationNo}`,
    );

    const refreshed = await getReservationForUpdate(tx, reservation.id);
    return mapReservationRow(refreshed);
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function issueReservedStock(
  input: IssueReservedStockInput,
  options: ReservationOptions = {},
) {
  const execute = async (tx: Tx) => {
    const reservation = await getReservationForUpdate(tx, input.reservationId);
    if (reservation.status === "CANCELLED") {
      throw new Error("Cancelled reservations cannot be issued");
    }

    const activeQuantity = getActiveQuantity(reservation);
    const issueQty = Math.min(activeQuantity, Number(input.quantity ?? activeQuantity));
    if (!(issueQty > 0)) {
      throw new Error("Issue quantity must be greater than zero");
    }

    const balance = await getLockedBalance(tx, reservation.itemId, reservation.locationId);
    if (!balance) {
      throw new Error("No stock balance exists for this reservation");
    }

    const nextReservedQuantity = Number(balance.reservedQuantity ?? 0) - issueQty;
    const nextAvailableQuantity = Number(balance.quantity ?? 0) - nextReservedQuantity;

    await tx`
      UPDATE "StockBalance"
      SET
        "reservedQuantity" = ${nextReservedQuantity},
        "availableQuantity" = ${nextAvailableQuantity},
        "updatedAt" = NOW()
      WHERE id = ${balance.id}
    `;

    const movement = await issueForSales(
      {
        itemId: reservation.itemId,
        locationId: reservation.locationId,
        sourceModule: input.sourceModule,
        sourceDocumentId: input.sourceDocumentId,
        qtyIn: issueQty,
        qtyOut: 0,
        unitCost: Number(input.unitCost ?? balance.averageCost ?? 0),
        remarks: input.remarks ?? reservation.remarks ?? undefined,
        createdById: input.createdById,
      },
      { tx },
    );

    const nextIssuedQty = Number(reservation.issuedQty ?? 0) + issueQty;
    const remainingActive = activeQuantity - issueQty;
    const nextStatus: ReservationStatus = remainingActive > 0 ? "ACTIVE" : "ISSUED";

    await tx`
      UPDATE "StockReservation"
      SET
        "issuedQty" = ${nextIssuedQty},
        status = ${nextStatus}::"ReservationStatus",
        "issuedAt" = NOW(),
        remarks = ${input.remarks ?? reservation.remarks},
        "updatedAt" = NOW()
      WHERE id = ${reservation.id}
    `;

    await writeReservationAudit(
      tx,
      input.createdById,
      "ISSUE_RESERVED_STOCK",
      reservation.id,
      mapReservationRow(reservation),
      {
        issueQty,
        reservedQuantity: nextReservedQuantity,
        availableQuantity: nextAvailableQuantity,
        movementId: movement.movementId,
        movementNumber: movement.movementNumber,
        status: nextStatus,
      },
    );
    await writeReservationHistory(
      tx,
      reservation.sourceType,
      reservation.sourceId,
      "RESERVATION_ISSUED",
      input.createdById,
      `Issued ${issueQty} from reservation ${reservation.reservationNo}`,
    );

    const refreshed = await getReservationForUpdate(tx, reservation.id);
    return {
      reservation: mapReservationRow(refreshed),
      movement,
    };
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}
