import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  CreateLocationInput,
  Location,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  UpdateLocationInput,
} from "@/types/master-data";

type LocationRow = {
  id: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  address: string | null;
  description: string | null;
  parentLocationId: string | null;
  parentLocationName: string | null;
  displayOrder: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  gpsLatitude: string | null;
  gpsLongitude: string | null;
  managerId: string | null;
  managerName: string | null;
  isStockLocation: boolean;
  isProcurementLocation: boolean;
  isProductionLocation: boolean;
  isSalesLocation: boolean;
  isTransitLocation: boolean;
  isScrapLocation: boolean;
  defaultPriceListId: string | null;
  defaultBankAccountId: string | null;
  allowNegativeStock: boolean;
  requireTransferApproval: boolean;
  enableLocationNumbering: boolean;
  createdById: string | null;
  updatedById: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function mapLocation(row: LocationRow): Location {
  return {
    id: row.id,
    locationCode: row.locationCode,
    locationName: row.locationName,
    locationType: row.locationType || "GENERAL",
    address: row.address ?? undefined,
    description: row.description ?? undefined,
    parentLocationId: row.parentLocationId ?? undefined,
    parentLocationName: row.parentLocationName ?? undefined,
    displayOrder: row.displayOrder ?? 0,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    country: row.country ?? undefined,
    gpsLatitude: row.gpsLatitude ?? undefined,
    gpsLongitude: row.gpsLongitude ?? undefined,
    managerId: row.managerId ?? undefined,
    managerName: row.managerName ?? undefined,
    isStockLocation: row.isStockLocation,
    isProcurementLocation: row.isProcurementLocation,
    isProductionLocation: row.isProductionLocation,
    isSalesLocation: row.isSalesLocation,
    isTransitLocation: row.isTransitLocation,
    isScrapLocation: row.isScrapLocation,
    defaultPriceListId: row.defaultPriceListId ?? undefined,
    defaultBankAccountId: row.defaultBankAccountId ?? undefined,
    allowNegativeStock: row.allowNegativeStock,
    requireTransferApproval: row.requireTransferApproval,
    enableLocationNumbering: row.enableLocationNumbering,
    createdById: row.createdById ?? undefined,
    updatedById: row.updatedById ?? undefined,
    isActive: row.isActive,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function paginate<T>(items: T[], params?: QueryParams): PaginatedResult<T> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

async function getLocationRowById(id: string, isArchived = false) {
  const rows = await sql<LocationRow[]>`
    SELECT
      l.id,
      l."locationCode",
      l."locationName",
      l."locationType",
      l.address,
      l.description,
      l."parentLocationId",
      p."locationName" AS "parentLocationName",
      l."displayOrder",
      l.city,
      l.region,
      l.country,
      l."gpsLatitude",
      l."gpsLongitude",
      l."managerId",
      u.name AS "managerName",
      l."isStockLocation",
      l."isProcurementLocation",
      l."isProductionLocation",
      l."isSalesLocation",
      l."isTransitLocation",
      l."isScrapLocation",
      l."defaultPriceListId",
      l."defaultBankAccountId",
      l."allowNegativeStock",
      l."requireTransferApproval",
      l."enableLocationNumbering",
      l."createdById",
      l."updatedById",
      l."isActive",
      l."isArchived",
      l."createdAt",
      l."updatedAt"
    FROM "Location" l
    LEFT JOIN "Location" p ON p.id = l."parentLocationId"
    LEFT JOIN "User" u ON u.id = l."managerId"
    WHERE l.id = ${id}
      AND l."isArchived" = ${isArchived}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<Location>> {
  const rows = await sql<LocationRow[]>`
    SELECT
      l.id,
      l."locationCode",
      l."locationName",
      l."locationType",
      l.address,
      l.description,
      l."parentLocationId",
      p."locationName" AS "parentLocationName",
      l."displayOrder",
      l.city,
      l.region,
      l.country,
      l."gpsLatitude",
      l."gpsLongitude",
      l."managerId",
      u.name AS "managerName",
      l."isStockLocation",
      l."isProcurementLocation",
      l."isProductionLocation",
      l."isSalesLocation",
      l."isTransitLocation",
      l."isScrapLocation",
      l."defaultPriceListId",
      l."defaultBankAccountId",
      l."allowNegativeStock",
      l."requireTransferApproval",
      l."enableLocationNumbering",
      l."createdById",
      l."updatedById",
      l."isActive",
      l."isArchived",
      l."createdAt",
      l."updatedAt"
    FROM "Location" l
    LEFT JOIN "Location" p ON p.id = l."parentLocationId"
    LEFT JOIN "User" u ON u.id = l."managerId"
    WHERE l."isArchived" = false
    ORDER BY l."locationName" ASC
  `;

  const locations = rows.map(mapLocation);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = locations.filter((location) => {
    if (params?.isActive !== undefined && location.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [location.locationName, location.locationCode, location.locationType, location.address]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<Location>> {
  const row = await getLocationRowById(id);
  if (!row) {
    return { success: false, error: "Location not found" };
  }
  return { success: true, data: mapLocation(row) };
}

export async function create(input: CreateLocationInput, userId: string, userName: string): Promise<ServiceResult<Location>> {
  try {
    const locationCode = normalizeString(input.locationCode);
    const locationName = normalizeString(input.locationName);
    const locationType = normalizeString(input.locationType);
    if (!locationCode || !locationName || !locationType) {
      return { success: false, error: "Location code, name, and type are required" };
    }

    const rows = await sql<LocationRow[]>`
      INSERT INTO "Location" (
        "locationCode",
        "locationName",
        "locationType",
        address,
        description,
        "parentLocationId",
        "displayOrder",
        city,
        region,
        country,
        "gpsLatitude",
        "gpsLongitude",
        "managerId",
        "isStockLocation",
        "isProcurementLocation",
        "isProductionLocation",
        "isSalesLocation",
        "isTransitLocation",
        "isScrapLocation",
        "defaultPriceListId",
        "defaultBankAccountId",
        "allowNegativeStock",
        "requireTransferApproval",
        "enableLocationNumbering",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${locationCode},
        ${locationName},
        ${locationType},
        ${normalizeString(input.address)},
        ${normalizeString(input.description)},
        ${normalizeString(input.parentLocationId)},
        ${Number(input.displayOrder ?? 0)},
        ${normalizeString(input.city)},
        ${normalizeString(input.region)},
        ${normalizeString(input.country)},
        ${normalizeString(input.gpsLatitude)},
        ${normalizeString(input.gpsLongitude)},
        ${normalizeString(input.managerId)},
        ${input.isStockLocation ?? true},
        ${input.isProcurementLocation ?? false},
        ${input.isProductionLocation ?? false},
        ${input.isSalesLocation ?? false},
        ${input.isTransitLocation ?? false},
        ${input.isScrapLocation ?? false},
        ${normalizeString(input.defaultPriceListId)},
        ${normalizeString(input.defaultBankAccountId)},
        ${input.allowNegativeStock ?? false},
        ${input.requireTransferApproval ?? false},
        ${input.enableLocationNumbering ?? false},
        ${userId},
        ${userId},
        ${input.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        "locationCode",
        "locationName",
        "locationType",
        address,
        description,
        "parentLocationId",
        NULL::text AS "parentLocationName",
        "displayOrder",
        city,
        region,
        country,
        "gpsLatitude",
        "gpsLongitude",
        "managerId",
        NULL::text AS "managerName",
        "isStockLocation",
        "isProcurementLocation",
        "isProductionLocation",
        "isSalesLocation",
        "isTransitLocation",
        "isScrapLocation",
        "defaultPriceListId",
        "defaultBankAccountId",
        "allowNegativeStock",
        "requireTransferApproval",
        "enableLocationNumbering",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const result = await getById(rows[0].id);
    if (!result.success || !result.data) {
      return { success: false, error: "Created location could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "LOCATION",
      recordId: result.data.id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Location created successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create location" };
  }
}

export async function update(id: string, input: UpdateLocationInput, userId: string, userName: string): Promise<ServiceResult<Location>> {
  try {
    const existing = await getLocationRowById(id);
    if (!existing) {
      return { success: false, error: "Location not found" };
    }

    const rows = await sql<LocationRow[]>`
      UPDATE "Location"
      SET
        "locationCode" = ${Object.prototype.hasOwnProperty.call(input, "locationCode") ? normalizeString(input.locationCode) : existing.locationCode},
        "locationName" = ${Object.prototype.hasOwnProperty.call(input, "locationName") ? normalizeString(input.locationName) : existing.locationName},
        "locationType" = ${Object.prototype.hasOwnProperty.call(input, "locationType") ? normalizeString(input.locationType) : existing.locationType},
        address = ${Object.prototype.hasOwnProperty.call(input, "address") ? normalizeString(input.address) : existing.address},
        description = ${Object.prototype.hasOwnProperty.call(input, "description") ? normalizeString(input.description) : existing.description},
        "parentLocationId" = ${Object.prototype.hasOwnProperty.call(input, "parentLocationId") ? normalizeString(input.parentLocationId) : existing.parentLocationId},
        "displayOrder" = ${Object.prototype.hasOwnProperty.call(input, "displayOrder") ? Number(input.displayOrder ?? 0) : existing.displayOrder},
        city = ${Object.prototype.hasOwnProperty.call(input, "city") ? normalizeString(input.city) : existing.city},
        region = ${Object.prototype.hasOwnProperty.call(input, "region") ? normalizeString(input.region) : existing.region},
        country = ${Object.prototype.hasOwnProperty.call(input, "country") ? normalizeString(input.country) : existing.country},
        "gpsLatitude" = ${Object.prototype.hasOwnProperty.call(input, "gpsLatitude") ? normalizeString(input.gpsLatitude) : existing.gpsLatitude},
        "gpsLongitude" = ${Object.prototype.hasOwnProperty.call(input, "gpsLongitude") ? normalizeString(input.gpsLongitude) : existing.gpsLongitude},
        "managerId" = ${Object.prototype.hasOwnProperty.call(input, "managerId") ? normalizeString(input.managerId) : existing.managerId},
        "isStockLocation" = ${Object.prototype.hasOwnProperty.call(input, "isStockLocation") ? input.isStockLocation ?? true : existing.isStockLocation},
        "isProcurementLocation" = ${Object.prototype.hasOwnProperty.call(input, "isProcurementLocation") ? input.isProcurementLocation ?? false : existing.isProcurementLocation},
        "isProductionLocation" = ${Object.prototype.hasOwnProperty.call(input, "isProductionLocation") ? input.isProductionLocation ?? false : existing.isProductionLocation},
        "isSalesLocation" = ${Object.prototype.hasOwnProperty.call(input, "isSalesLocation") ? input.isSalesLocation ?? false : existing.isSalesLocation},
        "isTransitLocation" = ${Object.prototype.hasOwnProperty.call(input, "isTransitLocation") ? input.isTransitLocation ?? false : existing.isTransitLocation},
        "isScrapLocation" = ${Object.prototype.hasOwnProperty.call(input, "isScrapLocation") ? input.isScrapLocation ?? false : existing.isScrapLocation},
        "defaultPriceListId" = ${Object.prototype.hasOwnProperty.call(input, "defaultPriceListId") ? normalizeString(input.defaultPriceListId) : existing.defaultPriceListId},
        "defaultBankAccountId" = ${Object.prototype.hasOwnProperty.call(input, "defaultBankAccountId") ? normalizeString(input.defaultBankAccountId) : existing.defaultBankAccountId},
        "allowNegativeStock" = ${Object.prototype.hasOwnProperty.call(input, "allowNegativeStock") ? input.allowNegativeStock ?? false : existing.allowNegativeStock},
        "requireTransferApproval" = ${Object.prototype.hasOwnProperty.call(input, "requireTransferApproval") ? input.requireTransferApproval ?? false : existing.requireTransferApproval},
        "enableLocationNumbering" = ${Object.prototype.hasOwnProperty.call(input, "enableLocationNumbering") ? input.enableLocationNumbering ?? false : existing.enableLocationNumbering},
        "updatedById" = ${userId},
        "isActive" = ${Object.prototype.hasOwnProperty.call(input, "isActive") ? input.isActive ?? true : existing.isActive},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        "locationCode",
        "locationName",
        "locationType",
        address,
        description,
        "parentLocationId",
        NULL::text AS "parentLocationName",
        "displayOrder",
        city,
        region,
        country,
        "gpsLatitude",
        "gpsLongitude",
        "managerId",
        NULL::text AS "managerName",
        "isStockLocation",
        "isProcurementLocation",
        "isProductionLocation",
        "isSalesLocation",
        "isTransitLocation",
        "isScrapLocation",
        "defaultPriceListId",
        "defaultBankAccountId",
        "allowNegativeStock",
        "requireTransferApproval",
        "enableLocationNumbering",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const result = await getById(rows[0].id);
    if (!result.success || !result.data) {
      return { success: false, error: "Updated location could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "LOCATION",
      recordId: result.data.id,
      oldValue: mapLocation(existing) as unknown as Record<string, unknown>,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Location updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update location" };
  }
}

export async function deactivate(id: string, userId: string, userName: string): Promise<ServiceResult<Location>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(id: string, userId: string, userName: string): Promise<ServiceResult<Location>> {
  try {
    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Location not found" };
    }

    await sql`
      UPDATE "Location"
      SET "isArchived" = true, "isActive" = false, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "LOCATION",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: { isArchived: true, isActive: false },
    });

    return { success: true, data: { ...existing.data, isArchived: true, isActive: false }, message: "Location archived successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive location" };
  }
}

export async function restore(id: string, userId: string, userName: string): Promise<ServiceResult<Location>> {
  try {
    const rows = await sql<Array<{ id: string }>>`
      UPDATE "Location"
      SET "isArchived" = false, "isActive" = true, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING id
    `;

    if (!rows[0]?.id) {
      return { success: false, error: "Location not found" };
    }

    const result = await getById(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Restored location could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "LOCATION",
      recordId: id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Location restored successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore location" };
  }
}

export async function search(query: string): Promise<ServiceResult<Location[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
