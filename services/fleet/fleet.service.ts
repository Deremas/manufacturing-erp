import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import type { FleetDriver, FleetTrip, FuelRecord, Vehicle } from "@/features/fleet/types";
import { summarizeFleetTripReconciliation } from "@/services/fleet/fleet-reconciliation.service";
import { syncPostedFuelFinance, voidFuelFinance } from "@/services/fleet/fleet-finance.service";

type Tx = typeof sql;

type FleetScope = {
  accessibleLocationIds?: string[] | null;
};

type TripLifecycleStatus =
  | "PLANNED"
  | "ASSIGNED"
  | "LOADING"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED";

type FuelRecordStatus = "DRAFT" | "POSTED" | "CANCELLED";

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeCode(value: unknown) {
  const text = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
  return text.length > 0 ? text : null;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error("Invalid numeric value");
  }

  return numeric;
}

function normalizeDateTime(value: unknown) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value");
  }

  return parsed.toISOString();
}

function normalizeTripLifecycleStatus(value: unknown) {
  const status = normalizeCode(value) ?? "PLANNED";
  switch (status) {
    case "PLANNED":
    case "ASSIGNED":
    case "LOADING":
    case "DISPATCHED":
    case "IN_TRANSIT":
    case "ARRIVED":
    case "COMPLETED":
    case "CANCELLED":
      return status as TripLifecycleStatus;
    default:
      throw new Error("Unsupported trip status");
  }
}

function normalizeFuelStatus(value: unknown) {
  const status = normalizeCode(value) ?? "POSTED";
  switch (status) {
    case "DRAFT":
    case "POSTED":
    case "CANCELLED":
      return status as FuelRecordStatus;
    default:
      throw new Error("Unsupported fuel status");
  }
}

function mapVehicle(row: {
  id: string;
  vehicleCode: string;
  plateNumber: string;
  vehicleName: string;
  vehicleType: string | null;
  capacity: number | null;
  isActive: boolean;
}): Vehicle {
  return {
    id: row.id,
    vehicleCode: row.vehicleCode,
    plateNumber: row.plateNumber,
    vehicleName: row.vehicleName,
    vehicleType: row.vehicleType ?? undefined,
    capacity: row.capacity ?? undefined,
    isActive: row.isActive,
  };
}

function mapDriver(row: {
  id: string;
  driverCode: string;
  fullName: string;
  phone: string | null;
  licenseNumber: string | null;
  isActive: boolean;
}): FleetDriver {
  return {
    id: row.id,
    driverCode: row.driverCode,
    fullName: row.fullName,
    phone: row.phone ?? undefined,
    licenseNumber: row.licenseNumber ?? undefined,
    isActive: row.isActive,
  };
}

type FleetTripRow = {
  id: string;
  publicId: number;
  tripNo: string;
  tripDate: string;
  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;
  plateNumber: string;
  driverId: string | null;
  driverCode: string | null;
  driverName: string | null;
  fromLocationId: string | null;
  fromLocationCode: string | null;
  fromLocationName: string | null;
  destinationId: string | null;
  destinationCode: string | null;
  destinationName: string | null;
  routeName: string;
  routeDescription: string | null;
  plannedDeparture: string | null;
  actualDeparture: string | null;
  plannedArrival: string | null;
  actualArrival: string | null;
  openingOdometer: number | null;
  closingOdometer: number | null;
  distance: number | null;
  deliveryRemarks: string | null;
  status: string;
  reconciliationDecision: string | null;
  reconciliationNote: string | null;
  reconciledAt: string | null;
  reconciledById: string | null;
  remarks: string | null;
  isActive: boolean;
  loadingCount: number | null;
  loadingQuantity: number | null;
  dispatchCount: number | null;
  dispatchQuantity: number | null;
  saleCount: number | null;
  soldQuantity: number | null;
  soldAmount: number | null;
  expectedCollection: number | null;
  actualCollection: number | null;
  creditSales: number | null;
  fuelRecordCount: number | null;
  fuelQuantity: number | null;
  fuelCost: number | null;
};

function mapTrip(row: FleetTripRow): FleetTrip {
  const reconciliation = summarizeFleetTripReconciliation({
    loadingQuantity: row.loadingQuantity,
    dispatchQuantity: row.dispatchQuantity,
    soldQuantity: row.soldQuantity,
    fuelCost: row.fuelCost,
    distance: row.distance,
    expectedCollection: row.expectedCollection,
    actualCollection: row.actualCollection,
    creditSales: row.creditSales,
  });

  return {
    id: row.id,
    publicId: row.publicId,
    tripNo: row.tripNo,
    tripDate: row.tripDate,
    vehicleId: row.vehicleId,
    vehicleCode: row.vehicleCode,
    vehicleName: row.vehicleName,
    plateNumber: row.plateNumber,
    driverId: row.driverId ?? undefined,
    driverCode: row.driverCode ?? undefined,
    driverName: row.driverName ?? undefined,
    fromLocationId: row.fromLocationId ?? undefined,
    fromLocationLabel: row.fromLocationCode
      ? `${row.fromLocationCode} - ${row.fromLocationName ?? ""}`.trim()
      : undefined,
    destinationId: row.destinationId ?? undefined,
    destinationLabel: row.destinationCode
      ? `${row.destinationCode} - ${row.destinationName ?? ""}`.trim()
      : undefined,
    routeName: row.routeName,
    routeDescription: row.routeDescription ?? undefined,
    plannedDeparture: row.plannedDeparture ?? undefined,
    actualDeparture: row.actualDeparture ?? undefined,
    plannedArrival: row.plannedArrival ?? undefined,
    actualArrival: row.actualArrival ?? undefined,
    openingOdometer: row.openingOdometer ?? undefined,
    closingOdometer: row.closingOdometer ?? undefined,
    distance: row.distance ?? undefined,
    deliveryRemarks: row.deliveryRemarks ?? undefined,
    status: row.status,
    reconciliationDecision: (row.reconciliationDecision as FleetTrip["reconciliationDecision"]) ?? undefined,
    reconciliationNote: row.reconciliationNote ?? undefined,
    reconciledAt: row.reconciledAt ?? undefined,
    reconciledById: row.reconciledById ?? undefined,
    remarks: row.remarks ?? undefined,
    isActive: row.isActive,
    loadingCount: Number(row.loadingCount ?? 0),
    loadingQuantity: Number(row.loadingQuantity ?? 0),
    dispatchCount: Number(row.dispatchCount ?? 0),
    dispatchQuantity: Number(row.dispatchQuantity ?? 0),
    saleCount: Number(row.saleCount ?? 0),
    soldQuantity: Number(row.soldQuantity ?? 0),
    soldAmount: Number(row.soldAmount ?? 0),
    expectedCollection: reconciliation.expectedCollection,
    actualCollection: reconciliation.actualCollection,
    creditSales: reconciliation.creditSales,
    paymentVariance: reconciliation.paymentVariance,
    fuelRecordCount: Number(row.fuelRecordCount ?? 0),
    fuelQuantity: Number(row.fuelQuantity ?? 0),
    fuelCost: Number(row.fuelCost ?? 0),
    undispatchedQuantity: reconciliation.undispatchedQuantity,
    unsoldQuantity: reconciliation.unsoldQuantity,
    overDispatchedQuantity: reconciliation.overDispatchedQuantity,
    overSoldQuantity: reconciliation.overSoldQuantity,
    dispatchCompletionPercent: reconciliation.dispatchCompletionPercent,
    salesCompletionPercent: reconciliation.salesCompletionPercent,
    fuelCostPerKm: reconciliation.fuelCostPerKm ?? undefined,
    fuelCostPerSoldUnit: reconciliation.fuelCostPerSoldUnit ?? undefined,
    reconciliationStatus: reconciliation.status,
  };
}

