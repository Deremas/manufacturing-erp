// services/inventory/inventoryService.ts
// Inventory Service for NEW ERP
// Manages stock balances, movements, reservations, and bin-card entries.

import { MovementType } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StockBalance {
  itemId: string;
  locationId: string;
  quantity: number;
  averageCost: number;
  lastUpdated: string; // ISO 8601
}

export interface StockMovement {
  id: string;
  movementType: MovementType;
  reference: string;
  itemId: string;
  locationId: string;
  quantity: number; // positive = in, negative = out
  unitCost: number;
  totalCost: number;
  remarks?: string;
  createdBy: string;
  createdAt: string; // ISO 8601
}

export interface BinCardEntry {
  date: string; // ISO 8601
  reference: string;
  movementType: MovementType;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitCost: number;
  totalCost: number;
  remarks?: string;
}

export interface MovementItem {
  itemId: string;
  quantity: number;
  unitCost?: number;
}

export interface StockMovementInput {
  movementType: MovementType;
  reference: string;
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  remarks?: string;
  createdBy: string;
}

export interface TransferItem {
  itemId: string;
  quantity: number;
  unitCost?: number;
}

// ─── In-memory store (placeholder) ───────────────────────────────────────────
// In production these would be database tables.

const stockBalances: StockBalance[] = [];
const stockMovements: StockMovement[] = [];
const reservations: Map<string, number> = new Map(); // key: `${itemId}_${locationId}_${reference}`

let movementIdCounter = 0;

function nextMovementId(): string {
  movementIdCounter += 1;
  return `mov-${Date.now()}-${movementIdCounter}`;
}

function balanceKey(itemId: string, locationId: string): string {
  return `${itemId}_${locationId}`;
}

function getBalance(
  itemId: string,
  locationId: string,
): StockBalance | undefined {
  return stockBalances.find(
    (b) => b.itemId === itemId && b.locationId === locationId,
  );
}

