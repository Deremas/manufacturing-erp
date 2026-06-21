// ----------------------------------------------------------------------------
// KONEL ERP — Location Service
// ----------------------------------------------------------------------------
// Manages Location CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";
import { AuditAction } from "@/services/audit/auditLog";

const locations: Location[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `loc-${Date.now()}-${idCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

async function recordAudit(
  action: AuditAction,
  recordId: string,
  userId: string,
  userName: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
): Promise<void> {
  const { createAuditLog } = await import("@/services/audit/auditLog");
  await createAuditLog({
    userId,
    userName,
    action,
    module: "LOCATION",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<Location>> {
  let filtered = [...locations];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.locationName.toLowerCase().includes(q) ||
        l.locationCode.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((l) => l.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((l) => l.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<Location>> {
  const loc = locations.find((l) => l.id === id);
  if (!loc) return { success: false, error: "Location not found" };
  return { success: true, data: loc };
}

export async function create(
  input: CreateLocationInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Location>> {
  const ts = now();
  const newLoc: Location = {
    id: nextId(),
    locationCode: input.locationCode,
    locationName: input.locationName,
    locationType: input.locationType,
    address: input.address,
    description: input.description,
    parentLocationId: input.parentLocationId,
    displayOrder: input.displayOrder ?? 0,
    city: input.city,
    region: input.region,
    country: input.country,
    gpsLatitude: input.gpsLatitude,
    gpsLongitude: input.gpsLongitude,
    managerId: input.managerId,
    isStockLocation: input.isStockLocation ?? true,
    isProcurementLocation: input.isProcurementLocation ?? false,
    isProductionLocation: input.isProductionLocation ?? false,
    isSalesLocation: input.isSalesLocation ?? false,
    isTransitLocation: input.isTransitLocation ?? false,
    isScrapLocation: input.isScrapLocation ?? false,
    defaultPriceListId: input.defaultPriceListId,
    defaultBankAccountId: input.defaultBankAccountId,
    allowNegativeStock: input.allowNegativeStock ?? false,
    requireTransferApproval: input.requireTransferApproval ?? false,
    enableLocationNumbering: input.enableLocationNumbering ?? false,
    createdById: userId,
    updatedById: userId,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  locations.push(newLoc);
  await recordAudit(
    AuditAction.CREATE,
    newLoc.id,
    userId,
    userName,
    undefined,
    { ...newLoc },
  );
  return {
    success: true,
    data: newLoc,
    message: "Location created successfully",
  };
}

export async function update(
  id: string,
  input: UpdateLocationInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Location>> {
  const idx = locations.findIndex((l) => l.id === id);
  if (idx === -1) return { success: false, error: "Location not found" };
  const old = { ...locations[idx] };
  locations[idx] = {
    ...locations[idx],
    ...input,
    updatedById: userId,
    updatedAt: now(),
  };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...locations[idx],
  });
  return {
    success: true,
    data: locations[idx],
    message: "Location updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Location>> {
  const idx = locations.findIndex((l) => l.id === id);
  if (idx === -1) return { success: false, error: "Location not found" };
  const old = { ...locations[idx] };
  locations[idx].isActive = false;
  locations[idx].updatedById = userId;
  locations[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...locations[idx],
  });
  return {
    success: true,
    data: locations[idx],
    message: "Location deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Location>> {
  const idx = locations.findIndex((l) => l.id === id);
  if (idx === -1) return { success: false, error: "Location not found" };
  const old = { ...locations[idx] };
  locations[idx].isArchived = true;
  locations[idx].isActive = false;
  locations[idx].updatedById = userId;
  locations[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...locations[idx],
  });
  return {
    success: true,
    data: locations[idx],
    message: "Location archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Location>> {
  const idx = locations.findIndex((l) => l.id === id);
  if (idx === -1) return { success: false, error: "Location not found" };
  const old = { ...locations[idx] };
  locations[idx].isArchived = false;
  locations[idx].isActive = true;
  locations[idx].updatedById = userId;
  locations[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...locations[idx],
  });
  return {
    success: true,
    data: locations[idx],
    message: "Location restored successfully",
  };
}

export async function search(
  query: string,
): Promise<ServiceResult<Location[]>> {
  const q = query.toLowerCase();
  const results = locations.filter(
    (l) =>
      !l.isArchived &&
      (l.locationName.toLowerCase().includes(q) ||
        l.locationCode.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}