type FuelRecordRow = {
  id: string;
  fuelNo: string;
  fuelDate: string;
  vehicleId: string;
  vehicleCode: string | null;
  plateNumber: string | null;
  vehicleName: string | null;
  driverId: string | null;
  driverCode: string | null;
  driverName: string | null;
  tripId: string | null;
  tripNo: string | null;
  routeName: string | null;
  locationId: string | null;
  locationCode: string | null;
  locationName: string | null;
  fuelType: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  odometer: number | null;
  supplierId: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  bankAccountId: string | null;
  bankAccountCode: string | null;
  bankAccountName: string | null;
  status: string;
  remarks: string | null;
  postedAt: string | null;
};

function mapFuelRecord(row: FuelRecordRow): FuelRecord {
  return {
    id: row.id,
    fuelNo: row.fuelNo,
    fuelDate: row.fuelDate,
    vehicleId: row.vehicleId,
    vehicleLabel: row.vehicleCode
      ? `${row.vehicleCode} - ${row.plateNumber ?? row.vehicleName ?? "Vehicle"}`
      : undefined,
    driverId: row.driverId ?? undefined,
    driverLabel: row.driverCode ? `${row.driverCode} - ${row.driverName ?? "Driver"}` : undefined,
    tripId: row.tripId ?? undefined,
    tripLabel: row.tripNo ? `${row.tripNo}${row.routeName ? ` - ${row.routeName}` : ""}` : undefined,
    locationId: row.locationId ?? undefined,
    locationLabel: row.locationCode ? `${row.locationCode} - ${row.locationName ?? ""}`.trim() : undefined,
    fuelType: row.fuelType,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unitPrice ?? 0),
    totalCost: Number(row.totalCost ?? 0),
    odometer: row.odometer ?? undefined,
    supplierId: row.supplierId ?? undefined,
    supplierLabel: row.supplierCode ? `${row.supplierCode} - ${row.supplierName ?? "Supplier"}` : undefined,
    bankAccountId: row.bankAccountId ?? undefined,
    bankAccountLabel: row.bankAccountCode
      ? `${row.bankAccountCode} - ${row.bankAccountName ?? "Bank Account"}`
      : undefined,
    status: row.status,
    remarks: row.remarks ?? undefined,
    postedAt: row.postedAt ?? undefined,
  };
}

async function writeFleetAudit(
  tx: Tx,
  userId: string | null | undefined,
  action: string,
  module: string,
  recordId: string,
  oldValue: unknown,
  newValue: unknown,
) {
  if (!userId) {
    return;
  }

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

async function writeFleetHistory(
  tx: Tx,
  referenceType: string,
  referenceId: string,
  action: string,
  performedById: string | null | undefined,
  comment?: string | null,
) {
  if (!performedById) {
    return;
  }

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

async function ensureLocationAccess(scope: FleetScope | undefined, locationIds: Array<string | null | undefined>) {
  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (!scope?.accessibleLocationIds || accessibleLocationIds.length === 0) {
    return;
  }

  const targets = locationIds.filter((value): value is string => Boolean(value));
  if (targets.some((locationId) => !accessibleLocationIds.includes(locationId))) {
    throw new Error("You do not have access to the selected location");
  }
}

async function ensureVehicle(tx: Tx, vehicleId: string) {
  const rows = await tx<Array<{ id: string; isActive: boolean }>>`
    SELECT id, "isActive"
    FROM "Vehicle"
    WHERE id = ${vehicleId}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new Error("Vehicle not found");
  }
  if (!rows[0].isActive) {
    throw new Error("Vehicle is inactive");
  }
}

async function ensureDriver(tx: Tx, driverId: string | null) {
  if (!driverId) {
    return;
  }

  const rows = await tx<Array<{ id: string; isActive: boolean }>>`
    SELECT id, "isActive"
    FROM "FleetDriver"
    WHERE id = ${driverId}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new Error("Driver not found");
  }
  if (!rows[0].isActive) {
    throw new Error("Driver is inactive");
  }
}

async function ensureTrip(tx: Tx, tripId: string | null) {
  if (!tripId) {
    return null;
  }

  const rows = await tx<Array<{
    id: string;
    vehicleId: string;
    driverId: string | null;
    fromLocationId: string | null;
    destinationId: string | null;
  }>>`
    SELECT id, "vehicleId", "driverId", "fromLocationId", "destinationId"
    FROM "FleetTrip"
    WHERE id = ${tripId}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new Error("Trip not found");
  }

  return rows[0];
}

async function ensureSupplier(tx: Tx, supplierId: string | null) {
  if (!supplierId) {
    return;
  }

  const rows = await tx<Array<{ id: string; isActive: boolean }>>`
    SELECT id, "isActive"
    FROM "Supplier"
    WHERE id = ${supplierId}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new Error("Supplier not found");
  }
  if (!rows[0].isActive) {
    throw new Error("Supplier is inactive");
  }
}