function upsertBalance(
  itemId: string,
  locationId: string,
  deltaQty: number,
  cost: number,
): StockBalance {
  const key = balanceKey(itemId, locationId);
  const existing = stockBalances.findIndex(
    (b) => b.itemId === itemId && b.locationId === locationId,
  );

  if (existing >= 0) {
    const bal = stockBalances[existing];
    const newQty = bal.quantity + deltaQty;

    // Recalculate average cost on positive movements
    if (deltaQty > 0) {
      const totalCost = bal.quantity * bal.averageCost + deltaQty * cost;
      bal.averageCost = newQty > 0 ? totalCost / newQty : bal.averageCost;
    }

    bal.quantity = newQty;
    bal.lastUpdated = new Date().toISOString();
    return bal;
  }

  const newBalance: StockBalance = {
    itemId,
    locationId,
    quantity: deltaQty,
    averageCost: cost,
    lastUpdated: new Date().toISOString(),
  };
  stockBalances.push(newBalance);
  return newBalance;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the current stock balance for an item at a specific location.
 */
export async function getStockBalance(
  itemId: string,
  locationId: string,
): Promise<StockBalance | null> {
  return getBalance(itemId, locationId) ?? null;
}

/**
 * Create a stock movement record and update the corresponding balance.
 */
export async function createStockMovement(
  data: StockMovementInput,
): Promise<StockMovement> {
  const movement: StockMovement = {
    id: nextMovementId(),
    movementType: data.movementType,
    reference: data.reference,
    itemId: data.itemId,
    locationId: data.locationId,
    quantity: data.quantity,
    unitCost: data.unitCost,
    totalCost: data.quantity * data.unitCost,
    remarks: data.remarks,
    createdBy: data.createdBy,
    createdAt: new Date().toISOString(),
  };

  stockMovements.push(movement);
  upsertBalance(data.itemId, data.locationId, data.quantity, data.unitCost);

  // TODO: Persist to database
  // e.g. await db.stockMovement.create({ data: movement })
  // e.g. await db.stockBalance.upsert(...)

  return movement;
}

/**
 * Transfer stock from one location to another.
 * Creates an OUT movement at `fromLocation` and an IN movement at `toLocation`.
 */
export async function transferStock(
  fromLocation: string,
  toLocation: string,
  items: TransferItem[],
  createdBy: string = "system",
): Promise<StockMovement[]> {
  const movements: StockMovement[] = [];
  const reference = `TRF-${Date.now()}`;

  for (const item of items) {
    const balance = getBalance(item.itemId, fromLocation);
    if (!balance || balance.quantity < item.quantity) {
      throw new Error(
        `Insufficient stock for item ${item.itemId} at location ${fromLocation}`,
      );
    }

    const cost = item.unitCost ?? balance.averageCost;

    // Out movement
    const outMovement = await createStockMovement({
      movementType: MovementType.TRANSFER_OUT,
      reference,
      itemId: item.itemId,
      locationId: fromLocation,
      quantity: -Math.abs(item.quantity),
      unitCost: cost,
      remarks: `Transfer to ${toLocation}`,
      createdBy,
    });
    movements.push(outMovement);

    // In movement
    const inMovement = await createStockMovement({
      movementType: MovementType.TRANSFER_IN,
      reference,
      itemId: item.itemId,
      locationId: toLocation,
      quantity: Math.abs(item.quantity),
      unitCost: cost,
      remarks: `Transfer from ${fromLocation}`,
      createdBy,
    });
    movements.push(inMovement);
  }

  return movements;
}

/**
 * Reserve stock for a specific reference (e.g. sales order, work order).
 */
export async function reserveStock(
  itemId: string,
  locationId: string,
  qty: number,
  reference: string,
): Promise<void> {
  const balance = getBalance(itemId, locationId);
  if (!balance || balance.quantity < qty) {
    throw new Error(
      `Insufficient stock to reserve ${qty} of ${itemId} at ${locationId}`,
    );
  }

  const key = `${itemId}_${locationId}_${reference}`;
  const currentReserved = reservations.get(key) ?? 0;
  reservations.set(key, currentReserved + qty);

  // Reduce available balance
  upsertBalance(itemId, locationId, -qty, balance.averageCost);

  await createStockMovement({
    movementType: MovementType.RESERVATION,
    reference,
    itemId,
    locationId,
    quantity: -qty,
    unitCost: balance.averageCost,
    remarks: `Reserved for ${reference}`,
    createdBy: "system",
  });
}

/**
 * Release a reservation, returning stock to available balance.
 */
export async function releaseReservation(reference: string): Promise<void> {
  // Find all reservations for this reference
  for (const [key, qty] of reservations.entries()) {
    if (key.endsWith(`_${reference}`)) {
      const [itemId, locationId] = key.split("_");
      if (!itemId || !locationId) continue;

      reservations.delete(key);
      const balance = getBalance(itemId, locationId);
      const cost = balance?.averageCost ?? 0;

      upsertBalance(itemId, locationId, qty, cost);

      await createStockMovement({
        movementType: MovementType.RELEASE_RESERVATION,
        reference,
        itemId,
        locationId,
        quantity: qty,
        unitCost: cost,
        remarks: `Reservation released for ${reference}`,
        createdBy: "system",
      });
    }
  }
}

/**
 * Adjust stock at a given location (positive or negative).
 */
export async function adjustStock(
  itemId: string,
  locationId: string,
  qty: number,
  reason: string,
  createdBy: string = "system",
): Promise<StockMovement> {
  const balance = getBalance(itemId, locationId);
  const cost = balance?.averageCost ?? 0;

  const movementType =
    qty >= 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;

  return createStockMovement({
    movementType,
    reference: `ADJ-${Date.now()}`,
    itemId,
    locationId,
    quantity: qty,
    unitCost: cost,
    remarks: reason,
    createdBy,
  });
}

/**
 * Issue stock from a location (negative movement).
 */
export async function issueStock(
  reference: string,
  items: MovementItem[],
  createdBy: string = "system",
): Promise<StockMovement[]> {
  const movements: StockMovement[] = [];

  for (const item of items) {
    const balance = getBalance(item.itemId, "");
    const cost = item.unitCost ?? balance?.averageCost ?? 0;

    const movement = await createStockMovement({
      movementType: MovementType.PRODUCTION_ISSUE,
      reference,
      itemId: item.itemId,
      locationId: "", // production floor
      quantity: -Math.abs(item.quantity),
      unitCost: cost,
      remarks: `Issued for ${reference}`,
      createdBy,
    });
    movements.push(movement);
  }

  return movements;
}

/**
 * Receive stock into a location (positive movement).
 */
export async function receiveStock(
  reference: string,
  items: MovementItem[],
  locationId: string = "store",
  createdBy: string = "system",
): Promise<StockMovement[]> {
  const movements: StockMovement[] = [];

  for (const item of items) {
    const cost = item.unitCost ?? 0;

    const movement = await createStockMovement({
      movementType: MovementType.PURCHASE_RECEIPT,
      reference,
      itemId: item.itemId,
      locationId,
      quantity: Math.abs(item.quantity),
      unitCost: cost,
      remarks: `Received via ${reference}`,
      createdBy,
    });
    movements.push(movement);
  }

  return movements;
}

/**
 * Calculate weighted-average cost for an item at a given location.
 */
export async function calculateAverageCost(
  itemId: string,
  locationId: string,
): Promise<number> {
  const balance = getBalance(itemId, locationId);
  return balance?.averageCost ?? 0;
}

/**
 * Get the bin-card (movement history) for an item at a location.
 * Optionally filtered by date range.
 */
export async function getBinCard(
  itemId: string,
  locationId: string,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<BinCardEntry[]> {
  let movements = stockMovements.filter(
    (m) => m.itemId === itemId && m.locationId === locationId,
  );

  if (dateFrom) {
    const from = dateFrom.getTime();
    movements = movements.filter(
      (m) => new Date(m.createdAt).getTime() >= from,
    );
  }

  if (dateTo) {
    const to = dateTo.getTime();
    movements = movements.filter((m) => new Date(m.createdAt).getTime() <= to);
  }

  movements.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  let runningBalance = 0;
  return movements.map((m) => {
    runningBalance += m.quantity;
    return {
      date: m.createdAt,
      reference: m.reference,
      movementType: m.movementType,
      quantityIn: m.quantity > 0 ? m.quantity : 0,
      quantityOut: m.quantity < 0 ? Math.abs(m.quantity) : 0,
      balance: runningBalance,
      unitCost: m.unitCost,
      totalCost: m.totalCost,
      remarks: m.remarks,
    };
  });
}