async function ensureBankAccount(tx: Tx, bankAccountId: string | null) {
  if (!bankAccountId) {
    return;
  }

  const rows = await tx<Array<{ id: string; isActive: boolean }>>`
    SELECT id, "isActive"
    FROM "BankAccount"
    WHERE id = ${bankAccountId}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new Error("Bank account not found");
  }
  if (!rows[0].isActive) {
    throw new Error("Bank account is inactive");
  }
}

async function validateFuelOdometer(tx: Tx, vehicleId: string, odometer: number | null, excludeId?: string | null) {
  if (odometer === null) {
    return;
  }

  const rows = await tx<Array<{ odometer: number | null }>>`
    SELECT odometer
    FROM "FuelRecord"
    WHERE "vehicleId" = ${vehicleId}
      AND "isArchived" = false
      AND status <> 'CANCELLED'
      AND (${excludeId ?? null}::text IS NULL OR id <> ${excludeId ?? null})
      AND odometer IS NOT NULL
    ORDER BY "fuelDate" DESC, "createdAt" DESC
    LIMIT 1
  `;

  const latest = rows[0]?.odometer;
  if (latest !== null && latest !== undefined && odometer < Number(latest)) {
    throw new Error("Fuel odometer cannot be lower than the latest recorded odometer");
  }
}

async function getTripTotals(tx: Tx, tripId: string) {
  const rows = await tx<Array<{
    loadingQuantity: number | null;
    dispatchQuantity: number | null;
    soldQuantity: number | null;
    expectedCollection: number | null;
    actualCollection: number | null;
    creditSales: number | null;
  }>>`
    SELECT
      COALESCE((
        SELECT SUM(loi.quantity)
        FROM "LoadingOrder" lo
        INNER JOIN "LoadingOrderItem" loi ON loi."loadingOrderId" = lo.id
        WHERE lo."tripId" = ${tripId}
          AND lo."isArchived" = false
          AND lo.status <> 'CANCELLED'
      ), 0) AS "loadingQuantity",
      COALESCE((
        SELECT SUM(sdi.quantity)
        FROM "SalesDispatch" sd
        INNER JOIN "SalesDispatchItem" sdi ON sdi."dispatchId" = sd.id
        WHERE sd."tripId" = ${tripId}
          AND sd."isArchived" = false
          AND sd.status <> 'CANCELLED'
      ), 0) AS "dispatchQuantity",
      COALESCE((
        SELECT SUM(si.quantity)
        FROM "Sale" s
        INNER JOIN "SaleItem" si ON si."saleId" = s.id
        WHERE s."tripId" = ${tripId}
          AND s."isArchived" = false
          AND s.status = 'POSTED'
      ), 0) AS "soldQuantity",
      COALESCE((
        SELECT SUM(s."totalAmount") FROM "Sale" s
        WHERE s."tripId" = ${tripId} AND s."isArchived" = false AND s.status = 'POSTED' AND s."paymentStatus" = 'PAID'
      ), 0) AS "expectedCollection",
      COALESCE((
        SELECT SUM(sp.amount) FROM "SalesPayment" sp
        INNER JOIN "Sale" s ON s.id = sp."saleId"
        WHERE s."tripId" = ${tripId} AND s."isArchived" = false AND s.status = 'POSTED'
          AND sp."isArchived" = false AND sp.status = 'POSTED'
      ), 0) AS "actualCollection",
      COALESCE((
        SELECT SUM(s."totalAmount") FROM "Sale" s
        WHERE s."tripId" = ${tripId} AND s."isArchived" = false AND s.status = 'POSTED' AND s."paymentStatus" <> 'PAID'
      ), 0) AS "creditSales"
  `;

  return rows[0] ?? { loadingQuantity: 0, dispatchQuantity: 0, soldQuantity: 0, expectedCollection: 0, actualCollection: 0, creditSales: 0 };
}

async function getFleetTripRows(tx: Tx, scope?: FleetScope, id?: string | null) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  return tx<Array<FleetTripRow>>`
    SELECT
      trip.id,
      trip."publicId",
      trip."tripNo",
      trip."tripDate"::text AS "tripDate",
      trip."vehicleId",
      vehicle."vehicleCode",
      vehicle."vehicleName",
      vehicle."plateNumber",
      trip."driverId",
      driver."driverCode",
      driver."fullName" AS "driverName",
      trip."fromLocationId",
      from_location."locationCode" AS "fromLocationCode",
      from_location."locationName" AS "fromLocationName",
      trip."destinationId",
      destination."locationCode" AS "destinationCode",
      destination."locationName" AS "destinationName",
      trip."routeName",
      trip."routeDescription",
      trip."plannedDeparture"::text AS "plannedDeparture",
      trip."actualDeparture"::text AS "actualDeparture",
      trip."plannedArrival"::text AS "plannedArrival",
      trip."actualArrival"::text AS "actualArrival",
      trip."openingOdometer",
      trip."closingOdometer",
      trip.distance,
      trip."deliveryRemarks",
      trip.status,
      trip."reconciliationDecision",
      trip."reconciliationNote",
      trip."reconciledAt"::text AS "reconciledAt",
      trip."reconciledById",
      trip.remarks,
      trip."isActive",
      loading."loadingCount",
      loading."loadingQuantity",
      dispatch."dispatchCount",
      dispatch."dispatchQuantity",
      sales."saleCount",
      sales."soldQuantity",
      sales."soldAmount",
      sales."expectedCollection",
      payments."actualCollection",
      sales."creditSales",
      fuel."fuelRecordCount",
      fuel."fuelQuantity",
      fuel."fuelCost"
    FROM "FleetTrip" trip
    INNER JOIN "Vehicle" vehicle ON vehicle.id = trip."vehicleId"
    LEFT JOIN "FleetDriver" driver ON driver.id = trip."driverId"
    LEFT JOIN "Location" from_location ON from_location.id = trip."fromLocationId"
    LEFT JOIN "Location" destination ON destination.id = trip."destinationId"
    LEFT JOIN (
      SELECT
        lo."tripId",
        COUNT(DISTINCT lo.id)::int AS "loadingCount",
        COALESCE(SUM(loi.quantity), 0)::double precision AS "loadingQuantity"
      FROM "LoadingOrder" lo
      LEFT JOIN "LoadingOrderItem" loi ON loi."loadingOrderId" = lo.id
      WHERE lo."isArchived" = false
        AND lo.status <> 'CANCELLED'
      GROUP BY lo."tripId"
    ) loading ON loading."tripId" = trip.id
    LEFT JOIN (
      SELECT
        sd."tripId",
        COUNT(DISTINCT sd.id)::int AS "dispatchCount",
        COALESCE(SUM(sdi.quantity), 0)::double precision AS "dispatchQuantity"
      FROM "SalesDispatch" sd
      LEFT JOIN "SalesDispatchItem" sdi ON sdi."dispatchId" = sd.id
      WHERE sd."isArchived" = false
        AND sd.status <> 'CANCELLED'
      GROUP BY sd."tripId"
    ) dispatch ON dispatch."tripId" = trip.id
    LEFT JOIN (
      SELECT
        s."tripId",
        COUNT(DISTINCT s.id)::int AS "saleCount",
        COALESCE(SUM(si.quantity), 0)::double precision AS "soldQuantity",
        COALESCE(SUM(si."lineTotal"), 0)::double precision AS "soldAmount"
        , COALESCE(SUM(CASE WHEN s."paymentStatus" = 'PAID' THEN si."lineTotal" ELSE 0 END), 0)::double precision AS "expectedCollection"
        , COALESCE(SUM(CASE WHEN s."paymentStatus" <> 'PAID' THEN si."lineTotal" ELSE 0 END), 0)::double precision AS "creditSales"
      FROM "Sale" s
      LEFT JOIN "SaleItem" si ON si."saleId" = s.id
      WHERE s."isArchived" = false
        AND s.status = 'POSTED'
      GROUP BY s."tripId"
    ) sales ON sales."tripId" = trip.id
    LEFT JOIN (
      SELECT s."tripId", COALESCE(SUM(sp.amount), 0)::double precision AS "actualCollection"
      FROM "SalesPayment" sp
      INNER JOIN "Sale" s ON s.id = sp."saleId"
      WHERE sp."isArchived" = false AND sp.status = 'POSTED'
        AND s."isArchived" = false AND s.status = 'POSTED'
      GROUP BY s."tripId"
    ) payments ON payments."tripId" = trip.id
    LEFT JOIN (
      SELECT
        fr."tripId",
        COUNT(*)::int AS "fuelRecordCount",
        COALESCE(SUM(fr.quantity), 0)::double precision AS "fuelQuantity",
        COALESCE(SUM(fr."totalCost"), 0)::double precision AS "fuelCost"
      FROM "FuelRecord" fr
      WHERE fr."isArchived" = false
        AND fr.status <> 'CANCELLED'
      GROUP BY fr."tripId"
    ) fuel ON fuel."tripId" = trip.id
    WHERE trip."isArchived" = false
      AND (${id ?? null}::text IS NULL OR ${isPublicIdParam(String(id ?? "")) ? sql`trip."publicId" = ${Number(id)}` : sql`trip.id = ${id ?? null}`})
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL
        OR trip."fromLocationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[])
        OR trip."destinationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    ORDER BY trip."tripDate" DESC, trip."tripNo" DESC
  `;
}

export async function getVehicles() {
  const rows = await sql<Array<{
    id: string;
    vehicleCode: string;
    plateNumber: string;
    vehicleName: string;
    vehicleType: string | null;
    capacity: number | null;
    isActive: boolean;
  }>>`
    SELECT id, "vehicleCode", "plateNumber", "vehicleName", "vehicleType", capacity, "isActive"
    FROM "Vehicle"
    WHERE "isArchived" = false
    ORDER BY "vehicleCode" ASC, "vehicleName" ASC
  `;

  return rows.map(mapVehicle);
}

export async function getVehicleById(id: string) {
  const rows = await sql<Array<{
    id: string;
    vehicleCode: string;
    plateNumber: string;
    vehicleName: string;
    vehicleType: string | null;
    capacity: number | null;
    isActive: boolean;
  }>>`
    SELECT id, "vehicleCode", "plateNumber", "vehicleName", "vehicleType", capacity, "isActive"
    FROM "Vehicle"
    WHERE id = ${id}
      AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0] ? mapVehicle(rows[0]) : null;
}

export async function createVehicle(input: {
  vehicleCode: string;
  plateNumber: string;
  vehicleName: string;
  vehicleType?: string | null;
  capacity?: number | null;
  isActive?: boolean;
}) {
  const vehicleCode = normalizeCode(input.vehicleCode);
  const plateNumber = normalizeCode(input.plateNumber);
  const vehicleName = normalizeText(input.vehicleName);

  if (!vehicleCode || !plateNumber || !vehicleName) {
    throw new Error("Vehicle code, plate number, and vehicle name are required");
  }

  const rows = await sql<Array<{
    id: string;
    vehicleCode: string;
    plateNumber: string;
    vehicleName: string;
    vehicleType: string | null;
    capacity: number | null;
    isActive: boolean;
  }>>`
    INSERT INTO "Vehicle" (
      id, "vehicleCode", "plateNumber", "vehicleName", "vehicleType", capacity, "isActive", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${vehicleCode},
      ${plateNumber},
      ${vehicleName},
      ${normalizeText(input.vehicleType)},
      ${typeof input.capacity === "number" ? input.capacity : null},
      ${input.isActive !== false},
      false,
      NOW(),
      NOW()
    )
    RETURNING id, "vehicleCode", "plateNumber", "vehicleName", "vehicleType", capacity, "isActive"
  `;

  return mapVehicle(rows[0]);
}

export async function updateVehicle(id: string, input: {
  vehicleCode: string;
  plateNumber: string;
  vehicleName: string;
  vehicleType?: string | null;
  capacity?: number | null;
  isActive?: boolean;
}) {
  const vehicleCode = normalizeCode(input.vehicleCode);
  const plateNumber = normalizeCode(input.plateNumber);
  const vehicleName = normalizeText(input.vehicleName);

  if (!vehicleCode || !plateNumber || !vehicleName) {
    throw new Error("Vehicle code, plate number, and vehicle name are required");
  }

  const rows = await sql<Array<{
    id: string;
    vehicleCode: string;
    plateNumber: string;
    vehicleName: string;
    vehicleType: string | null;
    capacity: number | null;
    isActive: boolean;
  }>>`
    UPDATE "Vehicle"
    SET
      "vehicleCode" = ${vehicleCode},
      "plateNumber" = ${plateNumber},
      "vehicleName" = ${vehicleName},
      "vehicleType" = ${normalizeText(input.vehicleType)},
      capacity = ${typeof input.capacity === "number" ? input.capacity : null},
      "isActive" = ${input.isActive !== false},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
    RETURNING id, "vehicleCode", "plateNumber", "vehicleName", "vehicleType", capacity, "isActive"
  `;

  if (!rows[0]) {
    throw new Error("Vehicle not found");
  }

  return mapVehicle(rows[0]);
}

export async function archiveVehicle(id: string) {
  await sql`
    UPDATE "Vehicle"
    SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function getFleetDrivers() {
  const rows = await sql<Array<{
    id: string;
    driverCode: string;
    fullName: string;
    phone: string | null;
    licenseNumber: string | null;
    isActive: boolean;
  }>>`
    SELECT id, "driverCode", "fullName", phone, "licenseNumber", "isActive"
    FROM "FleetDriver"
    WHERE "isArchived" = false
    ORDER BY "driverCode" ASC, "fullName" ASC
  `;

  return rows.map(mapDriver);
}

export async function getFleetDriverById(id: string) {
  const rows = await sql<Array<{
    id: string;
    driverCode: string;
    fullName: string;
    phone: string | null;
    licenseNumber: string | null;
    isActive: boolean;
  }>>`
    SELECT id, "driverCode", "fullName", phone, "licenseNumber", "isActive"
    FROM "FleetDriver"
    WHERE id = ${id}
      AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0] ? mapDriver(rows[0]) : null;
}

export async function createFleetDriver(input: {
  driverCode: string;
  fullName: string;
  phone?: string | null;
  licenseNumber?: string | null;
  isActive?: boolean;
}) {
  const driverCode = normalizeCode(input.driverCode);
  const fullName = normalizeText(input.fullName);

  if (!driverCode || !fullName) {
    throw new Error("Driver code and full name are required");
  }

  const rows = await sql<Array<{
    id: string;
    driverCode: string;
    fullName: string;
    phone: string | null;
    licenseNumber: string | null;
    isActive: boolean;
  }>>`
    INSERT INTO "FleetDriver" (
      id, "driverCode", "fullName", phone, "licenseNumber", "isActive", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${driverCode},
      ${fullName},
      ${normalizeText(input.phone)},
      ${normalizeCode(input.licenseNumber)},
      ${input.isActive !== false},
      false,
      NOW(),
      NOW()
    )
    RETURNING id, "driverCode", "fullName", phone, "licenseNumber", "isActive"
  `;

  return mapDriver(rows[0]);
}

export async function updateFleetDriver(id: string, input: {
  driverCode: string;
  fullName: string;
  phone?: string | null;
  licenseNumber?: string | null;
  isActive?: boolean;
}) {
  const driverCode = normalizeCode(input.driverCode);
  const fullName = normalizeText(input.fullName);

  if (!driverCode || !fullName) {
    throw new Error("Driver code and full name are required");
  }

  const rows = await sql<Array<{
    id: string;
    driverCode: string;
    fullName: string;
    phone: string | null;
    licenseNumber: string | null;
    isActive: boolean;
  }>>`
    UPDATE "FleetDriver"
    SET
      "driverCode" = ${driverCode},
      "fullName" = ${fullName},
      phone = ${normalizeText(input.phone)},
      "licenseNumber" = ${normalizeCode(input.licenseNumber)},
      "isActive" = ${input.isActive !== false},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
    RETURNING id, "driverCode", "fullName", phone, "licenseNumber", "isActive"
  `;

  if (!rows[0]) {
    throw new Error("Driver not found");
  }

  return mapDriver(rows[0]);
}

export async function archiveFleetDriver(id: string) {
  await sql`
    UPDATE "FleetDriver"
    SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function getFleetTrips(scope?: FleetScope) {
  const rows = await getFleetTripRows(sql, scope);
  return rows.map(mapTrip);
}

export async function getFleetTripById(id: string, scope?: FleetScope) {
  const rows = await getFleetTripRows(sql, scope, id);
  return rows[0] ? mapTrip(rows[0]) : null;
}

export async function createFleetTrip(
  input: {
    tripNo: string;
    tripDate: string;
    vehicleId: string;
    driverId?: string | null;
    fromLocationId?: string | null;
    destinationId?: string | null;
    routeName: string;
    routeDescription?: string | null;
    plannedDeparture?: string | null;
    actualDeparture?: string | null;
    plannedArrival?: string | null;
    actualArrival?: string | null;
    openingOdometer?: number | null;
    closingOdometer?: number | null;
    distance?: number | null;
    deliveryRemarks?: string | null;
    status?: string | null;
    remarks?: string | null;
    isActive?: boolean;
  },
  actor?: { userId?: string | null; accessibleLocationIds?: string[] | null },
) {
  const tripNo = normalizeCode(input.tripNo);
  const routeName = normalizeText(input.routeName);
  const tripDate = normalizeDateTime(input.tripDate);
  const status = normalizeTripLifecycleStatus(input.status);
  const fromLocationId = normalizeText(input.fromLocationId);
  const destinationId = normalizeText(input.destinationId);
  const driverId = normalizeText(input.driverId);

  if (!tripNo || !tripDate || !input.vehicleId || !routeName) {
    throw new Error("Trip number, trip date, vehicle, and route name are required");
  }
  if (fromLocationId && destinationId && fromLocationId === destinationId) {
    throw new Error("Origin and destination cannot be the same");
  }

  await ensureLocationAccess(actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, [fromLocationId, destinationId]);

  const row = await sql.begin(async (tx) => {
    await ensureVehicle(tx, input.vehicleId);
    await ensureDriver(tx, driverId);

    const inserted = await tx<Array<{ id: string }>>`
      INSERT INTO "FleetTrip" (
        id, "tripNo", "tripDate", "vehicleId", "driverId", "fromLocationId", "destinationId",
        "routeName", "routeDescription", "plannedDeparture", "actualDeparture", "plannedArrival",
        "actualArrival", "openingOdometer", "closingOdometer", distance, "deliveryRemarks",
        status, remarks, "isActive", "isArchived", "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${tripNo},
        ${tripDate}::timestamptz,
        ${input.vehicleId},
        ${driverId},
        ${fromLocationId},
        ${destinationId},
        ${routeName},
        ${normalizeText(input.routeDescription)},
        ${normalizeDateTime(input.plannedDeparture)}::timestamptz,
        ${normalizeDateTime(input.actualDeparture)}::timestamptz,
        ${normalizeDateTime(input.plannedArrival)}::timestamptz,
        ${normalizeDateTime(input.actualArrival)}::timestamptz,
        ${normalizeNumber(input.openingOdometer)},
        ${normalizeNumber(input.closingOdometer)},
        ${normalizeNumber(input.distance)},
        ${normalizeText(input.deliveryRemarks)},
        ${status},
        ${normalizeText(input.remarks)},
        ${input.isActive !== false && status !== "CANCELLED"},
        false,
        ${actor?.userId ?? null},
        ${actor?.userId ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    if (!inserted[0]) {
      throw new Error("Failed to create trip");
    }

    const rows = await getFleetTripRows(tx, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, inserted[0].id);
    if (!rows[0]) {
      throw new Error("Failed to reload trip");
    }

    await writeFleetAudit(tx, actor?.userId, "CREATE", "fleet.trip", rows[0].id, null, rows[0]);
    await writeFleetHistory(tx, "fleet.trip", rows[0].id, "CREATED", actor?.userId, `Created trip ${rows[0].tripNo}`);

    return rows[0];
  });

  return mapTrip(row);
}

export async function updateFleetTrip(
  id: string,
  input: {
    tripNo: string;
    tripDate: string;
    vehicleId: string;
    driverId?: string | null;
    fromLocationId?: string | null;
    destinationId?: string | null;
    routeName: string;
    routeDescription?: string | null;
    plannedDeparture?: string | null;
    actualDeparture?: string | null;
    plannedArrival?: string | null;
    actualArrival?: string | null;
    openingOdometer?: number | null;
    closingOdometer?: number | null;
    distance?: number | null;
    deliveryRemarks?: string | null;
    status?: string | null;
    remarks?: string | null;
    isActive?: boolean;
  },
  actor?: { userId?: string | null; accessibleLocationIds?: string[] | null },
) {
  const tripNo = normalizeCode(input.tripNo);
  const routeName = normalizeText(input.routeName);
  const tripDate = normalizeDateTime(input.tripDate);
  const status = normalizeTripLifecycleStatus(input.status);
  const fromLocationId = normalizeText(input.fromLocationId);
  const destinationId = normalizeText(input.destinationId);
  const driverId = normalizeText(input.driverId);

  if (!tripNo || !tripDate || !input.vehicleId || !routeName) {
    throw new Error("Trip number, trip date, vehicle, and route name are required");
  }
  if (fromLocationId && destinationId && fromLocationId === destinationId) {
    throw new Error("Origin and destination cannot be the same");
  }

  await ensureLocationAccess(actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, [fromLocationId, destinationId]);

  const row = await sql.begin(async (tx) => {
    const previous = await getFleetTripById(id, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined);
    if (!previous) {
      throw new Error("Trip not found");
    }

    await ensureVehicle(tx, input.vehicleId);
    await ensureDriver(tx, driverId);

    const updated = await tx<Array<{ id: string }>>`
      UPDATE "FleetTrip"
      SET
        "tripNo" = ${tripNo},
        "tripDate" = ${tripDate}::timestamptz,
        "vehicleId" = ${input.vehicleId},
        "driverId" = ${driverId},
        "fromLocationId" = ${fromLocationId},
        "destinationId" = ${destinationId},
        "routeName" = ${routeName},
        "routeDescription" = ${normalizeText(input.routeDescription)},
        "plannedDeparture" = ${normalizeDateTime(input.plannedDeparture)}::timestamptz,
        "actualDeparture" = ${normalizeDateTime(input.actualDeparture)}::timestamptz,
        "plannedArrival" = ${normalizeDateTime(input.plannedArrival)}::timestamptz,
        "actualArrival" = ${normalizeDateTime(input.actualArrival)}::timestamptz,
        "openingOdometer" = ${normalizeNumber(input.openingOdometer)},
        "closingOdometer" = ${normalizeNumber(input.closingOdometer)},
        distance = ${normalizeNumber(input.distance)},
        "deliveryRemarks" = ${normalizeText(input.deliveryRemarks)},
        status = ${status},
        remarks = ${normalizeText(input.remarks)},
        "isActive" = ${input.isActive !== false && status !== "CANCELLED"},
        "updatedById" = ${actor?.userId ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
      RETURNING id
    `;

    if (!updated[0]) {
      throw new Error("Trip not found");
    }

    const rows = await getFleetTripRows(tx, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, id);
    if (!rows[0]) {
      throw new Error("Trip not found");
    }

    await writeFleetAudit(tx, actor?.userId, "UPDATE", "fleet.trip", id, previous, rows[0]);
    await writeFleetHistory(tx, "fleet.trip", id, "UPDATED", actor?.userId, `Updated trip ${rows[0].tripNo}`);

    return rows[0];
  });

  return mapTrip(row);
}

export async function archiveFleetTrip(id: string, actor?: { userId?: string | null; accessibleLocationIds?: string[] | null }) {
  await sql.begin(async (tx) => {
    const previous = await getFleetTripById(id, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined);
    if (!previous) {
      throw new Error("Trip not found");
    }

    await tx`
      UPDATE "FleetTrip"
      SET "isArchived" = true, "isActive" = false, "updatedById" = ${actor?.userId ?? null}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeFleetAudit(tx, actor?.userId, "ARCHIVE", "fleet.trip", id, previous, { archived: true });
    await writeFleetHistory(tx, "fleet.trip", id, "ARCHIVED", actor?.userId, `Archived trip ${previous.tripNo}`);
  });
}

export async function transitionFleetTripStatus(
  id: string,
  nextStatus: TripLifecycleStatus,
  actor?: { userId?: string | null; accessibleLocationIds?: string[] | null },
) {
  return sql.begin(async (tx) => {
    await tx`SELECT id FROM "FleetTrip" WHERE id = ${id} AND "isArchived" = false FOR UPDATE`;
    const currentRows = await getFleetTripRows(tx, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, id);
    const current = currentRows[0] ? mapTrip(currentRows[0]) : null;
    if (!current) {
      throw new Error("Trip not found");
    }
    const currentStatus = normalizeTripLifecycleStatus(current.status);
    const allowed: Record<TripLifecycleStatus, TripLifecycleStatus[]> = {
      PLANNED: ["ASSIGNED", "CANCELLED"],
      ASSIGNED: ["PLANNED", "LOADING", "DISPATCHED", "CANCELLED"],
      LOADING: ["DISPATCHED", "CANCELLED"],
      DISPATCHED: ["IN_TRANSIT", "ARRIVED", "COMPLETED", "CANCELLED"],
      IN_TRANSIT: ["ARRIVED", "COMPLETED", "CANCELLED"],
      ARRIVED: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: ["PLANNED"],
    };

    if (!allowed[currentStatus].includes(nextStatus)) {
      throw new Error(`Trip cannot move from ${currentStatus} to ${nextStatus}`);
    }

    if (nextStatus === "COMPLETED") {
      const totals = await getTripTotals(tx, id);
      const loadingQuantity = Number(totals.loadingQuantity ?? 0);
      const dispatchQuantity = Number(totals.dispatchQuantity ?? 0);
      const soldQuantity = Number(totals.soldQuantity ?? 0);

      if (dispatchQuantity > loadingQuantity + 0.0001) {
        throw new Error("Trip cannot complete while dispatched quantity exceeds loaded quantity");
      }
      if (soldQuantity > dispatchQuantity + 0.0001) {
        throw new Error("Trip cannot complete while sold quantity exceeds dispatched quantity");
      }
      const reconciliation = summarizeFleetTripReconciliation(totals);
      if (reconciliation.status !== "CLEAR" && !current.reconciliationDecision) {
        throw new Error("Trip cannot complete until quantity and payment variances are reconciled or approved as an exception");
      }
    }

    const updated = await tx<Array<{ id: string }>>`
      UPDATE "FleetTrip"
      SET
        status = ${nextStatus},
        "isActive" = ${nextStatus !== "CANCELLED" && nextStatus !== "COMPLETED"},
        "actualDeparture" = CASE
          WHEN ${nextStatus} IN ('DISPATCHED', 'IN_TRANSIT') AND "actualDeparture" IS NULL THEN NOW()
          ELSE "actualDeparture"
        END,
        "actualArrival" = CASE
          WHEN ${nextStatus} IN ('ARRIVED', 'COMPLETED') AND "actualArrival" IS NULL THEN NOW()
          ELSE "actualArrival"
        END,
        "updatedById" = ${actor?.userId ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
      RETURNING id
    `;

    if (!updated[0]) {
      throw new Error("Trip not found");
    }

    const rows = await getFleetTripRows(tx, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, id);
    if (!rows[0]) {
      throw new Error("Trip not found");
    }

    await writeFleetAudit(tx, actor?.userId, "STATUS_CHANGE", "fleet.trip", id, current, rows[0]);
    await writeFleetHistory(tx, "fleet.trip", id, nextStatus, actor?.userId, `Trip ${rows[0].tripNo} moved to ${nextStatus}`);

    return mapTrip(rows[0]);
  });
}

type FleetReconciliationDecision =
  | "MARK_VARIANCE_EXPLAINED"
  | "MARK_SHORTAGE"
  | "MARK_OVER_DELIVERY"
  | "CLOSE_WITH_EXCEPTION";

function normalizeFleetReconciliationDecision(value: unknown) {
  const decision = normalizeCode(value);
  switch (decision) {
    case "MARK_VARIANCE_EXPLAINED":
    case "MARK_SHORTAGE":
    case "MARK_OVER_DELIVERY":
    case "CLOSE_WITH_EXCEPTION":
      return decision as FleetReconciliationDecision;
    default:
      throw new Error("Unsupported reconciliation decision");
  }
}

export async function updateFleetTripReconciliation(
  id: string,
  input: {
    decision: FleetReconciliationDecision | string;
    note?: string | null;
  },
  actor?: { userId?: string | null; accessibleLocationIds?: string[] | null },
) {
  const decision = normalizeFleetReconciliationDecision(input.decision);
  const note = normalizeText(input.note);

  if (!note) {
    throw new Error("Reconciliation note is required");
  }

  return sql.begin(async (tx) => {
    const rows = await getFleetTripRows(tx, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, id);
    const current = rows[0];
    if (!current) {
      throw new Error("Trip not found");
    }

    const updated = await tx<Array<{ id: string }>>`
      UPDATE "FleetTrip"
      SET
        "reconciliationDecision" = ${decision},
        "reconciliationNote" = ${note},
        "reconciledAt" = NOW(),
        "reconciledById" = ${actor?.userId ?? null},
        "updatedById" = ${actor?.userId ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
      RETURNING id
    `;

    if (!updated[0]) {
      throw new Error("Trip not found");
    }

    const nextRows = await getFleetTripRows(tx, actor ? { accessibleLocationIds: actor.accessibleLocationIds } : undefined, id);
    if (!nextRows[0]) {
      throw new Error("Trip not found");
    }

    await writeFleetAudit(tx, actor?.userId, "RECONCILE", "fleet.trip", id, current, nextRows[0]);
    await writeFleetHistory(tx, "fleet.trip", id, "RECONCILED", actor?.userId, `Trip ${nextRows[0].tripNo} reconciliation marked as ${decision}`);

    return mapTrip(nextRows[0]);
  });
}

export async function getFuelRecords(scope?: FleetScope) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const rows = await sql<Array<FuelRecordRow>>`
    SELECT
      fr.id,
      fr."fuelNo",
      fr."fuelDate"::text AS "fuelDate",
      fr."vehicleId",
      vehicle."vehicleCode",
      vehicle."plateNumber",
      vehicle."vehicleName",
      fr."driverId",
      driver."driverCode",
      driver."fullName" AS "driverName",
      fr."tripId",
      trip."tripNo",
      trip."routeName",
      fr."locationId",
      location."locationCode",
      location."locationName",
      fr."fuelType",
      fr.quantity,
      fr."unitPrice",
      fr."totalCost",
      fr.odometer,
      fr."supplierId",
      supplier."supplierCode",
      supplier.name AS "supplierName",
      fr."bankAccountId",
      bank."accountCode" AS "bankAccountCode",
      bank."accountName" AS "bankAccountName",
      fr.status,
      fr.remarks,
      fr."postedAt"::text AS "postedAt"
    FROM "FuelRecord" fr
    INNER JOIN "Vehicle" vehicle ON vehicle.id = fr."vehicleId"
    LEFT JOIN "FleetDriver" driver ON driver.id = fr."driverId"
    LEFT JOIN "FleetTrip" trip ON trip.id = fr."tripId"
    LEFT JOIN "Location" location ON location.id = fr."locationId"
    LEFT JOIN "Supplier" supplier ON supplier.id = fr."supplierId"
    LEFT JOIN "BankAccount" bank ON bank.id = fr."bankAccountId"
    WHERE fr."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL
        OR fr."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[])
        OR trip."fromLocationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[])
        OR trip."destinationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    ORDER BY fr."fuelDate" DESC, fr."createdAt" DESC
  `;

  return rows.map(mapFuelRecord);
}

export async function getFuelRecordsForTrip(id: string, scope?: FleetScope) {
  const records = await getFuelRecords(scope);
  return records.filter((record) => record.tripId === id);
}

export async function getFuelRecordById(id: string, scope?: FleetScope) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const rows = await sql<Array<FuelRecordRow>>`
    SELECT
      fr.id,
      fr."fuelNo",
      fr."fuelDate"::text AS "fuelDate",
      fr."vehicleId",
      vehicle."vehicleCode",
      vehicle."plateNumber",
      vehicle."vehicleName",
      fr."driverId",
      driver."driverCode",
      driver."fullName" AS "driverName",
      fr."tripId",
      trip."tripNo",
      trip."routeName",
      fr."locationId",
      location."locationCode",
      location."locationName",
      fr."fuelType",
      fr.quantity,
      fr."unitPrice",
      fr."totalCost",
      fr.odometer,
      fr."supplierId",
      supplier."supplierCode",
      supplier.name AS "supplierName",
      fr."bankAccountId",
      bank."accountCode" AS "bankAccountCode",
      bank."accountName" AS "bankAccountName",
      fr.status,
      fr.remarks,
      fr."postedAt"::text AS "postedAt"
    FROM "FuelRecord" fr
    INNER JOIN "Vehicle" vehicle ON vehicle.id = fr."vehicleId"
    LEFT JOIN "FleetDriver" driver ON driver.id = fr."driverId"
    LEFT JOIN "FleetTrip" trip ON trip.id = fr."tripId"
    LEFT JOIN "Location" location ON location.id = fr."locationId"
    LEFT JOIN "Supplier" supplier ON supplier.id = fr."supplierId"
    LEFT JOIN "BankAccount" bank ON bank.id = fr."bankAccountId"
    WHERE fr.id = ${id}
      AND fr."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL
        OR fr."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[])
        OR trip."fromLocationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[])
        OR trip."destinationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    LIMIT 1
  `;

  return rows[0] ? mapFuelRecord(rows[0]) : null;
}

export async function createFuelRecord(
  input: {
    fuelNo: string;
    fuelDate: string;
    vehicleId: string;
    driverId?: string | null;
    tripId?: string | null;
    locationId?: string | null;
    fuelType: string;
    quantity: number;
    unitPrice: number;
    totalCost?: number | null;
    odometer?: number | null;
    supplierId?: string | null;
    bankAccountId?: string | null;
    status?: string | null;
    remarks?: string | null;
  },
  actor: { userId: string; accessibleLocationIds?: string[] | null },
) {
  const fuelNo = normalizeCode(input.fuelNo);
  const fuelDate = normalizeDateTime(input.fuelDate);
  const fuelType = normalizeCode(input.fuelType);
  const quantity = normalizeNumber(input.quantity);
  const unitPrice = normalizeNumber(input.unitPrice);
  const totalCost = normalizeNumber(input.totalCost) ?? Number(((quantity ?? 0) * (unitPrice ?? 0)).toFixed(2));
  const odometer = normalizeNumber(input.odometer);
  const status = normalizeFuelStatus(input.status);
  const tripId = normalizeText(input.tripId);
  const driverId = normalizeText(input.driverId);
  const locationId = normalizeText(input.locationId);
  const supplierId = normalizeText(input.supplierId);
  const bankAccountId = normalizeText(input.bankAccountId);

  if (!fuelNo || !fuelDate || !input.vehicleId || !fuelType) {
    throw new Error("Fuel number, fuel date, vehicle, and fuel type are required");
  }
  if (!(Number(quantity ?? 0) > 0) || !(Number(totalCost ?? 0) > 0)) {
    throw new Error("Fuel quantity and total cost must be greater than zero");
  }

  await ensureLocationAccess({ accessibleLocationIds: actor.accessibleLocationIds }, [locationId]);

  const record = await sql.begin(async (tx) => {
    await ensureVehicle(tx, input.vehicleId);
    await ensureDriver(tx, driverId);
    await ensureSupplier(tx, supplierId);
    await ensureBankAccount(tx, bankAccountId);
    await validateFuelOdometer(tx, input.vehicleId, odometer);

    const trip = await ensureTrip(tx, tripId);
    if (trip && trip.vehicleId !== input.vehicleId) {
      throw new Error("Selected trip does not belong to the selected vehicle");
    }

    const inserted = await tx<Array<{ id: string }>>`
      INSERT INTO "FuelRecord" (
        id, "fuelNo", "vehicleId", "driverId", "tripId", "locationId", "fuelDate", "fuelType",
        quantity, "unitPrice", "totalCost", odometer, "supplierId", "bankAccountId", status,
        remarks, "createdById", "postedById", "postedAt", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${fuelNo},
        ${input.vehicleId},
        ${driverId ?? trip?.driverId ?? null},
        ${tripId},
        ${locationId ?? trip?.fromLocationId ?? null},
        ${fuelDate}::timestamptz,
        ${fuelType},
        ${quantity},
        ${unitPrice ?? 0},
        ${totalCost},
        ${odometer},
        ${supplierId},
        ${bankAccountId},
        ${status},
        ${normalizeText(input.remarks)},
        ${actor.userId},
        ${status === "POSTED" ? actor.userId : null},
        ${status === "POSTED" ? new Date() : null},
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    if (!inserted[0]) {
      throw new Error("Failed to create fuel record");
    }

    if (status === "POSTED") {
      await syncPostedFuelFinance(tx, { fuelRecordId: inserted[0].id, userId: actor.userId });
    }

    const rows = await tx<Array<FuelRecordRow>>`
      SELECT
        fr.id,
        fr."fuelNo",
        fr."fuelDate"::text AS "fuelDate",
        fr."vehicleId",
        vehicle."vehicleCode",
        vehicle."plateNumber",
        vehicle."vehicleName",
        fr."driverId",
        driver."driverCode",
        driver."fullName" AS "driverName",
        fr."tripId",
        trip."tripNo",
        trip."routeName",
        fr."locationId",
        location."locationCode",
        location."locationName",
        fr."fuelType",
        fr.quantity,
        fr."unitPrice",
        fr."totalCost",
        fr.odometer,
        fr."supplierId",
        supplier."supplierCode",
        supplier.name AS "supplierName",
        fr."bankAccountId",
        bank."accountCode" AS "bankAccountCode",
        bank."accountName" AS "bankAccountName",
        fr.status,
        fr.remarks,
        fr."postedAt"::text AS "postedAt"
      FROM "FuelRecord" fr
      INNER JOIN "Vehicle" vehicle ON vehicle.id = fr."vehicleId"
      LEFT JOIN "FleetDriver" driver ON driver.id = fr."driverId"
      LEFT JOIN "FleetTrip" trip ON trip.id = fr."tripId"
      LEFT JOIN "Location" location ON location.id = fr."locationId"
      LEFT JOIN "Supplier" supplier ON supplier.id = fr."supplierId"
      LEFT JOIN "BankAccount" bank ON bank.id = fr."bankAccountId"
      WHERE fr.id = ${inserted[0].id}
      LIMIT 1
    `;

    if (!rows[0]) {
      throw new Error("Failed to reload fuel record");
    }

    await writeFleetAudit(tx, actor.userId, "CREATE", "fleet.fuel", rows[0].id, null, rows[0]);
    await writeFleetHistory(tx, "fleet.fuel", rows[0].id, "CREATED", actor.userId, `Created fuel record ${rows[0].fuelNo}`);

    return rows[0];
  });

  return mapFuelRecord(record);
}

export async function updateFuelRecord(
  id: string,
  input: {
    fuelNo: string;
    fuelDate: string;
    vehicleId: string;
    driverId?: string | null;
    tripId?: string | null;
    locationId?: string | null;
    fuelType: string;
    quantity: number;
    unitPrice: number;
    totalCost?: number | null;
    odometer?: number | null;
    supplierId?: string | null;
    bankAccountId?: string | null;
    status?: string | null;
    remarks?: string | null;
  },
  actor: { userId: string; accessibleLocationIds?: string[] | null },
) {
  const previous = await getFuelRecordById(id, { accessibleLocationIds: actor.accessibleLocationIds });
  if (!previous) {
    throw new Error("Fuel record not found");
  }

  const fuelNo = normalizeCode(input.fuelNo);
  const fuelDate = normalizeDateTime(input.fuelDate);
  const fuelType = normalizeCode(input.fuelType);
  const quantity = normalizeNumber(input.quantity);
  const unitPrice = normalizeNumber(input.unitPrice);
  const totalCost = normalizeNumber(input.totalCost) ?? Number(((quantity ?? 0) * (unitPrice ?? 0)).toFixed(2));
  const odometer = normalizeNumber(input.odometer);
  const status = normalizeFuelStatus(input.status);
  const tripId = normalizeText(input.tripId);
  const driverId = normalizeText(input.driverId);
  const locationId = normalizeText(input.locationId);
  const supplierId = normalizeText(input.supplierId);
  const bankAccountId = normalizeText(input.bankAccountId);

  if (!fuelNo || !fuelDate || !input.vehicleId || !fuelType) {
    throw new Error("Fuel number, fuel date, vehicle, and fuel type are required");
  }
  if (!(Number(quantity ?? 0) > 0) || !(Number(totalCost ?? 0) > 0)) {
    throw new Error("Fuel quantity and total cost must be greater than zero");
  }

  await ensureLocationAccess({ accessibleLocationIds: actor.accessibleLocationIds }, [locationId]);

  const record = await sql.begin(async (tx) => {
    if (previous.status === "POSTED") {
      await voidFuelFinance(tx, {
        fuelRecordId: id,
        userId: actor.userId,
        reason: "Fuel record updated",
      });
    }

    await ensureVehicle(tx, input.vehicleId);
    await ensureDriver(tx, driverId);
    await ensureSupplier(tx, supplierId);
    await ensureBankAccount(tx, bankAccountId);
    await validateFuelOdometer(tx, input.vehicleId, odometer, id);

    const trip = await ensureTrip(tx, tripId);
    if (trip && trip.vehicleId !== input.vehicleId) {
      throw new Error("Selected trip does not belong to the selected vehicle");
    }

    const updated = await tx<Array<{ id: string }>>`
      UPDATE "FuelRecord"
      SET
        "fuelNo" = ${fuelNo},
        "vehicleId" = ${input.vehicleId},
        "driverId" = ${driverId ?? trip?.driverId ?? null},
        "tripId" = ${tripId},
        "locationId" = ${locationId ?? trip?.fromLocationId ?? null},
        "fuelDate" = ${fuelDate}::timestamptz,
        "fuelType" = ${fuelType},
        quantity = ${quantity},
        "unitPrice" = ${unitPrice ?? 0},
        "totalCost" = ${totalCost},
        odometer = ${odometer},
        "supplierId" = ${supplierId},
        "bankAccountId" = ${bankAccountId},
        status = ${status},
        remarks = ${normalizeText(input.remarks)},
        "postedById" = ${status === "POSTED" ? actor.userId : null},
        "postedAt" = ${status === "POSTED" ? new Date() : null},
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
      RETURNING id
    `;

    if (!updated[0]) {
      throw new Error("Fuel record not found");
    }

    if (status === "POSTED") {
      await syncPostedFuelFinance(tx, { fuelRecordId: id, userId: actor.userId });
    }

    const rows = await tx<Array<FuelRecordRow>>`
      SELECT
        fr.id,
        fr."fuelNo",
        fr."fuelDate"::text AS "fuelDate",
        fr."vehicleId",
        vehicle."vehicleCode",
        vehicle."plateNumber",
        vehicle."vehicleName",
        fr."driverId",
        driver."driverCode",
        driver."fullName" AS "driverName",
        fr."tripId",
        trip."tripNo",
        trip."routeName",
        fr."locationId",
        location."locationCode",
        location."locationName",
        fr."fuelType",
        fr.quantity,
        fr."unitPrice",
        fr."totalCost",
        fr.odometer,
        fr."supplierId",
        supplier."supplierCode",
        supplier.name AS "supplierName",
        fr."bankAccountId",
        bank."accountCode" AS "bankAccountCode",
        bank."accountName" AS "bankAccountName",
        fr.status,
        fr.remarks,
        fr."postedAt"::text AS "postedAt"
      FROM "FuelRecord" fr
      INNER JOIN "Vehicle" vehicle ON vehicle.id = fr."vehicleId"
      LEFT JOIN "FleetDriver" driver ON driver.id = fr."driverId"
      LEFT JOIN "FleetTrip" trip ON trip.id = fr."tripId"
      LEFT JOIN "Location" location ON location.id = fr."locationId"
      LEFT JOIN "Supplier" supplier ON supplier.id = fr."supplierId"
      LEFT JOIN "BankAccount" bank ON bank.id = fr."bankAccountId"
      WHERE fr.id = ${id}
      LIMIT 1
    `;

    if (!rows[0]) {
      throw new Error("Failed to reload fuel record");
    }

    await writeFleetAudit(tx, actor.userId, "UPDATE", "fleet.fuel", id, previous, rows[0]);
    await writeFleetHistory(tx, "fleet.fuel", id, "UPDATED", actor.userId, `Updated fuel record ${rows[0].fuelNo}`);

    return rows[0];
  });

  return mapFuelRecord(record);
}

export async function archiveFuelRecord(
  id: string,
  actor: { userId: string; accessibleLocationIds?: string[] | null },
) {
  const previous = await getFuelRecordById(id, { accessibleLocationIds: actor.accessibleLocationIds });
  if (!previous) {
    throw new Error("Fuel record not found");
  }

  await sql.begin(async (tx) => {
    if (previous.status === "POSTED") {
      await voidFuelFinance(tx, {
        fuelRecordId: id,
        userId: actor.userId,
        reason: "Fuel record archived",
      });
    }

    await tx`
      UPDATE "FuelRecord"
      SET "isArchived" = true, status = 'CANCELLED', "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeFleetAudit(tx, actor.userId, "ARCHIVE", "fleet.fuel", id, previous, { archived: true });
    await writeFleetHistory(tx, "fleet.fuel", id, "ARCHIVED", actor.userId, `Archived fuel record ${previous.fuelNo}`);
  });
}
