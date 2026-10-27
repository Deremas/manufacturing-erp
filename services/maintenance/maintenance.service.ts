import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { allocateNextDocumentNumber, syncDocumentSequenceFromColumn } from "@/lib/document-numbering";
import {
  inventoryIssueToMaintenanceOrFleet,
  inventoryReturnFromMaintenanceOrFleet,
} from "@/services/inventory/module-integration.service";
import { reverseMaintenanceWorkOrderFinance, syncMaintenanceWorkOrderFinance } from "@/services/maintenance/maintenance-finance.service";
import { evaluatePreventiveMaintenanceDue } from "@/services/maintenance/pm-policy";
import type {
  AssetType,
  MaintenanceAsset,
  MaintenanceExternalCost,
  MaintenanceLabor,
  MaintenanceTicket,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderPart,
  PreventiveMaintenanceExecution,
  PreventiveMaintenancePlan,
} from "@/features/maintenance/types";

type Tx = typeof sql;

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeCode(value: unknown) {
  const text = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "-");
  return text.length > 0 ? text : null;
}

function normalizeDate(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function calculateNextMaintenanceDate(baseValue: string | Date, frequencyType: string, frequencyValue: number) {
  const date = new Date(baseValue);
  const value = Math.max(1, Number(frequencyValue || 1));
  switch (frequencyType) {
    case "DAILY": date.setUTCDate(date.getUTCDate() + value); break;
    case "WEEKLY": date.setUTCDate(date.getUTCDate() + (7 * value)); break;
    case "MONTHLY": date.setUTCMonth(date.getUTCMonth() + value); break;
    case "QUARTERLY": date.setUTCMonth(date.getUTCMonth() + (3 * value)); break;
    case "SEMI_ANNUAL": date.setUTCMonth(date.getUTCMonth() + (6 * value)); break;
    case "ANNUAL": date.setUTCFullYear(date.getUTCFullYear() + value); break;
    default: return null;
  }
  return date.toISOString();
}

export async function nextMaintenanceDocumentNumber(tx: Tx, prefix: string, description: string) {
  const tableByPrefix: Record<string, { table: string; column: string }> = {
    MT: { table: "MaintenanceTicket", column: "ticketNo" },
    WO: { table: "MaintenanceWorkOrder", column: "workOrderNo" },
    PM: { table: "PreventiveMaintenancePlan", column: "planNo" },
  };
  const mapping = tableByPrefix[prefix];

  return allocateNextDocumentNumber(tx, prefix, description, {
    syncFromRecords: mapping
      ? async (innerTx, config) =>
          syncDocumentSequenceFromColumn(innerTx, config, mapping.table, mapping.column)
      : undefined,
  });
}

function mapReadError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("relation") && message.includes("does not exist")) {
      return fallback;
    }
    console.error(error);
    return fallback;
  }
  return fallback;
}

function mapWriteError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("relation") && message.includes("does not exist")) {
      throw new Error("Maintenance tables are not ready in the database yet. Run the maintenance schema sync first.");
    }
    throw error;
  }
  throw new Error(fallback);
}

function mapAssetType(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}): AssetType {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    isActive: row.isActive,
  };
}

function mapAsset(row: {
  id: string;
  publicId: number;
  assetCode: string;
  assetName: string;
  assetClass: string;
  assetTypeId: string;
  assetTypeCode: string | null;
  assetTypeName: string | null;
  assetCategoryId: string | null;
  assetCategoryCode: string | null;
  assetCategoryName: string | null;
  serialNumber: string | null;
  model: string | null;
  manufacturer: string | null;
  manufactureYear: number | null;
  locationId: string;
  locationCode: string | null;
  locationName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  purchaseDate: string | null;
  installationDate: string | null;
  commissioningDate: string | null;
  purchaseCost: number | null;
  currentBookValue: number | null;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  expectedLifeYears: number | null;
  meterType: string | null;
  meterUnit: string | null;
  currentMeterReading: number | null;
  supplierId: string | null;
  purchaseOrderId: string | null;
  grnId: string | null;
  isProductionAsset: boolean;
  isMaintenanceRequired: boolean;
  status: string;
  criticality: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}): MaintenanceAsset {
  return {
    id: row.id,
    publicId: row.publicId,
    assetCode: row.assetCode,
    assetName: row.assetName,
    assetClass: row.assetClass,
    assetTypeId: row.assetTypeId,
    assetTypeCode: row.assetTypeCode ?? undefined,
    assetTypeName: row.assetTypeName ?? undefined,
    assetCategoryId: row.assetCategoryId ?? undefined,
    assetCategoryCode: row.assetCategoryCode ?? undefined,
    assetCategoryName: row.assetCategoryName ?? undefined,
    serialNumber: row.serialNumber ?? undefined,
    model: row.model ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    manufactureYear: row.manufactureYear ?? undefined,
    locationId: row.locationId,
    locationCode: row.locationCode ?? undefined,
    locationName: row.locationName ?? undefined,
    departmentId: row.departmentId ?? undefined,
    departmentName: row.departmentName ?? undefined,
    responsibleUserId: row.responsibleUserId ?? undefined,
    responsibleUserName: row.responsibleUserName ?? undefined,
    purchaseDate: row.purchaseDate ?? undefined,
    installationDate: row.installationDate ?? undefined,
    commissioningDate: row.commissioningDate ?? undefined,
    purchaseCost: row.purchaseCost ?? undefined,
    currentBookValue: row.currentBookValue ?? undefined,
    warrantyStart: row.warrantyStart ?? undefined,
    warrantyEnd: row.warrantyEnd ?? undefined,
    expectedLifeYears: row.expectedLifeYears ?? undefined,
    meterType: row.meterType ?? undefined,
    meterUnit: row.meterUnit ?? undefined,
    currentMeterReading: row.currentMeterReading ?? undefined,
    supplierId: row.supplierId ?? undefined,
    purchaseOrderId: row.purchaseOrderId ?? undefined,
    grnId: row.grnId ?? undefined,
    isProductionAsset: row.isProductionAsset,
    isMaintenanceRequired: row.isMaintenanceRequired,
    status: row.status,
    criticality: row.criticality,
    description: row.description ?? undefined,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapTicket(row: {
  id: string;
  publicId: number;
  ticketNo: string;
  requestDate: string;
  assetId: string;
  assetCode: string | null;
  assetName: string | null;
  locationId: string;
  locationCode: string | null;
  locationName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  requestedById: string;
  requestedByName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  type: string;
  priority: string;
  problemDescription: string;
  failureDate: string | null;
  productionDowntimeId: string | null;
  status: string;
  approvalStatus: string;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}): MaintenanceTicket {
  return {
    id: row.id,
    publicId: row.publicId,
    ticketNo: row.ticketNo,
    requestDate: row.requestDate,
    assetId: row.assetId,
    assetCode: row.assetCode ?? undefined,
    assetName: row.assetName ?? undefined,
    locationId: row.locationId,
    locationCode: row.locationCode ?? undefined,
    locationName: row.locationName ?? undefined,
    departmentId: row.departmentId ?? undefined,
    departmentName: row.departmentName ?? undefined,
    requestedById: row.requestedById,
    requestedByName: row.requestedByName ?? undefined,
    assignedToId: row.assignedToId ?? undefined,
    assignedToName: row.assignedToName ?? undefined,
    type: row.type,
    priority: row.priority,
    problemDescription: row.problemDescription,
    failureDate: row.failureDate ?? undefined,
    productionDowntimeId: row.productionDowntimeId ?? undefined,
    status: row.status,
    approvalStatus: row.approvalStatus,
    targetCompletionDate: row.targetCompletionDate ?? undefined,
    actualCompletionDate: row.actualCompletionDate ?? undefined,
    remarks: row.remarks ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAssetTypes() {
  try {
    const rows = await sql<Array<{ id: string; code: string; name: string; description: string | null; isActive: boolean }>>`
      SELECT id, code, name, description, "isActive"
      FROM "AssetType"
      WHERE "isArchived" = false
      ORDER BY code ASC, name ASC
    `;
    return rows.map(mapAssetType);
  } catch (error) {
    mapReadError(error, "Failed to load asset types");
    return [];
  }
}

export async function getAssets() {
  try {
    const rows = await sql<Array<{
      id: string; publicId: number; assetCode: string; assetName: string; assetClass: string; assetTypeId: string; assetTypeCode: string | null; assetTypeName: string | null;
      assetCategoryId: string | null; assetCategoryCode: string | null; assetCategoryName: string | null;
      serialNumber: string | null; model: string | null; manufacturer: string | null; manufactureYear: number | null; locationId: string; locationCode: string | null; locationName: string | null;
      departmentId: string | null; departmentName: string | null; responsibleUserId: string | null; responsibleUserName: string | null;
      purchaseDate: string | null; installationDate: string | null; commissioningDate: string | null; purchaseCost: number | null; currentBookValue: number | null; warrantyStart: string | null; warrantyEnd: string | null;
      expectedLifeYears: number | null; meterType: string | null; meterUnit: string | null; currentMeterReading: number | null; supplierId: string | null; purchaseOrderId: string | null; grnId: string | null; isProductionAsset: boolean; isMaintenanceRequired: boolean; status: string; criticality: string; description: string | null;
      isActive: boolean; createdAt: string; updatedAt: string;
    }>>`
      SELECT
        a.id,
        a."publicId",
        a."assetCode",
        a."assetName",
        a."assetClass"::text AS "assetClass",
        a."assetTypeId",
        at.code AS "assetTypeCode",
        at.name AS "assetTypeName",
        a."assetCategoryId",
        ac.code AS "assetCategoryCode",
        ac.name AS "assetCategoryName",
        a."serialNumber",
        a.model,
        a.manufacturer,
        a."manufactureYear",
        a."locationId",
        l."locationCode",
        l."locationName",
        a."departmentId",
        d.name AS "departmentName",
        a."responsibleUserId",
        u.name AS "responsibleUserName",
        a."purchaseDate"::text AS "purchaseDate",
        a."installationDate"::text AS "installationDate",
        a."commissioningDate"::text AS "commissioningDate",
        a."purchaseCost",
        a."currentBookValue",
        a."warrantyStart"::text AS "warrantyStart",
        a."warrantyEnd"::text AS "warrantyEnd",
        a."expectedLifeYears",
        a."meterType",
        a."meterUnit",
        a."currentMeterReading",
        a."supplierId",
        a."purchaseOrderId",
        a."grnId",
        a."isProductionAsset",
        a."isMaintenanceRequired",
        a.status::text AS status,
        a.criticality::text AS criticality,
        a.description,
        a."isActive",
        a."createdAt"::text AS "createdAt",
        a."updatedAt"::text AS "updatedAt"
      FROM "Asset" a
      INNER JOIN "AssetType" at ON at.id = a."assetTypeId"
      LEFT JOIN "AssetCategory" ac ON ac.id = a."assetCategoryId"
      INNER JOIN "Location" l ON l.id = a."locationId"
      LEFT JOIN "Department" d ON d.id = a."departmentId"
      LEFT JOIN "User" u ON u.id = a."responsibleUserId"
      WHERE a."isArchived" = false
      ORDER BY a."assetCode" ASC, a."assetName" ASC
    `;
    return rows.map(mapAsset);
  } catch (error) {
    mapReadError(error, "Failed to load assets");
    return [];
  }
}

export async function getAssetById(id: string) {
  try {
    const rows = await sql<Array<{
      id: string; publicId: number; assetCode: string; assetName: string; assetClass: string; assetTypeId: string; assetTypeCode: string | null; assetTypeName: string | null;
      assetCategoryId: string | null; assetCategoryCode: string | null; assetCategoryName: string | null;
      serialNumber: string | null; model: string | null; manufacturer: string | null; manufactureYear: number | null; locationId: string; locationCode: string | null; locationName: string | null;
      departmentId: string | null; departmentName: string | null; responsibleUserId: string | null; responsibleUserName: string | null;
      purchaseDate: string | null; installationDate: string | null; commissioningDate: string | null; purchaseCost: number | null; currentBookValue: number | null; warrantyStart: string | null; warrantyEnd: string | null;
      expectedLifeYears: number | null; meterType: string | null; meterUnit: string | null; currentMeterReading: number | null; supplierId: string | null; purchaseOrderId: string | null; grnId: string | null; isProductionAsset: boolean; isMaintenanceRequired: boolean; status: string; criticality: string; description: string | null;
      isActive: boolean; createdAt: string; updatedAt: string;
    }>>`
      SELECT
        a.id,
        a."publicId",
        a."assetCode",
        a."assetName",
        a."assetClass"::text AS "assetClass",
        a."assetTypeId",
        at.code AS "assetTypeCode",
        at.name AS "assetTypeName",
        a."assetCategoryId",
        ac.code AS "assetCategoryCode",
        ac.name AS "assetCategoryName",
        a."serialNumber",
        a.model,
        a.manufacturer,
        a."manufactureYear",
        a."locationId",
        l."locationCode",
        l."locationName",
        a."departmentId",
        d.name AS "departmentName",
        a."responsibleUserId",
        u.name AS "responsibleUserName",
        a."purchaseDate"::text AS "purchaseDate",
        a."installationDate"::text AS "installationDate",
        a."commissioningDate"::text AS "commissioningDate",
        a."purchaseCost",
        a."currentBookValue",
        a."warrantyStart"::text AS "warrantyStart",
        a."warrantyEnd"::text AS "warrantyEnd",
        a."expectedLifeYears",
        a."meterType",
        a."meterUnit",
        a."currentMeterReading",
        a."supplierId",
        a."purchaseOrderId",
        a."grnId",
        a."isProductionAsset",
        a."isMaintenanceRequired",
        a.status::text AS status,
        a.criticality::text AS criticality,
        a.description,
        a."isActive",
        a."createdAt"::text AS "createdAt",
        a."updatedAt"::text AS "updatedAt"
      FROM "Asset" a
      INNER JOIN "AssetType" at ON at.id = a."assetTypeId"
      LEFT JOIN "AssetCategory" ac ON ac.id = a."assetCategoryId"
      INNER JOIN "Location" l ON l.id = a."locationId"
      LEFT JOIN "Department" d ON d.id = a."departmentId"
      LEFT JOIN "User" u ON u.id = a."responsibleUserId"
      WHERE ${isPublicIdParam(id) ? sql`a."publicId" = ${Number(id)}` : sql`a.id = ${id}`}
        AND a."isArchived" = false
      LIMIT 1
    `;
    return rows[0] ? mapAsset(rows[0]) : null;
  } catch (error) {
    mapReadError(error, "Failed to load asset");
    return null;
  }
}

export async function createAsset(input: {
  assetCode: string;
  assetName: string;
  assetClass?: string;
  assetTypeId: string;
  assetCategoryId?: string | null;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  manufactureYear?: number | null;
  locationId: string;
  departmentId?: string | null;
  responsibleUserId?: string | null;
  purchaseDate?: string | null;
  installationDate?: string | null;
  commissioningDate?: string | null;
  purchaseCost?: number | null;
  currentBookValue?: number | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  expectedLifeYears?: number | null;
  meterType?: string | null;
  meterUnit?: string | null;
  currentMeterReading?: number | null;
  supplierId?: string | null;
  purchaseOrderId?: string | null;
  grnId?: string | null;
  isProductionAsset?: boolean;
  isMaintenanceRequired?: boolean;
  status?: string;
  criticality?: string;
  description?: string | null;
  isActive?: boolean;
  createdById?: string | null;
}) {
  try {
    const assetCode = normalizeCode(input.assetCode);
    const assetName = normalizeText(input.assetName);
    const assetTypeId = normalizeText(input.assetTypeId);
    const locationId = normalizeText(input.locationId);
    if (!assetCode || !assetName || !assetTypeId || !locationId) {
      throw new Error("Asset code, asset name, asset type, and location are required");
    }

    const assetId = randomUUID();
    await sql`
      INSERT INTO "Asset" (
        id, "assetCode", "assetName", "assetClass", "assetTypeId", "assetCategoryId", "serialNumber", model, manufacturer, "manufactureYear",
        "locationId", "departmentId", "responsibleUserId", "purchaseDate", "installationDate",
        "commissioningDate", "purchaseCost", "currentBookValue", "warrantyStart", "warrantyEnd", "expectedLifeYears", "meterType", "meterUnit",
        "currentMeterReading", "supplierId", "purchaseOrderId", "grnId", "isProductionAsset", "isMaintenanceRequired",
        status, criticality, description, "isActive", "isArchived", "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${assetId},
        ${assetCode},
        ${assetName},
        ${normalizeCode(input.assetClass) ?? "OTHER"},
        ${assetTypeId},
        ${normalizeText(input.assetCategoryId)},
        ${normalizeText(input.serialNumber)},
        ${normalizeText(input.model)},
        ${normalizeText(input.manufacturer)},
        ${normalizeNumber(input.manufactureYear)},
        ${locationId},
        ${normalizeText(input.departmentId)},
        ${normalizeText(input.responsibleUserId)},
        ${normalizeDate(input.purchaseDate)},
        ${normalizeDate(input.installationDate)},
        ${normalizeDate(input.commissioningDate)},
        ${normalizeNumber(input.purchaseCost)},
        ${normalizeNumber(input.currentBookValue)},
        ${normalizeDate(input.warrantyStart)},
        ${normalizeDate(input.warrantyEnd)},
        ${normalizeNumber(input.expectedLifeYears)},
        ${normalizeText(input.meterType)},
        ${normalizeText(input.meterUnit)},
        ${normalizeNumber(input.currentMeterReading)},
        ${normalizeText(input.supplierId)},
        ${normalizeText(input.purchaseOrderId)},
        ${normalizeText(input.grnId)},
        ${Boolean(input.isProductionAsset)},
        ${input.isMaintenanceRequired !== false},
        ${normalizeCode(input.status) ?? "ACTIVE"},
        ${normalizeCode(input.criticality) ?? "MEDIUM"},
        ${normalizeText(input.description)},
        ${input.isActive !== false},
        false,
        ${normalizeText(input.createdById)},
        NOW(),
        NOW()
      )
    `;

    if (input.createdById) {
      const snapshot = JSON.stringify({ assetCode, assetName, assetClass: input.assetClass ?? "OTHER", locationId });
      await sql`INSERT INTO "AssetHistory" (id, "assetId", "eventType", "eventDate", "newStatus", "newLocationId", "performedById", remarks, "createdAt") VALUES (${randomUUID()}, ${assetId}, 'ASSET_CREATED', NOW(), ${normalizeCode(input.status) ?? "ACTIVE"}, ${locationId}, ${input.createdById}, ${normalizeText(input.description)}, NOW())`;
      await sql`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived") VALUES (${randomUUID()}, ${input.createdById}, 'CREATE_ASSET', 'maintenance.assets', ${assetId}, ${snapshot}, NOW(), false)`;
    }

    return getAssetById(assetId);
  } catch (error) {
    mapWriteError(error, "Failed to create asset");
  }
}

export async function updateAsset(id: string, input: {
  assetCode: string;
  assetName: string;
  assetClass?: string;
  assetTypeId: string;
  assetCategoryId?: string | null;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  manufactureYear?: number | null;
  locationId: string;
  departmentId?: string | null;
  responsibleUserId?: string | null;
  purchaseDate?: string | null;
  installationDate?: string | null;
  commissioningDate?: string | null;
  purchaseCost?: number | null;
  currentBookValue?: number | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  expectedLifeYears?: number | null;
  meterType?: string | null;
  meterUnit?: string | null;
  currentMeterReading?: number | null;
  supplierId?: string | null;
  purchaseOrderId?: string | null;
  grnId?: string | null;
  isProductionAsset?: boolean;
  isMaintenanceRequired?: boolean;
  status?: string;
  criticality?: string;
  description?: string | null;
  isActive?: boolean;
  updatedById?: string | null;
}) {
  try {
    const assetCode = normalizeCode(input.assetCode);
    const assetName = normalizeText(input.assetName);
    const assetTypeId = normalizeText(input.assetTypeId);
    const locationId = normalizeText(input.locationId);
    if (!assetCode || !assetName || !assetTypeId || !locationId) {
      throw new Error("Asset code, asset name, asset type, and location are required");
    }

    const previous = await getAssetById(id);
    const rows = await sql<Array<{
      id: string; publicId: number; assetCode: string; assetName: string; assetClass: string; assetTypeId: string; assetTypeCode: string | null; assetTypeName: string | null;
      assetCategoryId: string | null; assetCategoryCode: string | null; assetCategoryName: string | null;
      serialNumber: string | null; model: string | null; manufacturer: string | null; manufactureYear: number | null; locationId: string; locationCode: string | null; locationName: string | null;
      departmentId: string | null; departmentName: string | null; responsibleUserId: string | null; responsibleUserName: string | null;
      purchaseDate: string | null; installationDate: string | null; commissioningDate: string | null; purchaseCost: number | null; currentBookValue: number | null; warrantyStart: string | null; warrantyEnd: string | null;
      expectedLifeYears: number | null; meterType: string | null; meterUnit: string | null; currentMeterReading: number | null; supplierId: string | null; purchaseOrderId: string | null; grnId: string | null; isProductionAsset: boolean; isMaintenanceRequired: boolean; status: string; criticality: string; description: string | null;
      isActive: boolean; createdAt: string; updatedAt: string;
    }>>`
      WITH updated AS (
        UPDATE "Asset"
        SET
          "assetCode" = ${assetCode},
          "assetName" = ${assetName},
          "assetClass" = ${normalizeCode(input.assetClass) ?? "OTHER"},
          "assetTypeId" = ${assetTypeId},
          "assetCategoryId" = ${normalizeText(input.assetCategoryId)},
          "serialNumber" = ${normalizeText(input.serialNumber)},
          model = ${normalizeText(input.model)},
          manufacturer = ${normalizeText(input.manufacturer)},
          "manufactureYear" = ${normalizeNumber(input.manufactureYear)},
          "locationId" = ${locationId},
          "departmentId" = ${normalizeText(input.departmentId)},
          "responsibleUserId" = ${normalizeText(input.responsibleUserId)},
          "purchaseDate" = ${normalizeDate(input.purchaseDate)},
          "installationDate" = ${normalizeDate(input.installationDate)},
          "commissioningDate" = ${normalizeDate(input.commissioningDate)},
          "purchaseCost" = ${input.purchaseCost === undefined ? previous?.purchaseCost ?? null : normalizeNumber(input.purchaseCost)},
          "currentBookValue" = ${input.currentBookValue === undefined ? previous?.currentBookValue ?? null : normalizeNumber(input.currentBookValue)},
          "warrantyStart" = ${normalizeDate(input.warrantyStart)},
          "warrantyEnd" = ${normalizeDate(input.warrantyEnd)},
          "expectedLifeYears" = ${normalizeNumber(input.expectedLifeYears)},
          "meterType" = ${normalizeText(input.meterType)},
          "meterUnit" = ${normalizeText(input.meterUnit)},
          "currentMeterReading" = ${normalizeNumber(input.currentMeterReading)},
          "supplierId" = ${normalizeText(input.supplierId)},
          "purchaseOrderId" = ${normalizeText(input.purchaseOrderId)},
          "grnId" = ${normalizeText(input.grnId)},
          "isProductionAsset" = ${Boolean(input.isProductionAsset)},
          "isMaintenanceRequired" = ${input.isMaintenanceRequired !== false},
          status = ${normalizeCode(input.status) ?? "ACTIVE"},
          criticality = ${normalizeCode(input.criticality) ?? "MEDIUM"},
          description = ${normalizeText(input.description)},
          "isActive" = ${input.isActive !== false},
          "updatedById" = ${normalizeText(input.updatedById)},
          "updatedAt" = NOW()
        WHERE id = ${id}
          AND "isArchived" = false
        RETURNING id
      )
      SELECT
        a.id,
        a."publicId",
        a."assetCode",
        a."assetName",
        a."assetClass"::text AS "assetClass",
        a."assetTypeId",
        at.code AS "assetTypeCode",
        at.name AS "assetTypeName",
        a."assetCategoryId",
        ac.code AS "assetCategoryCode",
        ac.name AS "assetCategoryName",
        a."serialNumber",
        a.model,
        a.manufacturer,
        a."manufactureYear",
        a."locationId",
        l."locationCode",
        l."locationName",
        a."departmentId",
        d.name AS "departmentName",
        a."responsibleUserId",
        u.name AS "responsibleUserName",
        a."purchaseDate"::text AS "purchaseDate",
        a."installationDate"::text AS "installationDate",
        a."commissioningDate"::text AS "commissioningDate",
        a."purchaseCost",
        a."currentBookValue",
        a."warrantyStart"::text AS "warrantyStart",
        a."warrantyEnd"::text AS "warrantyEnd",
        a."expectedLifeYears",
        a."meterType",
        a."meterUnit",
        a."currentMeterReading",
        a."supplierId",
        a."purchaseOrderId",
        a."grnId",
        a."isProductionAsset",
        a."isMaintenanceRequired",
        a.status::text AS status,
        a.criticality::text AS criticality,
        a.description,
        a."isActive",
        a."createdAt"::text AS "createdAt",
        a."updatedAt"::text AS "updatedAt"
      FROM updated
      INNER JOIN "Asset" a ON a.id = updated.id
      INNER JOIN "AssetType" at ON at.id = a."assetTypeId"
      LEFT JOIN "AssetCategory" ac ON ac.id = a."assetCategoryId"
      INNER JOIN "Location" l ON l.id = a."locationId"
      LEFT JOIN "Department" d ON d.id = a."departmentId"
      LEFT JOIN "User" u ON u.id = a."responsibleUserId"
    `;
    if (!rows[0]) {
      throw new Error("Asset not found");
    }
    if (input.updatedById) {
      const changedStatus = previous?.status !== rows[0].status;
      const changedLocation = previous?.locationId !== rows[0].locationId;
      const snapshot = JSON.stringify({ previous, current: mapAsset(rows[0]) });
      await sql`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "oldValue", "newValue", timestamp, "isArchived") VALUES (${randomUUID()}, ${input.updatedById}, 'UPDATE_ASSET', 'maintenance.assets', ${id}, ${JSON.stringify(previous)}, ${snapshot}, NOW(), false)`;
      await sql`INSERT INTO "AssetHistory" (id, "assetId", "eventType", "eventDate", "oldStatus", "newStatus", "oldLocationId", "newLocationId", "performedById", remarks, "createdAt") VALUES (${randomUUID()}, ${id}, ${changedStatus || changedLocation ? 'ASSET_STATUS_OR_LOCATION_UPDATED' : 'ASSET_UPDATED'}, NOW(), ${previous?.status ?? null}, ${rows[0].status}, ${previous?.locationId ?? null}, ${rows[0].locationId}, ${input.updatedById}, ${normalizeText(input.description)}, NOW())`;
    }
    return mapAsset(rows[0]);
  } catch (error) {
    mapWriteError(error, "Failed to update asset");
  }
}

export async function getMaintenanceTickets() {
  try {
    const rows = await sql<Array<{
      id: string; publicId: number; ticketNo: string; requestDate: string; assetId: string; assetCode: string | null; assetName: string | null;
      locationId: string; locationCode: string | null; locationName: string | null; departmentId: string | null; departmentName: string | null;
      requestedById: string; requestedByName: string | null; assignedToId: string | null; assignedToName: string | null;
      type: string; priority: string; problemDescription: string; failureDate: string | null; productionDowntimeId: string | null;
      status: string; approvalStatus: string; targetCompletionDate: string | null; actualCompletionDate: string | null; remarks: string | null;
      createdAt: string; updatedAt: string;
    }>>`
      SELECT
        t.id,
        t."publicId",
        t."ticketNo",
        t."requestDate"::text AS "requestDate",
        t."assetId",
        a."assetCode",
        a."assetName",
        t."locationId",
        l."locationCode",
        l."locationName",
        t."departmentId",
        d.name AS "departmentName",
        t."requestedById",
        ru.name AS "requestedByName",
        t."assignedToId",
        au.name AS "assignedToName",
        t.type::text AS type,
        t.priority::text AS priority,
        t."problemDescription",
        t."failureDate"::text AS "failureDate",
        t."productionDowntimeId",
        t.status::text AS status,
        t."approvalStatus"::text AS "approvalStatus",
        t."targetCompletionDate"::text AS "targetCompletionDate",
        t."actualCompletionDate"::text AS "actualCompletionDate",
        t.remarks,
        t."createdAt"::text AS "createdAt",
        t."updatedAt"::text AS "updatedAt"
      FROM "MaintenanceTicket" t
      INNER JOIN "Asset" a ON a.id = t."assetId"
      INNER JOIN "Location" l ON l.id = t."locationId"
      LEFT JOIN "Department" d ON d.id = t."departmentId"
      INNER JOIN "User" ru ON ru.id = t."requestedById"
      LEFT JOIN "User" au ON au.id = t."assignedToId"
      WHERE t."isArchived" = false
      ORDER BY t."requestDate" DESC, t."ticketNo" DESC
    `;
    return rows.map(mapTicket);
  } catch (error) {
    mapReadError(error, "Failed to load maintenance tickets");
    return [];
  }
}

export async function getMaintenanceTicketById(id: string) {
  try {
    const rows = await sql<Array<{
      id: string; publicId: number; ticketNo: string; requestDate: string; assetId: string; assetCode: string | null; assetName: string | null;
      locationId: string; locationCode: string | null; locationName: string | null; departmentId: string | null; departmentName: string | null;
      requestedById: string; requestedByName: string | null; assignedToId: string | null; assignedToName: string | null;
      type: string; priority: string; problemDescription: string; failureDate: string | null; productionDowntimeId: string | null;
      status: string; approvalStatus: string; targetCompletionDate: string | null; actualCompletionDate: string | null; remarks: string | null;
      createdAt: string; updatedAt: string;
    }>>`
      SELECT
        t.id,
        t."publicId",
        t."ticketNo",
        t."requestDate"::text AS "requestDate",
        t."assetId",
        a."assetCode",
        a."assetName",
        t."locationId",
        l."locationCode",
        l."locationName",
        t."departmentId",
        d.name AS "departmentName",
        t."requestedById",
        ru.name AS "requestedByName",
        t."assignedToId",
        au.name AS "assignedToName",
        t.type::text AS type,
        t.priority::text AS priority,
        t."problemDescription",
        t."failureDate"::text AS "failureDate",
        t."productionDowntimeId",
        t.status::text AS status,
        t."approvalStatus"::text AS "approvalStatus",
        t."targetCompletionDate"::text AS "targetCompletionDate",
        t."actualCompletionDate"::text AS "actualCompletionDate",
        t.remarks,
        t."createdAt"::text AS "createdAt",
        t."updatedAt"::text AS "updatedAt"
      FROM "MaintenanceTicket" t
      INNER JOIN "Asset" a ON a.id = t."assetId"
      INNER JOIN "Location" l ON l.id = t."locationId"
      LEFT JOIN "Department" d ON d.id = t."departmentId"
      INNER JOIN "User" ru ON ru.id = t."requestedById"
      LEFT JOIN "User" au ON au.id = t."assignedToId"
      WHERE ${isPublicIdParam(id) ? sql`t."publicId" = ${Number(id)}` : sql`t.id = ${id}`}
        AND t."isArchived" = false
      LIMIT 1
    `;
    return rows[0] ? mapTicket(rows[0]) : null;
  } catch (error) {
    mapReadError(error, "Failed to load maintenance ticket");
    return null;
  }
}

export async function createMaintenanceTicket(input: {
  ticketNo?: string | null;
  requestDate: string;
  assetId: string;
  locationId: string;
  departmentId?: string | null;
  requestedById: string;
  assignedToId?: string | null;
  type: string;
  priority: string;
  problemDescription: string;
  failureDate?: string | null;
  productionDowntimeId?: string | null;
  status?: string;
  approvalStatus?: string;
  targetCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  remarks?: string | null;
}) {
  try {
    const requestDate = normalizeDate(input.requestDate);
    const assetId = normalizeText(input.assetId);
    const locationId = normalizeText(input.locationId);
    const requestedById = normalizeText(input.requestedById);
    const type = normalizeCode(input.type);
    const priority = normalizeCode(input.priority);
    const problemDescription = normalizeText(input.problemDescription);
    if (!requestDate || !assetId || !locationId || !requestedById || !type || !priority || !problemDescription) {
      throw new Error("Ticket date, asset, location, requester, type, priority, and problem description are required");
    }
    let ticketId = "";
    await sql.begin(async (tx) => {
      const ticketNo = normalizeCode(input.ticketNo) ?? await nextMaintenanceDocumentNumber(tx, "MT", "Maintenance Ticket");
      ticketId = randomUUID();
      await tx`
        INSERT INTO "MaintenanceTicket" (
          id, "ticketNo", "requestDate", "assetId", "locationId", "departmentId",
          "requestedById", "assignedToId", type, priority, "problemDescription",
          "failureDate", "productionDowntimeId", status, "approvalStatus",
          "targetCompletionDate", "actualCompletionDate", remarks, "isArchived", "createdAt", "updatedAt"
        )
        VALUES (
          ${ticketId},
          ${ticketNo},
          ${requestDate},
          ${assetId},
          ${locationId},
          ${normalizeText(input.departmentId)},
          ${requestedById},
          ${normalizeText(input.assignedToId)},
          ${type},
          ${priority},
          ${problemDescription},
          ${normalizeDate(input.failureDate)},
          ${normalizeText(input.productionDowntimeId)},
          ${normalizeCode(input.status) ?? "DRAFT"},
          ${normalizeCode(input.approvalStatus) ?? "PENDING"},
          ${normalizeDate(input.targetCompletionDate)},
          ${normalizeDate(input.actualCompletionDate)},
          ${normalizeText(input.remarks)},
          false,
          NOW(),
          NOW()
        )
      `;
    });
    return getMaintenanceTicketById(ticketId);
  } catch (error) {
    mapWriteError(error, "Failed to create maintenance ticket");
  }
}

export async function updateMaintenanceTicket(id: string, input: {
  requestDate: string;
  assetId: string;
  locationId: string;
  departmentId?: string | null;
  requestedById: string;
  assignedToId?: string | null;
  type: string;
  priority: string;
  problemDescription: string;
  failureDate?: string | null;
  productionDowntimeId?: string | null;
  status?: string;
  approvalStatus?: string;
  targetCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  remarks?: string | null;
}) {
  try {
    const requestDate = normalizeDate(input.requestDate);
    const assetId = normalizeText(input.assetId);
    const locationId = normalizeText(input.locationId);
    const requestedById = normalizeText(input.requestedById);
    const type = normalizeCode(input.type);
    const priority = normalizeCode(input.priority);
    const problemDescription = normalizeText(input.problemDescription);
    if (!requestDate || !assetId || !locationId || !requestedById || !type || !priority || !problemDescription) {
      throw new Error("Ticket date, asset, location, requester, type, priority, and problem description are required");
    }

    const rows = await sql<Array<{
      id: string; publicId: number; ticketNo: string; requestDate: string; assetId: string; assetCode: string | null; assetName: string | null;
      locationId: string; locationCode: string | null; locationName: string | null; departmentId: string | null; departmentName: string | null;
      requestedById: string; requestedByName: string | null; assignedToId: string | null; assignedToName: string | null;
      type: string; priority: string; problemDescription: string; failureDate: string | null; productionDowntimeId: string | null;
      status: string; approvalStatus: string; targetCompletionDate: string | null; actualCompletionDate: string | null; remarks: string | null;
      createdAt: string; updatedAt: string;
    }>>`
      WITH updated AS (
        UPDATE "MaintenanceTicket"
        SET
          "requestDate" = ${requestDate},
          "assetId" = ${assetId},
          "locationId" = ${locationId},
          "departmentId" = ${normalizeText(input.departmentId)},
          "requestedById" = ${requestedById},
          "assignedToId" = ${normalizeText(input.assignedToId)},
          type = ${type},
          priority = ${priority},
          "problemDescription" = ${problemDescription},
          "failureDate" = ${normalizeDate(input.failureDate)},
          "productionDowntimeId" = ${normalizeText(input.productionDowntimeId)},
          status = ${normalizeCode(input.status) ?? "DRAFT"},
          "approvalStatus" = ${normalizeCode(input.approvalStatus) ?? "PENDING"},
          "targetCompletionDate" = ${normalizeDate(input.targetCompletionDate)},
          "actualCompletionDate" = ${normalizeDate(input.actualCompletionDate)},
          remarks = ${normalizeText(input.remarks)},
          "updatedAt" = NOW()
        WHERE id = ${id}
          AND "isArchived" = false
        RETURNING id
      )
      SELECT
        t.id,
        t."publicId",
        t."ticketNo",
        t."requestDate"::text AS "requestDate",
        t."assetId",
        a."assetCode",
        a."assetName",
        t."locationId",
        l."locationCode",
        l."locationName",
        t."departmentId",
        d.name AS "departmentName",
        t."requestedById",
        ru.name AS "requestedByName",
        t."assignedToId",
        au.name AS "assignedToName",
        t.type::text AS type,
        t.priority::text AS priority,
        t."problemDescription",
        t."failureDate"::text AS "failureDate",
        t."productionDowntimeId",
        t.status::text AS status,
        t."approvalStatus"::text AS "approvalStatus",
        t."targetCompletionDate"::text AS "targetCompletionDate",
        t."actualCompletionDate"::text AS "actualCompletionDate",
        t.remarks,
        t."createdAt"::text AS "createdAt",
        t."updatedAt"::text AS "updatedAt"
      FROM updated
      INNER JOIN "MaintenanceTicket" t ON t.id = updated.id
      INNER JOIN "Asset" a ON a.id = t."assetId"
      INNER JOIN "Location" l ON l.id = t."locationId"
      LEFT JOIN "Department" d ON d.id = t."departmentId"
      INNER JOIN "User" ru ON ru.id = t."requestedById"
      LEFT JOIN "User" au ON au.id = t."assignedToId"
    `;
    if (!rows[0]) {
      throw new Error("Maintenance ticket not found");
    }
    return mapTicket(rows[0]);
  } catch (error) {
    mapWriteError(error, "Failed to update maintenance ticket");
  }
}

export async function transitionMaintenanceTicket(input: {
  id: string;
  action: "submit" | "check" | "approve" | "reject" | "cancel";
  performedById: string;
  remarks?: string | null;
}) {
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; assetId: string; requestedById: string; checkedById: string | null; status: string; approvalStatus: string }>>`
      SELECT id, "assetId", "requestedById", "checkedById", status::text AS status, "approvalStatus"
      FROM "MaintenanceTicket" WHERE id = ${input.id} AND "isArchived" = false LIMIT 1 FOR UPDATE`;
    const ticket = rows[0];
    if (!ticket) throw new Error("Maintenance ticket not found");
    if (input.action === "submit") {
      if (ticket.status !== "DRAFT") throw new Error("Only draft tickets can be submitted");
      await tx`UPDATE "MaintenanceTicket" SET status = 'SUBMITTED', "approvalStatus" = 'PENDING', "submittedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else if (input.action === "check") {
      if (ticket.status !== "SUBMITTED" || ticket.approvalStatus !== "PENDING") throw new Error("Only pending submitted tickets can be checked");
      if (ticket.requestedById === input.performedById) throw new Error("Ticket requester cannot check their own ticket");
      await tx`UPDATE "MaintenanceTicket" SET "approvalStatus" = 'CHECKED', "checkedById" = ${input.performedById}, "checkedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else if (input.action === "approve") {
      if (ticket.status !== "SUBMITTED" || ticket.approvalStatus !== "CHECKED") throw new Error("Ticket must be checked before approval");
      if (ticket.requestedById === input.performedById || ticket.checkedById === input.performedById) throw new Error("Ticket approver must be separate from requester and checker");
      await tx`UPDATE "MaintenanceTicket" SET status = 'APPROVED', "approvalStatus" = 'APPROVED', "approvedById" = ${input.performedById}, "approvedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else if (input.action === "reject") {
      if (ticket.status !== "SUBMITTED") throw new Error("Only submitted tickets can be rejected");
      await tx`UPDATE "MaintenanceTicket" SET status = 'REJECTED', "approvalStatus" = 'REJECTED', remarks = COALESCE(${normalizeText(input.remarks)}, remarks), "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else {
      if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(ticket.status)) throw new Error(`Ticket cannot be cancelled while ${ticket.status}`);
      const linked = await tx<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "MaintenanceWorkOrder" WHERE "ticketId" = ${input.id} AND status NOT IN ('CANCELLED', 'CLOSED')`;
      if (Number(linked[0]?.count ?? 0) > 0) throw new Error("Cancel or close the linked work order first");
      await tx`UPDATE "MaintenanceTicket" SET status = 'CANCELLED', remarks = COALESCE(${normalizeText(input.remarks)}, remarks), "updatedAt" = NOW() WHERE id = ${input.id}`;
    }
    await writeMaintenanceAudit(tx, input.performedById, `TICKET_${input.action.toUpperCase()}`, input.id, { remarks: input.remarks ?? null });
    await writeMaintenanceHistory(tx, "maintenance.ticket", input.id, input.action.toUpperCase(), input.performedById, input.remarks ?? `Ticket ${input.action}`);
  });
  return getMaintenanceTicketById(input.id);
}

function parseNumeric(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapWorkOrderPart(row: {
  id: string;
  itemId: string;
  stockIssueId: string | null;
  itemCode: string | null;
  itemName: string | null;
  unitId: string | null;
  unitCode: string | null;
  unitName: string | null;
  requestedQty: number;
  issuedQty: number;
  usedQty: number;
  returnedQty: number;
  damagedQty: number;
  unresolvedQty: number;
  damageReason: string | null;
  unitCost: number;
  totalCost: number;
  remarks: string | null;
}): MaintenanceWorkOrderPart {
  return {
    id: row.id,
    itemId: row.itemId,
    stockIssueId: row.stockIssueId ?? undefined,
    itemCode: row.itemCode ?? undefined,
    itemName: row.itemName ?? undefined,
    unitId: row.unitId ?? undefined,
    unitCode: row.unitCode ?? undefined,
    unitName: row.unitName ?? undefined,
    requestedQty: parseNumeric(row.requestedQty),
    issuedQty: parseNumeric(row.issuedQty),
    usedQty: parseNumeric(row.usedQty),
    returnedQty: parseNumeric(row.returnedQty),
    damagedQty: parseNumeric(row.damagedQty),
    unresolvedQty: parseNumeric(row.unresolvedQty),
    damageReason: row.damageReason ?? undefined,
    unitCost: parseNumeric(row.unitCost),
    totalCost: parseNumeric(row.totalCost),
    remarks: row.remarks ?? undefined,
  };
}

function mapLaborRow(row: {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  remarks: string | null;
}): MaintenanceLabor {
  return {
    id: row.id,
    employeeId: row.employeeId ?? undefined,
    employeeName: row.employeeName ?? undefined,
    hours: parseNumeric(row.hours),
    hourlyRate: parseNumeric(row.hourlyRate),
    totalCost: parseNumeric(row.totalCost),
    remarks: row.remarks ?? undefined,
  };
}

function mapExternalCostRow(row: {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  description: string;
  amount: number;
  invoiceReference: string | null;
  remarks: string | null;
}): MaintenanceExternalCost {
  return {
    id: row.id,
    supplierId: row.supplierId ?? undefined,
    supplierName: row.supplierName ?? undefined,
    description: row.description,
    amount: parseNumeric(row.amount),
    invoiceReference: row.invoiceReference ?? undefined,
    remarks: row.remarks ?? undefined,
  };
}

function mapWorkOrder(row: {
  id: string;
  publicId: number;
  workOrderNo: string;
  ticketId: string | null;
  ticketNo: string | null;
  assetId: string;
  assetCode: string | null;
  assetName: string | null;
  locationId: string;
  locationCode: string | null;
  locationName: string | null;
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  workType: string;
  priority: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  problemDescription: string;
  diagnosis: string | null;
  workPerformed: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  testResult: string | null;
  status: string;
  totalSpareCost: number | null;
  totalLaborCost: number | null;
  totalExternalCost: number | null;
  totalCost: number | null;
  completedById: string | null;
  completedByName: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  createdById: string | null;
  checkedById: string | null;
  closedById: string | null;
  closedByName: string | null;
  createdAt: string;
  updatedAt: string;
  parts?: unknown;
  labor?: unknown;
  externalCosts?: unknown;
}): MaintenanceWorkOrder {
  return {
    id: row.id,
    publicId: row.publicId,
    workOrderNo: row.workOrderNo,
    ticketId: row.ticketId ?? undefined,
    ticketNo: row.ticketNo ?? undefined,
    assetId: row.assetId,
    assetCode: row.assetCode ?? undefined,
    assetName: row.assetName ?? undefined,
    locationId: row.locationId,
    locationCode: row.locationCode ?? undefined,
    locationName: row.locationName ?? undefined,
    assignedTechnicianId: row.assignedTechnicianId ?? undefined,
    assignedTechnicianName: row.assignedTechnicianName ?? undefined,
    supervisorId: row.supervisorId ?? undefined,
    supervisorName: row.supervisorName ?? undefined,
    workType: row.workType,
    priority: row.priority,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    actualStart: row.actualStart ?? undefined,
    actualEnd: row.actualEnd ?? undefined,
    problemDescription: row.problemDescription,
    diagnosis: row.diagnosis ?? undefined,
    workPerformed: row.workPerformed ?? undefined,
    rootCause: row.rootCause ?? undefined,
    correctiveAction: row.correctiveAction ?? undefined,
    preventiveAction: row.preventiveAction ?? undefined,
    testResult: row.testResult ?? undefined,
    status: row.status,
    totalSpareCost: parseNumeric(row.totalSpareCost),
    totalLaborCost: parseNumeric(row.totalLaborCost),
    totalExternalCost: parseNumeric(row.totalExternalCost),
    totalCost: parseNumeric(row.totalCost),
    completedById: row.completedById ?? undefined,
    completedByName: row.completedByName ?? undefined,
    approvedById: row.approvedById ?? undefined,
    approvedByName: row.approvedByName ?? undefined,
    createdById: row.createdById ?? undefined,
    checkedById: row.checkedById ?? undefined,
    closedById: row.closedById ?? undefined,
    closedByName: row.closedByName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    parts: parseJsonArray(row.parts).map((entry) => mapWorkOrderPart(entry as Parameters<typeof mapWorkOrderPart>[0])),
    labor: parseJsonArray(row.labor).map((entry) => mapLaborRow(entry as Parameters<typeof mapLaborRow>[0])),
    externalCosts: parseJsonArray(row.externalCosts).map((entry) => mapExternalCostRow(entry as Parameters<typeof mapExternalCostRow>[0])),
  };
}

type WorkOrderPartInput = {
  itemId: string;
  stockIssueId?: string | null;
  unitId?: string | null;
  requestedQty?: number;
  issuedQty?: number;
  usedQty?: number;
  returnedQty?: number;
  unitCost?: number;
  totalCost?: number;
  remarks?: string | null;
};

type WorkOrderLaborInput = {
  employeeId?: string | null;
  hours?: number;
  hourlyRate?: number;
  totalCost?: number;
  remarks?: string | null;
};

type WorkOrderExternalCostInput = {
  supplierId?: string | null;
  description: string;
  amount?: number;
  invoiceReference?: string | null;
  remarks?: string | null;
};

export type MaintenanceWorkOrderInput = {
  workOrderNo?: string | null;
  ticketId?: string | null;
  assetId: string;
  locationId: string;
  assignedTechnicianId?: string | null;
  supervisorId?: string | null;
  workType: string;
  priority: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  problemDescription: string;
  diagnosis?: string | null;
  workPerformed?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  testResult?: string | null;
  status?: string | null;
  completedById?: string | null;
  approvedById?: string | null;
  createdById?: string | null;
  closedById?: string | null;
  parts?: WorkOrderPartInput[];
  labor?: WorkOrderLaborInput[];
  externalCosts?: WorkOrderExternalCostInput[];
};

function computePartTotals(parts: WorkOrderPartInput[]) {
  return parts.map((part) => {
    const requestedQty = parseNumeric(part.requestedQty);
    const issuedQty = parseNumeric(part.issuedQty);
    const usedQty = parseNumeric(part.usedQty);
    const returnedQty = parseNumeric(part.returnedQty);
    const unitCost = parseNumeric(part.unitCost);
    const totalCost = part.totalCost != null ? parseNumeric(part.totalCost) : unitCost * Math.max(usedQty || issuedQty || requestedQty, 0);
    return {
      ...part,
      requestedQty,
      issuedQty,
      usedQty,
      returnedQty,
      unitCost,
      totalCost,
    };
  });
}

function computeLaborTotals(labor: WorkOrderLaborInput[]) {
  return labor.map((entry) => {
    const hours = parseNumeric(entry.hours);
    const hourlyRate = parseNumeric(entry.hourlyRate);
    const totalCost = entry.totalCost != null ? parseNumeric(entry.totalCost) : hours * hourlyRate;
    return { ...entry, hours, hourlyRate, totalCost };
  });
}

function computeExternalTotals(externalCosts: WorkOrderExternalCostInput[]) {
  return externalCosts.map((entry) => ({
    ...entry,
    amount: parseNumeric(entry.amount),
  }));
}

async function writeWorkOrderParts(tx: Tx, workOrderId: string, parts: WorkOrderPartInput[]) {
  for (const part of computePartTotals(parts)) {
    if (!normalizeText(part.itemId)) continue;
    await tx`
      INSERT INTO "MaintenanceWorkOrderPart" (
        id, "workOrderId", "itemId", "stockIssueId", "requestedQty", "issuedQty", "usedQty", "returnedQty", "unitCost", "totalCost", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${workOrderId},
        ${part.itemId},
        ${normalizeText(part.stockIssueId)},
        ${part.requestedQty},
        ${part.issuedQty},
        ${part.usedQty},
        ${part.returnedQty},
        ${part.unitCost},
        ${part.totalCost},
        ${normalizeText(part.remarks)},
        NOW(),
        NOW()
      )
    `;
  }
}

async function writeWorkOrderLabor(tx: Tx, workOrderId: string, labor: WorkOrderLaborInput[]) {
  for (const entry of computeLaborTotals(labor)) {
    if (!entry.employeeId && !entry.hours && !entry.hourlyRate && !entry.remarks) continue;
    await tx`
      INSERT INTO "MaintenanceLabor" (
        id, "workOrderId", "employeeId", hours, "hourlyRate", "totalCost", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${workOrderId},
        ${normalizeText(entry.employeeId)},
        ${entry.hours},
        ${entry.hourlyRate},
        ${entry.totalCost},
        ${normalizeText(entry.remarks)},
        NOW(),
        NOW()
      )
    `;
  }
}

async function writeWorkOrderExternalCosts(tx: Tx, workOrderId: string, externalCosts: WorkOrderExternalCostInput[]) {
  for (const entry of computeExternalTotals(externalCosts)) {
    if (!normalizeText(entry.description) && !entry.amount) continue;
    await tx`
      INSERT INTO "MaintenanceExternalCost" (
        id, "workOrderId", "supplierId", description, amount, "invoiceReference", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${workOrderId},
        ${normalizeText(entry.supplierId)},
        ${normalizeText(entry.description) ?? "External service"},
        ${entry.amount},
        ${normalizeText(entry.invoiceReference)},
        ${normalizeText(entry.remarks)},
        NOW(),
        NOW()
      )
    `;
  }
}

async function writeMaintenanceAudit(
  tx: Tx,
  userId: string,
  action: string,
  recordId: string,
  newValue: Record<string, unknown>,
  oldValue?: Record<string, unknown> | null,
) {
  await tx`
    INSERT INTO "AuditLog" (
      id, "userId", action, module, "recordId", "oldValue", "newValue", "isArchived", timestamp
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      ${action},
      'maintenance',
      ${recordId},
      ${oldValue ? JSON.stringify(oldValue) : null},
      ${JSON.stringify(newValue)},
      false,
      NOW()
    )
  `;
}

async function writeMaintenanceHistory(
  tx: Tx,
  referenceType: string,
  referenceId: string,
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

type WorkOrderPartRow = {
  id: string;
  itemId: string;
  stockIssueId: string | null;
  requestedQty: number;
  issuedQty: number;
  usedQty: number;
  returnedQty: number;
  damagedQty: number;
  unresolvedQty: number;
  unitCost: number;
  totalCost: number;
  remarks: string | null;
};

async function getWorkOrderPartRows(tx: Tx, workOrderId: string) {
  return tx<WorkOrderPartRow[]>`
    SELECT
      id,
      "itemId",
      "stockIssueId",
      "requestedQty",
      "issuedQty",
      "usedQty",
      "returnedQty",
      "damagedQty",
      "unresolvedQty",
      "unitCost",
      "totalCost",
      remarks
    FROM "MaintenanceWorkOrderPart"
    WHERE "workOrderId" = ${workOrderId}
    ORDER BY "createdAt" ASC
  `;
}

async function recalculateWorkOrderTotals(tx: Tx, workOrderId: string) {
  const totalsRows = await tx<Array<{
    totalSpareCost: number;
    totalLaborCost: number;
    totalExternalCost: number;
  }>>`
    SELECT
      COALESCE((SELECT SUM((COALESCE("usedQty", 0) + COALESCE("damagedQty", 0)) * COALESCE("unitCost", 0)) FROM "MaintenanceWorkOrderPart" WHERE "workOrderId" = ${workOrderId}), 0) AS "totalSpareCost",
      COALESCE((SELECT SUM(COALESCE("totalCost", 0)) FROM "MaintenanceLabor" WHERE "workOrderId" = ${workOrderId}), 0) AS "totalLaborCost",
      COALESCE((SELECT SUM(COALESCE(amount, 0)) FROM "MaintenanceExternalCost" WHERE "workOrderId" = ${workOrderId}), 0) AS "totalExternalCost"
  `;

  const totals = totalsRows[0] ?? { totalSpareCost: 0, totalLaborCost: 0, totalExternalCost: 0 };
  const totalCost =
    Number(totals.totalSpareCost ?? 0) +
    Number(totals.totalLaborCost ?? 0) +
    Number(totals.totalExternalCost ?? 0);

  await tx`
    UPDATE "MaintenanceWorkOrder"
    SET
      "totalSpareCost" = ${Number(totals.totalSpareCost ?? 0)},
      "totalLaborCost" = ${Number(totals.totalLaborCost ?? 0)},
      "totalExternalCost" = ${Number(totals.totalExternalCost ?? 0)},
      "totalCost" = ${totalCost},
      "updatedAt" = NOW()
    WHERE id = ${workOrderId}
  `;

  return {
    totalSpareCost: Number(totals.totalSpareCost ?? 0),
    totalLaborCost: Number(totals.totalLaborCost ?? 0),
    totalExternalCost: Number(totals.totalExternalCost ?? 0),
    totalCost,
  };
}

async function appendDowntimeResolutionNote(
  tx: Tx,
  maintenanceTicketId: string | null | undefined,
  note: string,
) {
  if (!maintenanceTicketId) {
    return;
  }

  const rows = await tx<Array<{ productionDowntimeId: string | null }>>`
    SELECT "productionDowntimeId"
    FROM "MaintenanceTicket"
    WHERE id = ${maintenanceTicketId}
    LIMIT 1
  `;

  const productionDowntimeId = rows[0]?.productionDowntimeId;
  if (!productionDowntimeId) {
    return;
  }

  await tx`
    UPDATE "ProductionDowntime"
    SET remarks =
      CASE
        WHEN remarks IS NULL OR remarks = '' THEN ${note}::text
        ELSE remarks || E'\n' || ${note}::text
      END
    WHERE id = ${productionDowntimeId}
  `;
}

export async function getWorkOrders() {
  try {
    const rows = await sql<Array<{
      id: string;
      publicId: number;
      workOrderNo: string;
      ticketId: string | null;
      ticketNo: string | null;
      assetId: string;
      assetCode: string | null;
      assetName: string | null;
      locationId: string;
      locationCode: string | null;
      locationName: string | null;
      assignedTechnicianId: string | null;
      assignedTechnicianName: string | null;
      supervisorId: string | null;
      supervisorName: string | null;
      workType: string;
      priority: string;
      scheduledStart: string;
      scheduledEnd: string;
      actualStart: string | null;
      actualEnd: string | null;
      problemDescription: string;
      diagnosis: string | null;
      workPerformed: string | null;
      rootCause: string | null;
      correctiveAction: string | null;
      preventiveAction: string | null;
      testResult: string | null;
      status: string;
      totalSpareCost: number | null;
      totalLaborCost: number | null;
      totalExternalCost: number | null;
      totalCost: number | null;
      completedById: string | null;
      completedByName: string | null;
      approvedById: string | null;
      approvedByName: string | null;
      createdById: string | null;
      checkedById: string | null;
      closedById: string | null;
      closedByName: string | null;
      createdAt: string;
      updatedAt: string;
      parts: unknown;
      labor: unknown;
      externalCosts: unknown;
    }>>`
      SELECT
        wo.id,
        wo."publicId",
        wo."workOrderNo",
        wo."ticketId",
        mt."ticketNo",
        wo."assetId",
        a."assetCode",
        a."assetName",
        wo."locationId",
        l."locationCode",
        l."locationName",
        wo."assignedTechnicianId",
        atc.name AS "assignedTechnicianName",
        wo."supervisorId",
        sup.name AS "supervisorName",
        wo."workType"::text AS "workType",
        wo.priority::text AS priority,
        wo."scheduledStart"::text AS "scheduledStart",
        wo."scheduledEnd"::text AS "scheduledEnd",
        wo."actualStart"::text AS "actualStart",
        wo."actualEnd"::text AS "actualEnd",
        wo."problemDescription",
        wo.diagnosis,
        wo."workPerformed",
        wo."rootCause",
        wo."correctiveAction",
        wo."preventiveAction",
        wo."testResult",
        wo.status::text AS status,
        wo."totalSpareCost",
        wo."totalLaborCost",
        wo."totalExternalCost",
        wo."totalCost",
        wo."completedById",
        cb.name AS "completedByName",
        wo."approvedById",
        ab.name AS "approvedByName",
        wo."createdById",
        wo."checkedById",
        wo."closedById",
        clb.name AS "closedByName",
        wo."createdAt"::text AS "createdAt",
        wo."updatedAt"::text AS "updatedAt",
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', part.id,
            'itemId', part."itemId",
            'stockIssueId', part."stockIssueId",
            'itemCode', i."itemCode",
            'itemName', i."itemName",
            'unitId', i."uomId",
            'unitCode', u.code,
            'unitName', u.name,
            'requestedQty', part."requestedQty",
            'issuedQty', part."issuedQty",
            'usedQty', part."usedQty",
            'returnedQty', part."returnedQty",
            'damagedQty', part."damagedQty",
            'unresolvedQty', part."unresolvedQty",
            'damageReason', part."damageReason",
            'unitCost', part."unitCost",
            'totalCost', part."totalCost",
            'remarks', part.remarks
          ) ORDER BY part."createdAt")
          FROM "MaintenanceWorkOrderPart" part
          INNER JOIN "Item" i ON i.id = part."itemId"
          LEFT JOIN "Unit" u ON u.id = i."uomId"
          WHERE part."workOrderId" = wo.id
        ), '[]'::json) AS parts,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', labor.id,
            'employeeId', labor."employeeId",
            'employeeName', usr.name,
            'hours', labor.hours,
            'hourlyRate', labor."hourlyRate",
            'totalCost', labor."totalCost",
            'remarks', labor.remarks
          ) ORDER BY labor."createdAt")
          FROM "MaintenanceLabor" labor
          LEFT JOIN "User" usr ON usr.id = labor."employeeId"
          WHERE labor."workOrderId" = wo.id
        ), '[]'::json) AS labor,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ext.id,
            'supplierId', ext."supplierId",
            'supplierName', s.name,
            'description', ext.description,
            'amount', ext.amount,
            'invoiceReference', ext."invoiceReference",
            'remarks', ext.remarks
          ) ORDER BY ext."createdAt")
          FROM "MaintenanceExternalCost" ext
          LEFT JOIN "Supplier" s ON s.id = ext."supplierId"
          WHERE ext."workOrderId" = wo.id
        ), '[]'::json) AS "externalCosts"
      FROM "MaintenanceWorkOrder" wo
      INNER JOIN "Asset" a ON a.id = wo."assetId"
      INNER JOIN "Location" l ON l.id = wo."locationId"
      LEFT JOIN "MaintenanceTicket" mt ON mt.id = wo."ticketId"
      LEFT JOIN "User" atc ON atc.id = wo."assignedTechnicianId"
      LEFT JOIN "User" sup ON sup.id = wo."supervisorId"
      LEFT JOIN "User" cb ON cb.id = wo."completedById"
      LEFT JOIN "User" ab ON ab.id = wo."approvedById"
      LEFT JOIN "User" clb ON clb.id = wo."closedById"
      ORDER BY wo."scheduledStart" DESC, wo."workOrderNo" DESC
    `;
    return rows.map(mapWorkOrder);
  } catch (error) {
    mapReadError(error, "Failed to load work orders");
    return [];
  }
}

export async function getWorkOrderById(id: string) {
  const rows = await getWorkOrders();
  return rows.find((entry) => (isPublicIdParam(id) ? entry.publicId === Number(id) : entry.id === id)) ?? null;
}

export async function createWorkOrder(input: MaintenanceWorkOrderInput) {
  try {
    const workOrderNoOverride = normalizeCode(input.workOrderNo);
    const assetId = normalizeText(input.assetId);
    const locationId = normalizeText(input.locationId);
    const workType = normalizeCode(input.workType);
    const priority = normalizeCode(input.priority);
    const scheduledStart = normalizeDate(input.scheduledStart);
    const scheduledEnd = normalizeDate(input.scheduledEnd);
    const problemDescription = normalizeText(input.problemDescription);
    if (!assetId || !locationId || !workType || !priority || !scheduledStart || !scheduledEnd || !problemDescription) {
      throw new Error("Asset, location, work type, priority, schedule, and problem description are required");
    }

    const normalizedParts = computePartTotals(input.parts ?? []);
    const normalizedLabor = computeLaborTotals(input.labor ?? []);
    const normalizedExternal = computeExternalTotals(input.externalCosts ?? []);
    const totalSpareCost = normalizedParts.reduce((sum, entry) => sum + entry.totalCost, 0);
    const totalLaborCost = normalizedLabor.reduce((sum, entry) => sum + entry.totalCost, 0);
    const totalExternalCost = normalizedExternal.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCost = totalSpareCost + totalLaborCost + totalExternalCost;

    const id = randomUUID();
    await sql.begin(async (tx) => {
      const ticketId = normalizeText(input.ticketId);
      if (ticketId) {
        const tickets = await tx<Array<{ status: string; approvalStatus: string; assetId: string; locationId: string; productionDowntimeId: string | null }>>`
          SELECT status::text AS status, "approvalStatus", "assetId", "locationId", "productionDowntimeId" FROM "MaintenanceTicket" WHERE id = ${ticketId} AND "isArchived" = false LIMIT 1 FOR UPDATE`;
        const ticket = tickets[0];
        if (!ticket) throw new Error("Maintenance ticket not found");
        if (ticket.approvalStatus !== "APPROVED" || !["APPROVED", "ASSIGNED", "IN_PROGRESS"].includes(ticket.status)) throw new Error("Maintenance ticket must be checked and approved before work-order creation");
        if (ticket.assetId !== assetId || ticket.locationId !== locationId) throw new Error("Work-order asset and location must match the approved ticket");
        const existing = await tx<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "MaintenanceWorkOrder" WHERE "ticketId" = ${ticketId} AND status NOT IN ('CANCELLED', 'CLOSED')`;
        if (Number(existing[0]?.count ?? 0) > 0) throw new Error("Ticket already has an active work order");
      }
      const workOrderNo = workOrderNoOverride ?? await nextMaintenanceDocumentNumber(tx, "WO", "Maintenance Work Order");
      await tx`
        INSERT INTO "MaintenanceWorkOrder" (
          id, "workOrderNo", "ticketId", "productionDowntimeId", "assetId", "locationId", "assignedTechnicianId", "supervisorId",
          "workType", priority, "scheduledStart", "scheduledEnd", "actualStart", "actualEnd",
          "problemDescription", diagnosis, "workPerformed", "rootCause", "correctiveAction",
          "preventiveAction", "testResult", status, "totalSpareCost", "totalLaborCost",
          "totalExternalCost", "totalCost", "completedById", "approvedById", "createdById", "closedById", "createdAt", "updatedAt"
        )
        VALUES (
          ${id},
          ${workOrderNo},
          ${normalizeText(input.ticketId)},
          ${(ticketId ? (await tx<Array<{ productionDowntimeId: string | null }>>`SELECT "productionDowntimeId" FROM "MaintenanceTicket" WHERE id=${ticketId}`)[0]?.productionDowntimeId : null) ?? null},
          ${assetId},
          ${locationId},
          ${normalizeText(input.assignedTechnicianId)},
          ${normalizeText(input.supervisorId)},
          ${workType},
          ${priority},
          ${scheduledStart},
          ${scheduledEnd},
          ${normalizeDate(input.actualStart)},
          ${normalizeDate(input.actualEnd)},
          ${problemDescription},
          ${normalizeText(input.diagnosis)},
          ${normalizeText(input.workPerformed)},
          ${normalizeText(input.rootCause)},
          ${normalizeText(input.correctiveAction)},
          ${normalizeText(input.preventiveAction)},
          ${normalizeText(input.testResult)},
          ${normalizeCode(input.status) ?? "DRAFT"},
          ${totalSpareCost},
          ${totalLaborCost},
          ${totalExternalCost},
          ${totalCost},
          ${normalizeText(input.completedById)},
          ${normalizeText(input.approvedById)},
          ${normalizeText(input.createdById)},
          ${normalizeText(input.closedById)},
          NOW(),
          NOW()
        )
      `;
      if (ticketId) await tx`UPDATE "ProductionDowntime" SET "workOrderId"=${id}, "maintenanceTicketId"=${ticketId}, "updatedAt"=NOW() WHERE id=(SELECT "productionDowntimeId" FROM "MaintenanceTicket" WHERE id=${ticketId})`;
      await writeWorkOrderParts(tx, id, normalizedParts);
      await writeWorkOrderLabor(tx, id, normalizedLabor);
      await writeWorkOrderExternalCosts(tx, id, normalizedExternal);
    });
    return getWorkOrderById(id);
  } catch (error) {
    mapWriteError(error, "Failed to create work order");
  }
}

export async function transitionMaintenanceWorkOrder(input: { id: string; action: "submit" | "check" | "approve"; performedById: string; remarks?: string | null }) {
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string; createdById: string | null; checkedById: string | null }>>`
      SELECT id, status::text AS status, "createdById", "checkedById" FROM "MaintenanceWorkOrder" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    const workOrder = rows[0];
    if (!workOrder) throw new Error("Maintenance work order not found");
    if (input.action === "submit") {
      if (workOrder.status !== "DRAFT") throw new Error("Only draft work orders can be submitted");
      await tx`UPDATE "MaintenanceWorkOrder" SET status = 'SUBMITTED', "submittedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else if (input.action === "check") {
      if (workOrder.status !== "SUBMITTED" || workOrder.checkedById) throw new Error("Only unchecked submitted work orders can be checked");
      if (workOrder.createdById && workOrder.createdById === input.performedById) throw new Error("Work-order maker cannot check their own work order");
      await tx`UPDATE "MaintenanceWorkOrder" SET "checkedById" = ${input.performedById}, "checkedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`;
    } else {
      if (workOrder.status !== "SUBMITTED" || !workOrder.checkedById) throw new Error("Work order must be checked before approval");
      if (workOrder.createdById === input.performedById || workOrder.checkedById === input.performedById) throw new Error("Work-order approver must be separate from maker and checker");
      await tx`UPDATE "MaintenanceWorkOrder" SET status = 'APPROVED', "approvedById" = ${input.performedById}, "approvedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`;
    }
    await writeMaintenanceAudit(tx, input.performedById, `WORK_ORDER_${input.action.toUpperCase()}`, input.id, { remarks: input.remarks ?? null });
    await writeMaintenanceHistory(tx, "maintenance.work-order", input.id, input.action.toUpperCase(), input.performedById, input.remarks ?? `Work order ${input.action}`);
  });
  return getWorkOrderById(input.id);
}

export async function updateWorkOrder(id: string, input: MaintenanceWorkOrderInput) {
  try {
    const assetId = normalizeText(input.assetId);
    const locationId = normalizeText(input.locationId);
    const workType = normalizeCode(input.workType);
    const priority = normalizeCode(input.priority);
    const scheduledStart = normalizeDate(input.scheduledStart);
    const scheduledEnd = normalizeDate(input.scheduledEnd);
    const problemDescription = normalizeText(input.problemDescription);
    if (!assetId || !locationId || !workType || !priority || !scheduledStart || !scheduledEnd || !problemDescription) {
      throw new Error("Asset, location, work type, priority, schedule, and problem description are required");
    }

    const normalizedParts = computePartTotals(input.parts ?? []);
    const normalizedLabor = computeLaborTotals(input.labor ?? []);
    const normalizedExternal = computeExternalTotals(input.externalCosts ?? []);
    const totalSpareCost = normalizedParts.reduce((sum, entry) => sum + entry.totalCost, 0);
    const totalLaborCost = normalizedLabor.reduce((sum, entry) => sum + entry.totalCost, 0);
    const totalExternalCost = normalizedExternal.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCost = totalSpareCost + totalLaborCost + totalExternalCost;

    await sql.begin(async (tx) => {
      await tx`
        UPDATE "MaintenanceWorkOrder"
        SET
          "ticketId" = ${normalizeText(input.ticketId)},
          "assetId" = ${assetId},
          "locationId" = ${locationId},
          "assignedTechnicianId" = ${normalizeText(input.assignedTechnicianId)},
          "supervisorId" = ${normalizeText(input.supervisorId)},
          "workType" = ${workType},
          priority = ${priority},
          "scheduledStart" = ${scheduledStart},
          "scheduledEnd" = ${scheduledEnd},
          "actualStart" = ${normalizeDate(input.actualStart)},
          "actualEnd" = ${normalizeDate(input.actualEnd)},
          "problemDescription" = ${problemDescription},
          diagnosis = ${normalizeText(input.diagnosis)},
          "workPerformed" = ${normalizeText(input.workPerformed)},
          "rootCause" = ${normalizeText(input.rootCause)},
          "correctiveAction" = ${normalizeText(input.correctiveAction)},
          "preventiveAction" = ${normalizeText(input.preventiveAction)},
          "testResult" = ${normalizeText(input.testResult)},
          status = ${normalizeCode(input.status) ?? "DRAFT"},
          "totalSpareCost" = ${totalSpareCost},
          "totalLaborCost" = ${totalLaborCost},
          "totalExternalCost" = ${totalExternalCost},
          "totalCost" = ${totalCost},
          "completedById" = ${normalizeText(input.completedById)},
          "approvedById" = ${normalizeText(input.approvedById)},
          "closedById" = ${normalizeText(input.closedById)},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;
      await tx`DELETE FROM "MaintenanceWorkOrderPart" WHERE "workOrderId" = ${id}`;
      await tx`DELETE FROM "MaintenanceLabor" WHERE "workOrderId" = ${id}`;
      await tx`DELETE FROM "MaintenanceExternalCost" WHERE "workOrderId" = ${id}`;
      await writeWorkOrderParts(tx, id, normalizedParts);
      await writeWorkOrderLabor(tx, id, normalizedLabor);
      await writeWorkOrderExternalCosts(tx, id, normalizedExternal);
    });
    return getWorkOrderById(id);
  } catch (error) {
    mapWriteError(error, "Failed to update work order");
  }
}

export async function assignMaintenanceTicket(input: {
  id: string;
  assignedToId?: string | null;
  priority?: string | null;
  targetCompletionDate?: string | null;
  remarks?: string | null;
  approvalStatus?: string | null;
}) {
  const ticket = await getMaintenanceTicketById(input.id);
  if (!ticket) {
    throw new Error("Maintenance ticket not found");
  }

  return updateMaintenanceTicket(input.id, {
    requestDate: ticket.requestDate,
    assetId: ticket.assetId,
    locationId: ticket.locationId,
    departmentId: ticket.departmentId,
    requestedById: ticket.requestedById,
    assignedToId: input.assignedToId ?? ticket.assignedToId,
    type: ticket.type,
    priority: input.priority ?? ticket.priority,
    problemDescription: ticket.problemDescription,
    failureDate: ticket.failureDate,
    productionDowntimeId: ticket.productionDowntimeId,
    status: "ASSIGNED",
    approvalStatus: input.approvalStatus ?? ticket.approvalStatus,
    targetCompletionDate: input.targetCompletionDate ?? ticket.targetCompletionDate,
    actualCompletionDate: ticket.actualCompletionDate,
    remarks: input.remarks ?? ticket.remarks,
  });
}

export async function closeMaintenanceTicket(input: {
  id: string;
  actualCompletionDate?: string | null;
  remarks?: string | null;
}) {
  const ticket = await getMaintenanceTicketById(input.id);
  if (!ticket) {
    throw new Error("Maintenance ticket not found");
  }
  const activeOrders = await sql<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "MaintenanceWorkOrder" WHERE "ticketId" = ${input.id} AND status NOT IN ('CLOSED', 'CANCELLED')`;
  if (Number(activeOrders[0]?.count ?? 0) > 0) throw new Error("Close or cancel the linked work order before closing this ticket");

  return updateMaintenanceTicket(input.id, {
    requestDate: ticket.requestDate,
    assetId: ticket.assetId,
    locationId: ticket.locationId,
    departmentId: ticket.departmentId,
    requestedById: ticket.requestedById,
    assignedToId: ticket.assignedToId,
    type: ticket.type,
    priority: ticket.priority,
    problemDescription: ticket.problemDescription,
    failureDate: ticket.failureDate,
    productionDowntimeId: ticket.productionDowntimeId,
    status: "CLOSED",
    approvalStatus: ticket.approvalStatus,
    targetCompletionDate: ticket.targetCompletionDate,
    actualCompletionDate: input.actualCompletionDate ?? ticket.actualCompletionDate ?? new Date().toISOString().slice(0, 10),
    remarks: input.remarks ?? ticket.remarks,
  });
}

export async function completeMaintenanceWorkOrder(input: {
  id: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  diagnosis?: string | null;
  workPerformed?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  testResult?: string | null;
  status?: string | null;
  completedById?: string | null;
  approvedById?: string | null;
  closedById?: string | null;
  unresolvedOverrideReason?: string | null;
  unresolvedOverrideApprovedById?: string | null;
}) {
  const workOrder = await getWorkOrderById(input.id);
  if (!workOrder) {
    throw new Error("Maintenance work order not found");
  }

  if (["CLOSED", "CANCELLED"].includes(workOrder.status)) {
    throw new Error("Closed or cancelled work order cannot be completed");
  }
  if (!["ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"].includes(workOrder.status)) throw new Error("Work order must be approved and assigned before completion");

  const diagnosis = normalizeText(input.diagnosis ?? workOrder.diagnosis);
  const correctiveAction = normalizeText(input.correctiveAction ?? workOrder.correctiveAction);
  if (!workOrder.actualStart) throw new Error("Technician work must be started before completion");
  if (!diagnosis) throw new Error("Diagnosis is required before completion");
  if (!correctiveAction) throw new Error("Corrective action is required before completion");
  const activeSessions = await sql<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "MaintenanceWorkSession" WHERE "workOrderId" = ${input.id} AND status IN ('ACTIVE','PAUSED')`;
  if (Number(activeSessions[0]?.count ?? 0) > 0) throw new Error("Check out all active technician sessions before completion");
  const pendingChecklist = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "PreventiveMaintenanceExecution" execution
    INNER JOIN "PreventiveMaintenanceChecklistResult" result ON result."executionId" = execution.id
    INNER JOIN "PreventiveMaintenancePlanTask" task ON task.id = result."taskId"
    WHERE execution."workOrderId" = ${input.id} AND task."isMandatory" = true AND result.completed = false
  `;
  if (Number(pendingChecklist[0]?.count ?? 0) > 0) throw new Error("Complete every mandatory preventive-maintenance checklist task before completing this work order");
  const unresolved = await sql<Array<{ quantity: number }>>`SELECT COALESCE(SUM(GREATEST("issuedQty"-"usedQty"-"damagedQty"-"returnedQty",0)),0) AS quantity FROM "MaintenanceWorkOrderPart" WHERE "workOrderId"=${input.id}`;
  if (Number(unresolved[0]?.quantity ?? 0) > 0.000001 && !normalizeText(input.unresolvedOverrideReason)) throw new Error("Reconcile all issued spare quantities before completion");

  const nextStatus = normalizeCode(input.status) ?? "COMPLETED";
  if (!["COMPLETED", "TESTED"].includes(nextStatus)) {
    throw new Error("Completion can only move a work order to COMPLETED or TESTED. Use the close action after testing.");
  }

  if (nextStatus === "TESTED" && !normalizeText(input.testResult ?? workOrder.testResult)) {
    throw new Error("Test result is required before marking a work order as tested");
  }

  await sql.begin(async (tx) => {
    await tx`UPDATE "MaintenanceWorkOrder" SET "actualEnd"=${normalizeDate(input.actualEnd) ?? new Date()}, diagnosis=${diagnosis}, "workPerformed"=${normalizeText(input.workPerformed ?? workOrder.workPerformed)}, "rootCause"=${normalizeText(input.rootCause ?? workOrder.rootCause)}, "correctiveAction"=${correctiveAction}, "preventiveAction"=${normalizeText(input.preventiveAction ?? workOrder.preventiveAction)}, "testResult"=${normalizeText(input.testResult ?? workOrder.testResult)}, status=${nextStatus}, "completedById"=${normalizeText(input.completedById) ?? normalizeText(workOrder.completedById)}, "updatedAt"=NOW() WHERE id=${input.id}`;
    await tx`INSERT INTO "MaintenanceWorkLog" (id,"workOrderId","technicianId","eventType","eventDateTime",notes,"createdAt") VALUES (${randomUUID()},${input.id},${normalizeText(input.completedById) ?? workOrder.assignedTechnicianId ?? "system"},'REPAIR_COMPLETED',NOW(),${correctiveAction},NOW())`;
    await appendDowntimeResolutionNote(
      tx,
      workOrder.ticketId,
      `Maintenance work order ${workOrder.workOrderNo} completed. Root cause: ${input.rootCause ?? workOrder.rootCause ?? "n/a"}. Corrective action: ${input.correctiveAction ?? workOrder.correctiveAction ?? "n/a"}. Restored: ${input.actualEnd ?? workOrder.actualEnd ?? new Date().toISOString().slice(0, 10)}.`,
    );

    await writeMaintenanceAudit(
      tx,
      normalizeText(input.closedById) ??
        normalizeText(input.approvedById) ??
        normalizeText(input.completedById) ??
        workOrder.assignedTechnicianId ??
        "system",
      "COMPLETE",
      input.id,
      {
        status: nextStatus,
        actualEnd: input.actualEnd ?? workOrder.actualEnd ?? new Date().toISOString().slice(0, 10),
        unresolvedPartsOverride: normalizeText(input.unresolvedOverrideReason) ? { reason: normalizeText(input.unresolvedOverrideReason), approvedById: normalizeText(input.unresolvedOverrideApprovedById), quantity: Number(unresolved[0]?.quantity ?? 0) } : null,
      },
      { status: workOrder.status },
    );
    await writeMaintenanceHistory(
      tx,
      "maintenance.work-order",
      input.id,
      "COMPLETE",
      normalizeText(input.closedById) ??
        normalizeText(input.approvedById) ??
        normalizeText(input.completedById) ??
        workOrder.assignedTechnicianId ??
        "system",
      input.testResult ?? input.correctiveAction ?? "Work order completed",
    );
  });

  return getWorkOrderById(input.id);
}

export async function assignMaintenanceWorkOrder(input: {
  id: string;
  assignedTechnicianId: string;
  supervisorId?: string | null;
  startNow?: boolean;
  performedById: string;
  remarks?: string | null;
}) {
  const assignedTechnicianId = normalizeText(input.assignedTechnicianId);
  if (!assignedTechnicianId) {
    throw new Error("Assigned technician is required");
  }

  await sql.begin(async (tx) => {
    const rows = await tx<Array<{
      id: string;
      workOrderNo: string;
      status: string;
      ticketId: string | null;
      assetId: string;
      assignedTechnicianId: string | null;
      supervisorId: string | null;
    }>>`
      SELECT id, "workOrderNo", status::text AS status, "ticketId", "assetId",
        "assignedTechnicianId", "supervisorId"
      FROM "MaintenanceWorkOrder"
      WHERE id = ${input.id}
      LIMIT 1
      FOR UPDATE
    `;
    const workOrder = rows[0];
    if (!workOrder) throw new Error("Maintenance work order not found");
    if (["COMPLETED", "TESTED", "CLOSED", "CANCELLED", "REJECTED"].includes(workOrder.status)) {
      throw new Error("Completed, tested, closed, cancelled, or rejected work order cannot be assigned");
    }
    if (!["APPROVED", "ASSIGNED", "IN_PROGRESS"].includes(workOrder.status)) throw new Error("Work order must be checked and approved before assignment or start");

    const nextStatus = input.startNow ? "IN_PROGRESS" : "ASSIGNED";
    await tx`
      UPDATE "MaintenanceWorkOrder"
      SET "assignedTechnicianId" = ${assignedTechnicianId},
        "supervisorId" = ${normalizeText(input.supervisorId)},
        status = ${nextStatus},
        "actualStart" = CASE WHEN ${Boolean(input.startNow)} THEN COALESCE("actualStart", NOW()) ELSE "actualStart" END,
        "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    await tx`
      UPDATE "Asset"
      SET status = 'UNDER_MAINTENANCE', "updatedAt" = NOW()
      WHERE id = ${workOrder.assetId}
        AND status NOT IN ('RETIRED', 'DISPOSED')
    `;
    if (workOrder.ticketId) {
      await tx`
        UPDATE "MaintenanceTicket"
        SET "assignedToId" = ${assignedTechnicianId}, status = 'ASSIGNED', "updatedAt" = NOW()
        WHERE id = ${workOrder.ticketId}
          AND status NOT IN ('CLOSED', 'CANCELLED', 'REJECTED')
      `;
    }

    await writeMaintenanceAudit(tx, input.performedById, input.startNow ? "START" : "ASSIGN", input.id, {
      status: nextStatus,
      assignedTechnicianId,
      supervisorId: normalizeText(input.supervisorId),
      remarks: normalizeText(input.remarks),
    }, {
      status: workOrder.status,
      assignedTechnicianId: workOrder.assignedTechnicianId,
      supervisorId: workOrder.supervisorId,
    });
    await writeMaintenanceHistory(
      tx,
      "maintenance.work-order",
      input.id,
      input.startNow ? "START" : "ASSIGN",
      input.performedById,
      normalizeText(input.remarks) ?? `Assigned to technician and moved to ${nextStatus}`,
    );
  });

  return getWorkOrderById(input.id);
}

export async function closeMaintenanceWorkOrder(input: {
  id: string;
  closedById: string;
  closureRemarks?: string | null;
  unresolvedOverrideReason?: string | null;
  unresolvedOverrideApprovedById?: string | null;
  leaveOutOfService?: boolean;
}) {
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{
      id: string;
      workOrderNo: string;
      status: string;
      ticketId: string | null;
      assetId: string;
      testResult: string | null;
    }>>`
      SELECT id, "workOrderNo", status::text AS status, "ticketId", "assetId", "testResult"
      FROM "MaintenanceWorkOrder"
      WHERE id = ${input.id}
      LIMIT 1
      FOR UPDATE
    `;
    const workOrder = rows[0];
    if (!workOrder) throw new Error("Maintenance work order not found");
    if (!["COMPLETED", "TESTED"].includes(workOrder.status)) {
      throw new Error("Only completed or tested work orders can be closed");
    }
    if (!normalizeText(workOrder.testResult)) {
      throw new Error("A test result is required before closing the work order");
    }
    const tests = await tx<Array<{ result: string; supervisorApprovedAt: string | null }>>`SELECT result,"supervisorApprovedAt"::text AS "supervisorApprovedAt" FROM "MaintenanceWorkOrderTest" WHERE "workOrderId"=${input.id} ORDER BY "testDate" DESC,"createdAt" DESC LIMIT 1`;
    const latestTest = tests[0];
    if (!latestTest) throw new Error("A machine test is required before closure");
    const leaveOutOfService = Boolean(input.leaveOutOfService) || latestTest.result === "FAIL";
    if (latestTest.result === "FAIL" && !leaveOutOfService) throw new Error("A passing machine test is required before closure, or close with the asset left out of service");
    if (latestTest.result === "CONDITIONAL" && !latestTest.supervisorApprovedAt) throw new Error("Supervisor approval is required for a conditional test result");
    const restoredStatus = leaveOutOfService ? "OUT_OF_SERVICE" : "ACTIVE";
    const sessions = await tx<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "MaintenanceWorkSession" WHERE "workOrderId"=${input.id} AND status IN ('ACTIVE','PAUSED')`;
    if (Number(sessions[0]?.count ?? 0)>0) throw new Error("Check out all active technician sessions before closure");

    const partRows = await tx<Array<{ unaccountedQty: number }>>`
      SELECT COALESCE(SUM(GREATEST(COALESCE("issuedQty", 0) - COALESCE("usedQty", 0) - COALESCE("returnedQty", 0) - COALESCE("damagedQty", 0), 0)), 0) AS "unaccountedQty"
      FROM "MaintenanceWorkOrderPart"
      WHERE "workOrderId" = ${input.id}
    `;
    if (Number(partRows[0]?.unaccountedQty ?? 0) > 0.000001 && !normalizeText(input.unresolvedOverrideReason)) {
      throw new Error("All issued spare parts must be marked used or returned before closing the work order");
    }

    await recalculateWorkOrderTotals(tx, input.id);
    await tx`
      UPDATE "MaintenanceWorkOrder"
      SET status = 'CLOSED', "closedById" = ${input.closedById},
        "actualEnd" = COALESCE("actualEnd", NOW()), "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    await tx`
      UPDATE "Asset"
      SET status = ${restoredStatus}::"AssetStatus", "updatedAt" = NOW()
      WHERE id = ${workOrder.assetId}
        AND status IN ('UNDER_MAINTENANCE', 'OUT_OF_SERVICE')
    `;
    if (workOrder.ticketId) {
      await tx`
        UPDATE "MaintenanceTicket"
        SET status = 'CLOSED', "actualCompletionDate" = COALESCE("actualCompletionDate", NOW()),
          remarks = CASE
            WHEN ${normalizeText(input.closureRemarks)} IS NULL THEN remarks
            WHEN remarks IS NULL OR remarks = '' THEN ${normalizeText(input.closureRemarks)}
            ELSE remarks || E'\n' || ${normalizeText(input.closureRemarks)}
          END,
          "updatedAt" = NOW()
        WHERE id = ${workOrder.ticketId}
      `;
      await tx`
      UPDATE "ProductionDowntime" pd
      SET
          status = 'CLOSED',
          "restoredAt" = COALESCE(pd."restoredAt", NOW()),
          "endTime" = COALESCE(pd."endTime", NOW()),
          "durationMinutes" = GREATEST(ROUND(EXTRACT(EPOCH FROM (COALESCE(pd."endTime", NOW()) - pd."startTime"))/60)::int, 0),
          "workOrderId" = ${input.id},
          "closedById" = ${input.closedById},
          "updatedAt" = NOW(),
          remarks = CASE
            WHEN ${normalizeText(input.closureRemarks)} IS NULL THEN pd.remarks
            WHEN pd.remarks IS NULL OR pd.remarks = '' THEN ${normalizeText(input.closureRemarks)}
            ELSE pd.remarks || E'\n' || ${normalizeText(input.closureRemarks)}
          END
        FROM "MaintenanceTicket" mt
        WHERE mt.id = ${workOrder.ticketId}
          AND pd.id = mt."productionDowntimeId"
      `;
    }
    await tx`
      INSERT INTO "AssetHistory" (
        id, "assetId", "eventType", "referenceType", "referenceId", "eventDate",
        "oldStatus", "newStatus", "performedById", remarks, "createdAt"
      )
      VALUES (
        ${randomUUID()}, ${workOrder.assetId}, ${leaveOutOfService ? "MAINTENANCE_OUT_OF_SERVICE" : "MAINTENANCE_RESTORED"},
        'maintenance.work-order', ${input.id}, NOW(), 'UNDER_MAINTENANCE', ${restoredStatus}::"AssetStatus",
        ${input.closedById}, ${normalizeText(input.closureRemarks) ?? workOrder.workOrderNo}, NOW()
      )
    `;
    await tx`
      UPDATE "PreventiveMaintenanceExecution"
      SET "completedDate" = COALESCE("completedDate", NOW()),
        result = COALESCE(result, ${workOrder.testResult}), status = 'COMPLETED', "updatedAt" = NOW()
      WHERE "workOrderId" = ${input.id}
    `;
    const completedPlans = await tx<Array<{ id: string; frequencyType: string; frequencyValue: number; nextDueDate: string | null }>>`
      SELECT plan.id, plan."frequencyType"::text AS "frequencyType", plan."frequencyValue", plan."nextDueDate"::text AS "nextDueDate"
      FROM "PreventiveMaintenancePlan" plan
      INNER JOIN "PreventiveMaintenanceExecution" execution ON execution."planId" = plan.id
      WHERE execution."workOrderId" = ${input.id}
      FOR UPDATE
    `;
    for (const plan of completedPlans) {
      const nextDueDate = calculateNextMaintenanceDate(
        plan.nextDueDate ?? new Date(),
        plan.frequencyType,
        plan.frequencyValue,
      );
      await tx`
        UPDATE "PreventiveMaintenancePlan"
        SET "lastCompletedDate" = NOW(), "nextDueDate" = ${nextDueDate},
          "nextMeterReading" = CASE
            WHEN "meterInterval" IS NOT NULL THEN GREATEST(COALESCE("nextMeterReading", 0), COALESCE((SELECT "currentMeterReading" FROM "Asset" WHERE id = "PreventiveMaintenancePlan"."assetId"), 0)) + "meterInterval"
            ELSE "nextMeterReading"
          END,
          "updatedAt" = NOW()
        WHERE id = ${plan.id}
      `;
    }

    await syncMaintenanceWorkOrderFinance(tx, { workOrderId: input.id, userId: input.closedById });
    await writeMaintenanceAudit(tx, input.closedById, "CLOSE", input.id, {
      status: "CLOSED",
      closureRemarks: normalizeText(input.closureRemarks),
      unresolvedPartsOverride: normalizeText(input.unresolvedOverrideReason) ? { reason: normalizeText(input.unresolvedOverrideReason), approvedById: normalizeText(input.unresolvedOverrideApprovedById), quantity: Number(partRows[0]?.unaccountedQty ?? 0) } : null,
    }, { status: workOrder.status });
    await writeMaintenanceHistory(
      tx,
      "maintenance.work-order",
      input.id,
      "CLOSE",
      input.closedById,
      normalizeText(input.closureRemarks) ?? "Work order closed after testing and spare reconciliation",
    );
  });

  return getWorkOrderById(input.id);
}

export async function reopenMaintenanceWorkOrder(input: {
  id: string;
  reopenedById: string;
  reason: string;
}) {
  const reason = normalizeText(input.reason);
  if (!reason) throw new Error("Reopen reason is required");

  await sql.begin(async (tx) => {
    const rows = await tx<Array<{
      id: string;
      status: string;
      ticketId: string | null;
      assetId: string;
    }>>`
      SELECT id, status::text AS status, "ticketId", "assetId"
      FROM "MaintenanceWorkOrder"
      WHERE id = ${input.id}
      LIMIT 1
      FOR UPDATE
    `;
    const workOrder = rows[0];
    if (!workOrder) throw new Error("Maintenance work order not found");
    if (workOrder.status !== "CLOSED") throw new Error("Only a closed work order can be reopened");

    const journalRows = await tx<Array<{ id: string }>>`
      SELECT id FROM "JournalEntry"
      WHERE "sourceType" = 'maintenance.work-order' AND "sourceId" = ${input.id} AND status = 'POSTED'
      LIMIT 1
    `;
    if (journalRows[0]) {
      throw new Error("This work order has a posted accounting journal. Reverse the journal before reopening it.");
    }

    await tx`
      UPDATE "MaintenanceWorkOrder"
      SET status = 'IN_PROGRESS', "closedById" = NULL, "actualEnd" = NULL, "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    await tx`UPDATE "Asset" SET status = 'UNDER_MAINTENANCE', "updatedAt" = NOW() WHERE id = ${workOrder.assetId}`;
    if (workOrder.ticketId) {
      await tx`
        UPDATE "MaintenanceTicket"
        SET status = 'ASSIGNED', "actualCompletionDate" = NULL, "updatedAt" = NOW()
        WHERE id = ${workOrder.ticketId}
      `;
    }
    await writeMaintenanceAudit(tx, input.reopenedById, "REOPEN", input.id, {
      status: "IN_PROGRESS",
      reason,
    }, { status: workOrder.status });
    await writeMaintenanceHistory(tx, "maintenance.work-order", input.id, "REOPEN", input.reopenedById, reason);
  });

  return getWorkOrderById(input.id);
}

export async function cancelMaintenanceWorkOrder(input: {
  id: string;
  cancelledById: string;
  reason: string;
}) {
  const reason = normalizeText(input.reason);
  if (!reason) throw new Error("Cancellation reason is required");

  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string; assetId: string; ticketId: string | null }>>`
      SELECT id, status::text AS status, "assetId", "ticketId"
      FROM "MaintenanceWorkOrder" WHERE id = ${input.id} LIMIT 1 FOR UPDATE
    `;
    const workOrder = rows[0];
    if (!workOrder) throw new Error("Maintenance work order not found");
    if (["CLOSED", "CANCELLED"].includes(workOrder.status)) {
      throw new Error("Closed or already cancelled work order cannot be cancelled");
    }
    const parts = await tx<Array<{ outstandingQty: number }>>`
      SELECT COALESCE(SUM(GREATEST(COALESCE("issuedQty", 0) - COALESCE("returnedQty", 0), 0)), 0) AS "outstandingQty"
      FROM "MaintenanceWorkOrderPart" WHERE "workOrderId" = ${input.id}
    `;
    if (Number(parts[0]?.outstandingQty ?? 0) > 0.000001) {
      throw new Error("Return all issued spare parts before cancelling the work order");
    }

    const reversal = await reverseMaintenanceWorkOrderFinance(tx, {
      workOrderId: input.id,
      userId: input.cancelledById,
      reason,
    });
    await tx`UPDATE "MaintenanceWorkOrder" SET status = 'CANCELLED', "updatedAt" = NOW() WHERE id = ${input.id}`;
    await tx`UPDATE "Asset" SET status = 'ACTIVE', "updatedAt" = NOW() WHERE id = ${workOrder.assetId} AND status = 'UNDER_MAINTENANCE'`;
    if (workOrder.ticketId) {
      await tx`
        UPDATE "MaintenanceTicket" SET status = 'CANCELLED', remarks = CASE WHEN remarks IS NULL OR remarks = '' THEN ${reason} ELSE remarks || E'\n' || ${reason} END, "updatedAt" = NOW()
        WHERE id = ${workOrder.ticketId}
      `;
    }
    await tx`
      UPDATE "PreventiveMaintenanceExecution" SET result = ${`Cancelled: ${reason}`}, "updatedAt" = NOW()
      WHERE "workOrderId" = ${input.id} AND "completedDate" IS NULL
    `;
    await writeMaintenanceAudit(tx, input.cancelledById, "CANCEL", input.id, { status: "CANCELLED", reason, reversal }, { status: workOrder.status });
    await writeMaintenanceHistory(tx, "maintenance.work-order", input.id, "CANCEL", input.cancelledById, reason);
  });
  return getWorkOrderById(input.id);
}

export type MaintenanceSpareRequestRecord = {
  id: string; requestNo: string; workOrderId: string; locationId: string; status: string; requestedById: string;
  checkedById: string | null; approvedById: string | null; remarks: string | null; createdAt: string;
  items: Array<{ id: string; workOrderPartId: string; itemId: string; itemCode: string; itemName: string; requestedQty: number; approvedQty: number; issuedQty: number; remarks: string | null }>;
};

export async function listMaintenanceSpareRequests(workOrderId: string): Promise<MaintenanceSpareRequestRecord[]> {
  return sql<MaintenanceSpareRequestRecord[]>`
    SELECT r.id, r."requestNo", r."workOrderId", r."locationId", r.status, r."requestedById", r."checkedById", r."approvedById", r.remarks,
      r."createdAt"::text AS "createdAt", COALESCE((SELECT json_agg(json_build_object('id', i.id, 'workOrderPartId', i."workOrderPartId", 'itemId', i."itemId",
        'itemCode', item."itemCode", 'itemName', item."itemName", 'requestedQty', i."requestedQty", 'approvedQty', i."approvedQty", 'issuedQty', i."issuedQty", 'remarks', i.remarks) ORDER BY i."createdAt")
        FROM "MaintenanceSpareRequestItem" i INNER JOIN "Item" item ON item.id = i."itemId" WHERE i."requestId" = r.id), '[]'::json) AS items
    FROM "MaintenanceSpareRequest" r WHERE r."workOrderId" = ${workOrderId} ORDER BY r."createdAt" DESC`;
}

export async function createMaintenanceSpareRequest(input: { workOrderId: string; requestedById: string; remarks?: string | null; lines: Array<{ partId: string; quantity: number; remarks?: string | null }> }) {
  let requestId = "";
  await sql.begin(async (tx) => {
    const orders = await tx<Array<{ workOrderNo: string; locationId: string; status: string }>>`SELECT "workOrderNo", "locationId", status::text AS status FROM "MaintenanceWorkOrder" WHERE id = ${input.workOrderId} LIMIT 1 FOR UPDATE`;
    const order = orders[0];
    if (!order) throw new Error("Maintenance work order not found");
    if (!["APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"].includes(order.status)) throw new Error("Work order must be approved before requesting spare parts");
    const parts = new Map((await getWorkOrderPartRows(tx, input.workOrderId)).map((part) => [part.id, part]));
    const active = await tx<Array<{ workOrderPartId: string; reservedQty: number }>>`SELECT i."workOrderPartId", COALESCE(SUM(i."approvedQty" - i."issuedQty"), 0) AS "reservedQty"
      FROM "MaintenanceSpareRequestItem" i INNER JOIN "MaintenanceSpareRequest" r ON r.id = i."requestId"
      WHERE r."workOrderId" = ${input.workOrderId} AND r.status IN ('APPROVED', 'PARTIALLY_ISSUED') GROUP BY i."workOrderPartId"`;
    const reserved = new Map(active.map((row) => [row.workOrderPartId, Number(row.reservedQty)]));
    const normalized = input.lines.map((line) => ({ ...line, quantity: parseNumeric(line.quantity) })).filter((line) => line.quantity > 0);
    if (!normalized.length) throw new Error("At least one spare request quantity is required");
    for (const line of normalized) {
      const part = parts.get(line.partId); if (!part) throw new Error("Work order part not found");
      const available = Math.max(Number(part.requestedQty) - Number(part.issuedQty) - Number(reserved.get(part.id) ?? 0), 0);
      if (line.quantity > available + 0.000001) throw new Error("Requested quantity exceeds the unissued work-order requirement");
    }
    requestId = randomUUID();
    const requestNo = await nextMaintenanceDocumentNumber(tx, "SPR", "Maintenance Spare Request");
    await tx`INSERT INTO "MaintenanceSpareRequest" (id, "requestNo", "workOrderId", "locationId", status, "requestedById", remarks, "createdAt", "updatedAt")
      VALUES (${requestId}, ${requestNo}, ${input.workOrderId}, ${order.locationId}, 'DRAFT', ${input.requestedById}, ${normalizeText(input.remarks)}, NOW(), NOW())`;
    for (const line of normalized) { const part = parts.get(line.partId)!; await tx`INSERT INTO "MaintenanceSpareRequestItem" (id, "requestId", "workOrderPartId", "itemId", "requestedQty", "approvedQty", "issuedQty", remarks, "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${requestId}, ${part.id}, ${part.itemId}, ${line.quantity}, 0, 0, ${normalizeText(line.remarks)}, NOW(), NOW())`; }
    await writeMaintenanceAudit(tx, input.requestedById, "CREATE_SPARE_REQUEST", requestId, { workOrderId: input.workOrderId, lines: normalized });
  });
  return (await listMaintenanceSpareRequests(input.workOrderId)).find((request) => request.id === requestId) ?? null;
}

export async function transitionMaintenanceSpareRequest(input: { id: string; action: "submit" | "check" | "approve" | "reject" | "cancel"; performedById: string; remarks?: string | null }) {
  let workOrderId = "";
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; workOrderId: string; status: string; requestedById: string; checkedById: string | null }>>`SELECT id, "workOrderId", status, "requestedById", "checkedById" FROM "MaintenanceSpareRequest" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    const request = rows[0]; if (!request) throw new Error("Spare request not found"); workOrderId = request.workOrderId;
    if (input.action === "submit") { if (request.status !== "DRAFT") throw new Error("Only draft requests can be submitted"); await tx`UPDATE "MaintenanceSpareRequest" SET status = 'SUBMITTED', "submittedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`; }
    else if (input.action === "check") { if (request.status !== "SUBMITTED") throw new Error("Only submitted requests can be checked"); if (request.requestedById === input.performedById) throw new Error("Requester cannot check their own spare request"); await tx`UPDATE "MaintenanceSpareRequest" SET status = 'CHECKED', "checkedById" = ${input.performedById}, "checkedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`; }
    else if (input.action === "approve") { if (request.status !== "CHECKED") throw new Error("Spare request must be checked before approval"); if (request.requestedById === input.performedById || request.checkedById === input.performedById) throw new Error("Approver must be separate from requester and checker");
      const overages = await tx<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "MaintenanceSpareRequestItem" current_item
        INNER JOIN "MaintenanceWorkOrderPart" part ON part.id = current_item."workOrderPartId"
        WHERE current_item."requestId" = ${input.id} AND current_item."requestedQty" > GREATEST(part."requestedQty" - part."issuedQty" - COALESCE((SELECT SUM(other_item."approvedQty" - other_item."issuedQty") FROM "MaintenanceSpareRequestItem" other_item INNER JOIN "MaintenanceSpareRequest" other_request ON other_request.id = other_item."requestId" WHERE other_item."workOrderPartId" = current_item."workOrderPartId" AND other_request.id <> ${input.id} AND other_request.status IN ('APPROVED', 'PARTIALLY_ISSUED')), 0), 0) + 0.000001`;
      if (Number(overages[0]?.count ?? 0) > 0) throw new Error("Spare requirement changed; requested quantity now exceeds the available work-order requirement");
      await tx`UPDATE "MaintenanceSpareRequestItem" SET "approvedQty" = "requestedQty", "updatedAt" = NOW() WHERE "requestId" = ${input.id}`; await tx`UPDATE "MaintenanceSpareRequest" SET status = 'APPROVED', "approvedById" = ${input.performedById}, "approvedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${input.id}`; }
    else if (input.action === "reject") { if (!["SUBMITTED", "CHECKED"].includes(request.status)) throw new Error("Only submitted or checked requests can be rejected"); await tx`UPDATE "MaintenanceSpareRequest" SET status = 'REJECTED', "rejectedById" = ${input.performedById}, remarks = COALESCE(${normalizeText(input.remarks)}, remarks), "updatedAt" = NOW() WHERE id = ${input.id}`; }
    else { if (!["DRAFT", "SUBMITTED", "CHECKED"].includes(request.status)) throw new Error("Only unapproved requests can be cancelled"); await tx`UPDATE "MaintenanceSpareRequest" SET status = 'CANCELLED', remarks = COALESCE(${normalizeText(input.remarks)}, remarks), "updatedAt" = NOW() WHERE id = ${input.id}`; }
    await writeMaintenanceAudit(tx, input.performedById, `SPARE_REQUEST_${input.action.toUpperCase()}`, input.id, { remarks: input.remarks ?? null });
  });
  return (await listMaintenanceSpareRequests(workOrderId)).find((request) => request.id === input.id) ?? null;
}

export async function issueWorkOrderParts(input: {
  workOrderId: string;
  locationId?: string | null;
  createdById: string;
  remarks?: string | null;
  spareRequestId?: string | null;
  directIssueReason?: string | null;
  lines: Array<{
    partId: string;
    quantity: number;
    unitCost?: number | null;
    remarks?: string | null;
  }>;
}) {
  await sql.begin(async (tx) => {
    const workOrderRows = await tx<Array<{ id: string; workOrderNo: string; locationId: string; status: string }>>`
      SELECT id, "workOrderNo", "locationId", status::text AS status
      FROM "MaintenanceWorkOrder"
      WHERE id = ${input.workOrderId}
      LIMIT 1
    `;

    const workOrder = workOrderRows[0];
    if (!workOrder) {
      throw new Error("Maintenance work order not found");
    }
    if (["CANCELLED", "CLOSED"].includes(workOrder.status)) {
      throw new Error("Closed or cancelled work order cannot issue parts");
    }
    if (!["APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"].includes(workOrder.status)) throw new Error("Work order must be approved before issuing spare parts");

    const partRows = await getWorkOrderPartRows(tx, input.workOrderId);
    const partMap = new Map(partRows.map((entry) => [entry.id, entry]));
    const locationId = normalizeText(input.locationId) ?? workOrder.locationId;
    const spareRequestId = normalizeText(input.spareRequestId);
    let requestItems = new Map<string, { id: string; availableQty: number }>();
    if (spareRequestId) {
      const requests = await tx<Array<{ workOrderId: string; locationId: string; status: string }>>`SELECT "workOrderId", "locationId", status FROM "MaintenanceSpareRequest" WHERE id = ${spareRequestId} LIMIT 1 FOR UPDATE`;
      const request = requests[0]; if (!request || request.workOrderId !== input.workOrderId) throw new Error("Approved spare request not found for this work order");
      if (!["APPROVED", "PARTIALLY_ISSUED"].includes(request.status)) throw new Error("Spare request must be approved before issue");
      if (request.locationId !== locationId) throw new Error("Issue location must match the spare request");
      const items = await tx<Array<{ id: string; workOrderPartId: string; approvedQty: number; issuedQty: number }>>`SELECT id, "workOrderPartId", "approvedQty", "issuedQty" FROM "MaintenanceSpareRequestItem" WHERE "requestId" = ${spareRequestId} FOR UPDATE`;
      requestItems = new Map(items.map((item) => [item.workOrderPartId, { id: item.id, availableQty: Number(item.approvedQty) - Number(item.issuedQty) }]));
    } else if (!normalizeText(input.directIssueReason)) throw new Error("Select an approved spare request or provide a direct-issue reason");

    for (const line of input.lines) {
      const quantity = parseNumeric(line.quantity);
      if (quantity <= 0) continue;

      const part = partMap.get(line.partId);
      if (!part) {
        throw new Error("Work order part not found");
      }
      const requestItem = requestItems.get(part.id);
      if (spareRequestId && (!requestItem || quantity > requestItem.availableQty + 0.000001)) throw new Error("Issue quantity exceeds the approved spare-request balance");

      const remainingToIssue = Math.max(Number(part.requestedQty ?? 0) - Number(part.issuedQty ?? 0), 0);
      if (quantity > remainingToIssue) {
        throw new Error("Issue quantity cannot exceed remaining requested quantity");
      }

      const movement = await inventoryIssueToMaintenanceOrFleet({
        itemId: part.itemId,
        locationId,
        quantity,
        unitCost: Number(line.unitCost ?? part.unitCost ?? 0),
        sourceModule: "maintenance.work-order",
        sourceDocumentId: input.workOrderId,
        createdById: input.createdById,
        remarks: line.remarks ?? input.remarks ?? `Issued to work order ${workOrder.workOrderNo}`,
      }, { tx });

      const nextIssued = Number(part.issuedQty ?? 0) + quantity;
      const nextReturned = Number(part.returnedQty ?? 0);
      const nextUsed = Number(part.usedQty ?? 0);
      const nextUnresolved = Math.max(nextIssued - nextReturned - nextUsed - Number(part.damagedQty ?? 0), 0);
      const nextUnitCost = Number(line.unitCost ?? part.unitCost ?? 0);

      await tx`
        UPDATE "MaintenanceWorkOrderPart"
        SET
          "stockIssueId" = ${movement?.movementId ?? part.stockIssueId},
          "issuedQty" = ${nextIssued},
          "usedQty" = ${nextUsed},
          "unresolvedQty" = ${nextUnresolved},
          "unitCost" = ${nextUnitCost},
          "totalCost" = ${(nextUsed + Number(part.damagedQty ?? 0)) * nextUnitCost},
          remarks = ${normalizeText(line.remarks) ?? part.remarks},
          "updatedAt" = NOW()
        WHERE id = ${part.id}
      `;
      if (requestItem) await tx`UPDATE "MaintenanceSpareRequestItem" SET "issuedQty" = "issuedQty" + ${quantity}, "updatedAt" = NOW() WHERE id = ${requestItem.id}`;
      await tx`INSERT INTO "MaintenanceSpareTrace" (id,"workOrderId","workOrderPartId","spareRequestId","movementType","stockMovementId",quantity,"unitCost","directIssue","directIssueReason","directIssueApprovedById","createdById","createdAt") VALUES (${randomUUID()},${input.workOrderId},${part.id},${spareRequestId},'ISSUE',${movement?.movementId ?? null},${quantity},${nextUnitCost},${!spareRequestId},${normalizeText(input.directIssueReason)},${!spareRequestId ? input.createdById : null},${input.createdById},NOW())`;
    }

    if (spareRequestId) await tx`UPDATE "MaintenanceSpareRequest" SET status = CASE WHEN EXISTS (SELECT 1 FROM "MaintenanceSpareRequestItem" WHERE "requestId" = ${spareRequestId} AND "issuedQty" + 0.000001 < "approvedQty") THEN 'PARTIALLY_ISSUED' ELSE 'ISSUED' END, "updatedAt" = NOW() WHERE id = ${spareRequestId}`;

    const totals = await recalculateWorkOrderTotals(tx, input.workOrderId);
    await writeMaintenanceAudit(tx, input.createdById, "ISSUE_PARTS", input.workOrderId, {
      locationId,
      lines: input.lines,
      spareRequestId,
      directIssueReason: normalizeText(input.directIssueReason),
      totals,
    });
    await writeMaintenanceHistory(
      tx,
      "maintenance.work-order",
      input.workOrderId,
      "ISSUE_PARTS",
      input.createdById,
      input.remarks ?? `Issued spare parts for ${workOrder.workOrderNo}`,
    );

  });

  return getWorkOrderById(input.workOrderId);
}

export async function returnWorkOrderParts(input: {
  workOrderId: string;
  locationId?: string | null;
  createdById: string;
  remarks?: string | null;
  lines: Array<{
    partId: string;
    quantity: number;
    unitCost?: number | null;
    remarks?: string | null;
  }>;
}) {
  await sql.begin(async (tx) => {
    const workOrderRows = await tx<Array<{ id: string; workOrderNo: string; locationId: string; status: string }>>`
      SELECT id, "workOrderNo", "locationId", status::text AS status
      FROM "MaintenanceWorkOrder"
      WHERE id = ${input.workOrderId}
      LIMIT 1
    `;

    const workOrder = workOrderRows[0];
    if (!workOrder) {
      throw new Error("Maintenance work order not found");
    }
    if (["CANCELLED", "CLOSED"].includes(workOrder.status)) {
      throw new Error("Closed or cancelled work order cannot return parts");
    }

    const partRows = await getWorkOrderPartRows(tx, input.workOrderId);
    const partMap = new Map(partRows.map((entry) => [entry.id, entry]));
    const locationId = normalizeText(input.locationId) ?? workOrder.locationId;

    for (const line of input.lines) {
      const quantity = parseNumeric(line.quantity);
      if (quantity <= 0) continue;

      const part = partMap.get(line.partId);
      if (!part) {
        throw new Error("Work order part not found");
      }

      const maxReturn = Math.max(Number(part.issuedQty ?? 0) - Number(part.returnedQty ?? 0) - Number(part.usedQty ?? 0) - Number(part.damagedQty ?? 0), 0);
      if (quantity > maxReturn) {
        throw new Error("Return quantity cannot exceed issued quantity still on work order");
      }

      const movement = await inventoryReturnFromMaintenanceOrFleet({
        itemId: part.itemId,
        locationId,
        quantity,
        unitCost: Number(line.unitCost ?? part.unitCost ?? 0),
        sourceModule: "maintenance.work-order",
        sourceDocumentId: input.workOrderId,
        createdById: input.createdById,
        remarks: line.remarks ?? input.remarks ?? `Returned from work order ${workOrder.workOrderNo}`,
      }, { tx });

      const nextReturned = Number(part.returnedQty ?? 0) + quantity;
      const nextIssued = Number(part.issuedQty ?? 0);
      const nextUnitCost = Number(line.unitCost ?? part.unitCost ?? 0);
      const nextUsed = Number(part.usedQty ?? 0);
      const nextUnresolved = Math.max(nextIssued - nextReturned - nextUsed - Number(part.damagedQty ?? 0), 0);

      await tx`
        UPDATE "MaintenanceWorkOrderPart"
        SET
          "returnedQty" = ${nextReturned},
          "usedQty" = ${nextUsed},
          "unresolvedQty" = ${nextUnresolved},
          "unitCost" = ${nextUnitCost},
          "totalCost" = ${(nextUsed + Number(part.damagedQty ?? 0)) * nextUnitCost},
          remarks = ${normalizeText(line.remarks) ?? part.remarks},
          "updatedAt" = NOW()
        WHERE id = ${part.id}
      `;
      await tx`INSERT INTO "MaintenanceSpareTrace" (id,"workOrderId","workOrderPartId","movementType","stockMovementId",quantity,"unitCost","createdById","createdAt") VALUES (${randomUUID()},${input.workOrderId},${part.id},'RETURN_UNUSED',${movement?.movementId ?? null},${quantity},${nextUnitCost},${input.createdById},NOW())`;
    }

    const totals = await recalculateWorkOrderTotals(tx, input.workOrderId);
    await writeMaintenanceAudit(tx, input.createdById, "RETURN_PARTS", input.workOrderId, {
      locationId,
      lines: input.lines,
      totals,
    });
    await writeMaintenanceHistory(
      tx,
      "maintenance.work-order",
      input.workOrderId,
      "RETURN_PARTS",
      input.createdById,
      input.remarks ?? `Returned unused spare parts for ${workOrder.workOrderNo}`,
    );

  });

  return getWorkOrderById(input.workOrderId);
}

export async function recordWorkOrderPartUsage(input: {
  workOrderId: string;
  recordedById: string;
  remarks?: string | null;
  lines: Array<{ partId: string; usedQty: number; damagedQty?: number; damageReason?: string | null }>;
}) {
  await sql.begin(async (tx) => {
    const workOrders = await tx<Array<{ status: string }>>`SELECT status::text AS status FROM "MaintenanceWorkOrder" WHERE id = ${input.workOrderId} LIMIT 1 FOR UPDATE`;
    if (!workOrders[0]) throw new Error("Maintenance work order not found");
    if (!["APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE", "COMPLETED", "TESTED"].includes(workOrders[0].status)) throw new Error("Work order must be approved before recording part usage");
    const parts = new Map((await getWorkOrderPartRows(tx, input.workOrderId)).map((part) => [part.id, part]));
    for (const line of input.lines) {
      const part = parts.get(line.partId);
      if (!part) throw new Error("Work order part not found");
      const usedQty = parseNumeric(line.usedQty);
      const damagedQty = parseNumeric(line.damagedQty);
      if (usedQty < 0 || damagedQty < 0) throw new Error("Used and damaged quantities cannot be negative");
      if (damagedQty > 0 && !normalizeText(line.damageReason)) throw new Error("Damage reason is required for damaged spare parts");
      const accounted = usedQty + damagedQty + Number(part.returnedQty ?? 0);
      if (accounted > Number(part.issuedQty ?? 0) + 0.000001) throw new Error("Used, damaged, and returned quantities cannot exceed issued quantity");
      const unresolvedQty = Math.max(Number(part.issuedQty ?? 0) - accounted, 0);
      await tx`UPDATE "MaintenanceWorkOrderPart" SET "usedQty" = ${usedQty}, "damagedQty" = ${damagedQty},
        "unresolvedQty" = ${unresolvedQty}, "damageReason" = ${normalizeText(line.damageReason)},
        "totalCost" = ${(usedQty + damagedQty) * Number(part.unitCost ?? 0)},
        remarks = COALESCE(${normalizeText(input.remarks)}, remarks), "updatedAt" = NOW() WHERE id = ${part.id}`;
      const usedDelta = Math.max(usedQty - Number(part.usedQty ?? 0), 0);
      const damagedDelta = Math.max(damagedQty - Number(part.damagedQty ?? 0), 0);
      if (usedDelta > 0) await tx`INSERT INTO "MaintenanceSpareTrace" (id,"workOrderId","workOrderPartId","movementType",quantity,"unitCost","createdById","createdAt") VALUES (${randomUUID()},${input.workOrderId},${part.id},'USAGE',${usedDelta},${Number(part.unitCost ?? 0)},${input.recordedById},NOW())`;
      if (damagedDelta > 0) {
        const orderRows=await tx<Array<{locationId:string;workOrderNo:string}>>`SELECT "locationId","workOrderNo" FROM "MaintenanceWorkOrder" WHERE id=${input.workOrderId}`;
        const damageMovementId=randomUUID(); const movementNumber=await nextMaintenanceDocumentNumber(tx,"STK","Stock Movement");
        await tx`INSERT INTO "StockMovement" (id,"movementNumber",date,"itemId","locationId","movementType","sourceModule","sourceDocumentId","quantityIn","quantityOut","unitCost","totalCost","referenceType","referenceId",remarks,"createdById","isArchived","createdAt") VALUES (${damageMovementId},${movementNumber},NOW(),${part.itemId},${orderRows[0].locationId},'DAMAGED','maintenance.work-order.damage',${input.workOrderId},0,${damagedDelta},${Number(part.unitCost??0)},${damagedDelta*Number(part.unitCost??0)},'maintenance.work-order.part',${part.id},${normalizeText(line.damageReason)??`Damaged after issue to ${orderRows[0].workOrderNo}`},${input.recordedById},false,NOW())`;
        await tx`UPDATE "MaintenanceWorkOrderPart" SET "damagedMovementId"=${damageMovementId} WHERE id=${part.id}`;
        await tx`INSERT INTO "MaintenanceSpareTrace" (id,"workOrderId","workOrderPartId","movementType","stockMovementId",quantity,"unitCost","damageReason",condition,"createdById","createdAt") VALUES (${randomUUID()},${input.workOrderId},${part.id},'DAMAGED',${damageMovementId},${damagedDelta},${Number(part.unitCost ?? 0)},${normalizeText(line.damageReason)},'DAMAGED_AFTER_ISSUE',${input.recordedById},NOW())`;
      }
    }
    const totals = await recalculateWorkOrderTotals(tx, input.workOrderId);
    await writeMaintenanceAudit(tx, input.recordedById, "RECORD_PART_USAGE", input.workOrderId, { lines: input.lines, totals });
    await writeMaintenanceHistory(tx, "maintenance.work-order", input.workOrderId, "RECORD_PART_USAGE", input.recordedById, input.remarks ?? "Spare usage and damage reconciled");
  });
  return getWorkOrderById(input.workOrderId);
}

export async function getWorkOrderPartAvailability(workOrderId: string, locationId?: string | null) {
  try {
    const workOrderRows = await sql<Array<{ locationId: string }>>`
      SELECT "locationId"
      FROM "MaintenanceWorkOrder"
      WHERE id = ${workOrderId}
      LIMIT 1
    `;
    const resolvedLocationId = normalizeText(locationId) ?? workOrderRows[0]?.locationId ?? null;
    if (!resolvedLocationId) {
      return [];
    }

    return sql<Array<{ partId: string; itemId: string; availableQty: number }>>`
      SELECT
        part.id AS "partId",
        part."itemId",
        COALESCE(sb."availableQuantity", 0) AS "availableQty"
      FROM "MaintenanceWorkOrderPart" part
      LEFT JOIN "StockBalance" sb
        ON sb."itemId" = part."itemId"
       AND sb."locationId" = ${resolvedLocationId}
      WHERE part."workOrderId" = ${workOrderId}
      ORDER BY part."createdAt" ASC
    `;
  } catch (error) {
    mapReadError(error, "Failed to load work order part availability");
    return [];
  }
}

type PMExecutionRow = {
  id: string;
  planId: string;
  workOrderId: string | null;
  workOrderNo: string | null;
  scheduledDate: string;
  completedDate: string | null;
  meterReading: number | null;
  triggerType: string;
  triggerValue: number | null;
  status: string;
  result: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

type PMPlanRow = {
  id: string;
  publicId: number;
  planNo: string;
  assetId: string;
  locationId: string;
  assetCode: string | null;
  assetName: string | null;
  title: string;
  maintenanceType: string;
  frequencyType: string;
  frequencyValue: number;
  nextDueDate: string | null;
  meterInterval: number | null;
  nextMeterReading: number | null;
  checklist: string | null;
  estimatedDurationMinutes: number;
  requiredRoleId: string | null;
  requiredRoleName: string | null;
  triggerType: string;
  leadTimeDays: number;
  gracePeriodDays: number;
  autoGenerateWorkOrder: boolean;
  priority: string;
  preferredTechnicianId: string | null;
  preferredTechnicianName: string | null;
  plannedDowntimeMinutes: number;
  lastGeneratedAt: string | null;
  currentMeterReading: number | null;
  status: string;
  lastCompletedDate: string | null;
  createdAt: string;
  updatedAt: string;
  executions?: unknown;
  tasks?: unknown;
  plannedSpares?: unknown;
  scheduleChanges?: unknown;
};

export type PreventiveMaintenancePlanInput = {
  assetId: string;
  title: string;
  maintenanceType: string;
  frequencyType: string;
  frequencyValue?: number | null;
  nextDueDate?: string | null;
  meterInterval?: number | null;
  nextMeterReading?: number | null;
  checklist?: string | null;
  estimatedDurationMinutes?: number | null;
  requiredRoleId?: string | null;
  status?: string | null;
  lastCompletedDate?: string | null;
  triggerType?: string | null;
  leadTimeDays?: number | null;
  gracePeriodDays?: number | null;
  autoGenerateWorkOrder?: boolean | null;
  priority?: string | null;
  preferredTechnicianId?: string | null;
  plannedDowntimeMinutes?: number | null;
  tasks?: Array<{ task: string; instructions?: string | null; isMandatory?: boolean; expectedResult?: string | null }>;
  plannedSpares?: Array<{ itemId: string; quantity: number; remarks?: string | null }>;
};

function mapPMExecution(row: PMExecutionRow): PreventiveMaintenanceExecution {
  return {
    id: row.id,
    planId: row.planId,
    workOrderId: row.workOrderId ?? undefined,
    workOrderNo: row.workOrderNo ?? undefined,
    scheduledDate: row.scheduledDate,
    completedDate: row.completedDate ?? undefined,
    meterReading: row.meterReading ?? undefined,
    triggerType: row.triggerType ?? "CALENDAR",
    triggerValue: row.triggerValue ?? undefined,
    status: row.status ?? "SCHEDULED",
    result: row.result ?? undefined,
    remarks: row.remarks ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPMPlan(row: PMPlanRow): PreventiveMaintenancePlan {
  return {
    id: row.id,
    publicId: row.publicId,
    planNo: row.planNo,
    assetId: row.assetId,
    locationId: row.locationId,
    assetCode: row.assetCode ?? undefined,
    assetName: row.assetName ?? undefined,
    title: row.title,
    maintenanceType: row.maintenanceType,
    frequencyType: row.frequencyType,
    frequencyValue: Number(row.frequencyValue ?? 1),
    nextDueDate: row.nextDueDate ?? undefined,
    meterInterval: row.meterInterval ?? undefined,
    nextMeterReading: row.nextMeterReading ?? undefined,
    checklist: row.checklist ?? undefined,
    estimatedDurationMinutes: Number(row.estimatedDurationMinutes ?? 0),
    requiredRoleId: row.requiredRoleId ?? undefined,
    requiredRoleName: row.requiredRoleName ?? undefined,
    triggerType: row.triggerType ?? "CALENDAR",
    leadTimeDays: Number(row.leadTimeDays ?? 14),
    gracePeriodDays: Number(row.gracePeriodDays ?? 0),
    autoGenerateWorkOrder: Boolean(row.autoGenerateWorkOrder),
    priority: row.priority ?? "MEDIUM",
    preferredTechnicianId: row.preferredTechnicianId ?? undefined,
    preferredTechnicianName: row.preferredTechnicianName ?? undefined,
    plannedDowntimeMinutes: Number(row.plannedDowntimeMinutes ?? 0),
    lastGeneratedAt: row.lastGeneratedAt ?? undefined,
    currentMeterReading: row.currentMeterReading ?? undefined,
    status: row.status,
    lastCompletedDate: row.lastCompletedDate ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    executions: parseJsonArray(row.executions).map((entry) => mapPMExecution(entry as PMExecutionRow)),
    tasks: parseJsonArray(row.tasks).map((entry) => entry as PreventiveMaintenancePlan["tasks"][number]),
    plannedSpares: parseJsonArray(row.plannedSpares).map((entry) => entry as PreventiveMaintenancePlan["plannedSpares"][number]),
    scheduleChanges: parseJsonArray(row.scheduleChanges).map((entry) => entry as PreventiveMaintenancePlan["scheduleChanges"][number]),
  };
}

async function fetchPMPlans() {
  const rows = await sql<PMPlanRow[]>`
    SELECT
      plan.id,
      plan."publicId",
      plan."planNo",
      plan."assetId",
      asset."locationId",
      asset."assetCode",
      asset."assetName",
      plan.title,
      plan."maintenanceType"::text AS "maintenanceType",
      plan."frequencyType"::text AS "frequencyType",
      plan."frequencyValue",
      plan."nextDueDate"::text AS "nextDueDate",
      plan."meterInterval",
      plan."nextMeterReading",
      plan.checklist,
      plan."estimatedDurationMinutes",
      plan."requiredRoleId",
      role.name AS "requiredRoleName",
      plan."triggerType"::text AS "triggerType",
      plan."leadTimeDays",
      plan."gracePeriodDays",
      plan."autoGenerateWorkOrder",
      plan.priority::text AS priority,
      plan."preferredTechnicianId",
      technician.name AS "preferredTechnicianName",
      plan."plannedDowntimeMinutes",
      plan."lastGeneratedAt"::text AS "lastGeneratedAt",
      asset."currentMeterReading",
      plan.status::text AS status,
      plan."lastCompletedDate"::text AS "lastCompletedDate",
      plan."createdAt"::text AS "createdAt",
      plan."updatedAt"::text AS "updatedAt",
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', exec.id,
          'planId', exec."planId",
          'workOrderId', exec."workOrderId",
          'workOrderNo', wo."workOrderNo",
          'scheduledDate', exec."scheduledDate"::text,
          'completedDate', exec."completedDate"::text,
          'meterReading', exec."meterReading",
          'triggerType', exec."triggerType"::text,
          'triggerValue', exec."triggerValue",
          'status', exec.status::text,
          'result', exec.result,
          'remarks', exec.remarks,
          'createdAt', exec."createdAt"::text,
          'updatedAt', exec."updatedAt"::text
        ) ORDER BY exec."scheduledDate" DESC)
        FROM "PreventiveMaintenanceExecution" exec
        LEFT JOIN "MaintenanceWorkOrder" wo ON wo.id = exec."workOrderId"
        WHERE exec."planId" = plan.id
      ), '[]'::json) AS executions
      , COALESCE((
        SELECT json_agg(json_build_object(
          'id', task.id, 'sequence', task.sequence, 'task', task.task,
          'instructions', task.instructions, 'isMandatory', task."isMandatory",
          'expectedResult', task."expectedResult"
        ) ORDER BY task.sequence, task."createdAt")
        FROM "PreventiveMaintenancePlanTask" task WHERE task."planId" = plan.id
      ), '[]'::json) AS tasks
      , COALESCE((
        SELECT json_agg(json_build_object(
          'id', spare.id, 'itemId', spare."itemId", 'itemCode', item."itemCode",
          'itemName', item."itemName", 'quantity', spare.quantity,
          'availableQuantity', COALESCE(balance."availableQuantity", 0), 'remarks', spare.remarks
        ) ORDER BY item."itemCode")
        FROM "PreventiveMaintenancePlanSpare" spare
        INNER JOIN "Item" item ON item.id = spare."itemId"
        LEFT JOIN "StockBalance" balance ON balance."itemId" = spare."itemId" AND balance."locationId" = asset."locationId"
        WHERE spare."planId" = plan.id
      ), '[]'::json) AS "plannedSpares"
      , COALESCE((
        SELECT json_agg(json_build_object(
          'id', change.id, 'previousDueDate', change."previousDueDate"::text,
          'requestedDueDate', change."requestedDueDate"::text, 'reason', change.reason,
          'status', change.status, 'requestedById', change."requestedById",
          'requestedAt', change."requestedAt"::text, 'remarks', change.remarks
        ) ORDER BY change."requestedAt" DESC)
        FROM "PreventiveMaintenanceScheduleChange" change WHERE change."planId" = plan.id
      ), '[]'::json) AS "scheduleChanges"
    FROM "PreventiveMaintenancePlan" plan
    INNER JOIN "Asset" asset ON asset.id = plan."assetId"
    LEFT JOIN "Role" role ON role.id = plan."requiredRoleId"
    LEFT JOIN "User" technician ON technician.id = plan."preferredTechnicianId"
    ORDER BY COALESCE(plan."nextDueDate", plan."createdAt") ASC, plan."planNo" ASC
  `;
  return rows.map(mapPMPlan);
}

export async function getPreventiveMaintenancePlans() {
  try {
    return await fetchPMPlans();
  } catch (error) {
    mapReadError(error, "Failed to load preventive maintenance plans");
    return [];
  }
}

export async function getPreventiveMaintenancePlanById(id: string) {
  try {
    const rows = await fetchPMPlans();
    return rows.find((entry) => (isPublicIdParam(id) ? entry.publicId === Number(id) : entry.id === id)) ?? null;
  } catch (error) {
    mapReadError(error, "Failed to load preventive maintenance plan");
    return null;
  }
}

export async function getPreventiveMaintenanceDuePlans() {
  try {
    const plans = await fetchPMPlans();
    return plans.flatMap((entry) => {
      const dueReason = evaluatePreventiveMaintenanceDue(entry);
      return dueReason ? [{ ...entry, dueReason }] : [];
    });
  } catch (error) {
    mapReadError(error, "Failed to load due preventive maintenance plans");
    return [];
  }
}

export type PreventiveMaintenanceHistoryRow = {
  id: string;
  planId: string;
  planNo: string;
  assetId: string;
  assetCode: string | null;
  assetName: string | null;
  locationId: string;
  title: string;
  scheduledDate: string;
  completedDate: string | null;
  workOrderId: string | null;
  workOrderNo: string | null;
  triggerType: string;
  status: string;
  result: string | null;
  remarks: string | null;
};

export async function getPreventiveMaintenanceHistory(): Promise<PreventiveMaintenanceHistoryRow[]> {
  try {
    return await sql<PreventiveMaintenanceHistoryRow[]>`
      SELECT
        execution.id,
        plan.id AS "planId",
        plan."planNo",
        asset.id AS "assetId",
        asset."assetCode",
        asset."assetName",
        asset."locationId",
        plan.title,
        execution."scheduledDate"::text AS "scheduledDate",
        execution."completedDate"::text AS "completedDate",
        execution."workOrderId",
        wo."workOrderNo",
        execution."triggerType"::text AS "triggerType",
        execution.status::text AS status,
        execution.result,
        execution.remarks
      FROM "PreventiveMaintenanceExecution" execution
      INNER JOIN "PreventiveMaintenancePlan" plan ON plan.id = execution."planId"
      INNER JOIN "Asset" asset ON asset.id = plan."assetId"
      LEFT JOIN "MaintenanceWorkOrder" wo ON wo.id = execution."workOrderId"
      WHERE execution.status IN ('COMPLETED', 'MISSED', 'CANCELLED')
      ORDER BY COALESCE(execution."completedDate", execution."scheduledDate") DESC, plan."planNo" DESC
    `;
  } catch (error) {
    mapReadError(error, "Failed to load preventive maintenance history");
    return [];
  }
}

export async function generateDuePreventiveMaintenanceWorkOrders(input: {
  createdById: string;
  planIds?: string[];
}) {
  const generated: Array<{ planId: string; workOrderId: string; workOrderNo: string }> = [];
  await sql.begin(async (tx) => {
    const requestedPlanIds = (input.planIds ?? []).map((id) => normalizeText(id)).filter((id): id is string => Boolean(id));
    const plans = await tx<Array<{
      id: string;
      planNo: string;
      assetId: string;
      locationId: string;
      title: string;
      maintenanceType: string;
      nextDueDate: string | null;
      estimatedDurationMinutes: number;
      checklist: string | null;
      triggerType: string;
      triggerValue: number | null;
      priority: string;
      preferredTechnicianId: string | null;
      plannedDowntimeMinutes: number;
    }>>`
      SELECT plan.id, plan."planNo", plan."assetId", asset."locationId", plan.title,
        plan."maintenanceType"::text AS "maintenanceType", plan."nextDueDate"::text AS "nextDueDate",
        plan."estimatedDurationMinutes", plan.checklist, plan."triggerType"::text AS "triggerType",
        asset."currentMeterReading" AS "triggerValue", plan.priority::text AS priority,
        plan."preferredTechnicianId", plan."plannedDowntimeMinutes"
      FROM "PreventiveMaintenancePlan" plan
      INNER JOIN "Asset" asset ON asset.id = plan."assetId"
      WHERE plan.status = 'ACTIVE'
        AND plan."autoGenerateWorkOrder" = true
        AND (
          (plan."triggerType" IN ('CALENDAR','HYBRID') AND plan."nextDueDate" IS NOT NULL
            AND plan."nextDueDate" <= NOW() + (plan."leadTimeDays" * INTERVAL '1 day'))
          OR
          (plan."triggerType" IN ('METER','HYBRID') AND plan."nextMeterReading" IS NOT NULL
            AND asset."currentMeterReading" IS NOT NULL AND asset."currentMeterReading" >= plan."nextMeterReading")
        )
        AND (${requestedPlanIds.length === 0} OR plan.id = ANY(${requestedPlanIds}))
        AND NOT EXISTS (
          SELECT 1 FROM "PreventiveMaintenanceExecution" execution
          INNER JOIN "MaintenanceWorkOrder" work_order ON work_order.id = execution."workOrderId"
          WHERE execution."planId" = plan.id
            AND work_order.status NOT IN ('CLOSED', 'CANCELLED', 'REJECTED')
        )
      ORDER BY plan."nextDueDate" ASC NULLS FIRST
      FOR UPDATE OF plan
    `;

    for (const plan of plans) {
      const workOrderId = randomUUID();
      const workOrderNo = await nextMaintenanceDocumentNumber(tx, "WO", "Maintenance Work Order");
      const scheduledStart = plan.nextDueDate ? new Date(plan.nextDueDate) : new Date();
      const scheduledEnd = new Date(scheduledStart.getTime() + Math.max(30, Number(plan.estimatedDurationMinutes ?? 0)) * 60_000);
      await tx`
        INSERT INTO "MaintenanceWorkOrder" (
          id, "workOrderNo", "assetId", "locationId", "workType", priority,
          "scheduledStart", "scheduledEnd", "problemDescription", status, "assignedTechnicianId",
          "totalSpareCost", "totalLaborCost", "totalExternalCost", "totalCost", "createdById", "createdAt", "updatedAt"
        ) VALUES (
          ${workOrderId}, ${workOrderNo}, ${plan.assetId}, ${plan.locationId}, ${plan.maintenanceType}, ${plan.priority},
          ${scheduledStart.toISOString()}, ${scheduledEnd.toISOString()},
          ${`Scheduled PM ${plan.planNo}: ${plan.title}${plan.checklist ? `\nChecklist: ${plan.checklist}` : ""}`},
          'DRAFT', ${plan.preferredTechnicianId}, 0, 0, 0, 0, ${input.createdById}, NOW(), NOW()
        )
      `;
      const executionId = randomUUID();
      await tx`
        INSERT INTO "PreventiveMaintenanceExecution" (
          id, "planId", "workOrderId", "scheduledDate", "meterReading", "triggerType", "triggerValue", remarks, "createdAt", "updatedAt"
        ) VALUES (${executionId}, ${plan.id}, ${workOrderId}, ${scheduledStart.toISOString()}, ${plan.triggerValue}, ${plan.triggerType}, ${plan.triggerValue}, 'Generated from due preventive maintenance plan', NOW(), NOW())
      `;
      await tx`
        INSERT INTO "PreventiveMaintenanceChecklistResult" (id, "executionId", "taskId", "createdAt", "updatedAt")
        SELECT gen_random_uuid()::text, ${executionId}, task.id, NOW(), NOW()
        FROM "PreventiveMaintenancePlanTask" task WHERE task."planId" = ${plan.id}
      `;
      await tx`
        INSERT INTO "MaintenanceWorkOrderPart" (
          id, "workOrderId", "itemId", "requestedQty", "unresolvedQty", remarks, "createdAt", "updatedAt"
        )
        SELECT gen_random_uuid()::text, ${workOrderId}, spare."itemId", spare.quantity, 0,
          COALESCE(spare.remarks, 'Planned preventive maintenance spare'), NOW(), NOW()
        FROM "PreventiveMaintenancePlanSpare" spare WHERE spare."planId" = ${plan.id}
      `;
      await tx`UPDATE "PreventiveMaintenancePlan" SET "lastGeneratedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${plan.id}`;
      await writeMaintenanceAudit(tx, input.createdById, "GENERATE_PM_WORK_ORDER", workOrderId, {
        planId: plan.id,
        planNo: plan.planNo,
        workOrderNo,
        scheduledStart: scheduledStart.toISOString(),
      });
      await writeMaintenanceHistory(tx, "maintenance.work-order", workOrderId, "CREATE_FROM_PM", input.createdById, `Generated from ${plan.planNo}`);
      generated.push({ planId: plan.id, workOrderId, workOrderNo });
    }
  });
  return generated;
}

export async function getPreventiveMaintenanceCalendarPlans() {
  try {
    const plans = await fetchPMPlans();
    return plans.filter((entry) => entry.nextDueDate && ["ACTIVE", "DRAFT", "PAUSED"].includes(entry.status));
  } catch (error) {
    mapReadError(error, "Failed to load preventive maintenance calendar");
    return [];
  }
}

export async function createPreventiveMaintenancePlan(input: PreventiveMaintenancePlanInput) {
  try {
    const assetId = normalizeText(input.assetId);
    const title = normalizeText(input.title);
    const maintenanceType = normalizeCode(input.maintenanceType);
    const frequencyType = normalizeCode(input.frequencyType);
    if (!assetId || !title || !maintenanceType || !frequencyType) {
      throw new Error("Asset, title, maintenance type, and frequency are required");
    }

    let id = "";
    await sql.begin(async (tx) => {
      id = randomUUID();
      const planNo = await nextMaintenanceDocumentNumber(tx, "PM", "Preventive Maintenance Plan");
      await tx`
        INSERT INTO "PreventiveMaintenancePlan" (
          id, "planNo", "assetId", title, "maintenanceType", "frequencyType", "frequencyValue",
          "nextDueDate", "meterInterval", "nextMeterReading", checklist, "estimatedDurationMinutes",
          "requiredRoleId", "triggerType", "leadTimeDays", "gracePeriodDays", "autoGenerateWorkOrder",
          priority, "preferredTechnicianId", "plannedDowntimeMinutes", status, "lastCompletedDate", "createdAt", "updatedAt"
        )
        VALUES (
          ${id},
          ${planNo},
          ${assetId},
          ${title},
          ${maintenanceType},
          ${frequencyType},
          ${Math.max(1, Number(input.frequencyValue ?? 1))},
          ${normalizeDate(input.nextDueDate)},
          ${normalizeNumber(input.meterInterval)},
          ${normalizeNumber(input.nextMeterReading)},
          ${normalizeText(input.checklist)},
          ${Math.max(0, Number(input.estimatedDurationMinutes ?? 0))},
          ${normalizeText(input.requiredRoleId)},
          ${normalizeCode(input.triggerType) ?? "CALENDAR"},
          ${Math.max(0, Number(input.leadTimeDays ?? 14))},
          ${Math.max(0, Number(input.gracePeriodDays ?? 0))},
          ${input.autoGenerateWorkOrder !== false},
          ${normalizeCode(input.priority) ?? "MEDIUM"},
          ${normalizeText(input.preferredTechnicianId)},
          ${Math.max(0, Number(input.plannedDowntimeMinutes ?? 0))},
          ${normalizeCode(input.status) ?? "DRAFT"},
          ${normalizeDate(input.lastCompletedDate)},
          NOW(),
          NOW()
        )
      `;
      for (const [index, task] of (input.tasks ?? []).entries()) {
        const taskName = normalizeText(task.task);
        if (!taskName) continue;
        await tx`INSERT INTO "PreventiveMaintenancePlanTask" (id,"planId",sequence,task,instructions,"isMandatory","expectedResult","createdAt","updatedAt") VALUES (${randomUUID()},${id},${index + 1},${taskName},${normalizeText(task.instructions)},${task.isMandatory !== false},${normalizeText(task.expectedResult)},NOW(),NOW())`;
      }
      for (const spare of input.plannedSpares ?? []) {
        const itemId = normalizeText(spare.itemId);
        const quantity = Math.max(0, Number(spare.quantity ?? 0));
        if (!itemId || quantity <= 0) continue;
        await tx`INSERT INTO "PreventiveMaintenancePlanSpare" (id,"planId","itemId",quantity,remarks,"createdAt","updatedAt") VALUES (${randomUUID()},${id},${itemId},${quantity},${normalizeText(spare.remarks)},NOW(),NOW()) ON CONFLICT ("planId","itemId") DO UPDATE SET quantity=EXCLUDED.quantity, remarks=EXCLUDED.remarks, "updatedAt"=NOW()`;
      }
    });

    return getPreventiveMaintenancePlanById(id);
  } catch (error) {
    mapWriteError(error, "Failed to create preventive maintenance plan");
  }
}

export async function updatePreventiveMaintenancePlan(id: string, input: PreventiveMaintenancePlanInput) {
  try {
    const assetId = normalizeText(input.assetId);
    const title = normalizeText(input.title);
    const maintenanceType = normalizeCode(input.maintenanceType);
    const frequencyType = normalizeCode(input.frequencyType);
    if (!assetId || !title || !maintenanceType || !frequencyType) {
      throw new Error("Asset, title, maintenance type, and frequency are required");
    }

    await sql.begin(async (tx) => {
      await tx`
        UPDATE "PreventiveMaintenancePlan"
      SET
        "assetId" = ${assetId},
        title = ${title},
        "maintenanceType" = ${maintenanceType},
        "frequencyType" = ${frequencyType},
        "frequencyValue" = ${Math.max(1, Number(input.frequencyValue ?? 1))},
        "nextDueDate" = ${normalizeDate(input.nextDueDate)},
        "meterInterval" = ${normalizeNumber(input.meterInterval)},
        "nextMeterReading" = ${normalizeNumber(input.nextMeterReading)},
        checklist = ${normalizeText(input.checklist)},
        "estimatedDurationMinutes" = ${Math.max(0, Number(input.estimatedDurationMinutes ?? 0))},
        "requiredRoleId" = ${normalizeText(input.requiredRoleId)},
        "triggerType" = ${normalizeCode(input.triggerType) ?? "CALENDAR"},
        "leadTimeDays" = ${Math.max(0, Number(input.leadTimeDays ?? 14))},
        "gracePeriodDays" = ${Math.max(0, Number(input.gracePeriodDays ?? 0))},
        "autoGenerateWorkOrder" = ${input.autoGenerateWorkOrder !== false},
        priority = ${normalizeCode(input.priority) ?? "MEDIUM"},
        "preferredTechnicianId" = ${normalizeText(input.preferredTechnicianId)},
        "plannedDowntimeMinutes" = ${Math.max(0, Number(input.plannedDowntimeMinutes ?? 0))},
        status = ${normalizeCode(input.status) ?? "DRAFT"},
        "lastCompletedDate" = ${normalizeDate(input.lastCompletedDate)},
        "updatedAt" = NOW()
      WHERE id = ${id}
      `;
      await tx`DELETE FROM "PreventiveMaintenancePlanTask" WHERE "planId"=${id}`;
      for (const [index, task] of (input.tasks ?? []).entries()) {
        const taskName = normalizeText(task.task);
        if (!taskName) continue;
        await tx`INSERT INTO "PreventiveMaintenancePlanTask" (id,"planId",sequence,task,instructions,"isMandatory","expectedResult","createdAt","updatedAt") VALUES (${randomUUID()},${id},${index + 1},${taskName},${normalizeText(task.instructions)},${task.isMandatory !== false},${normalizeText(task.expectedResult)},NOW(),NOW())`;
      }
      await tx`DELETE FROM "PreventiveMaintenancePlanSpare" WHERE "planId"=${id}`;
      for (const spare of input.plannedSpares ?? []) {
        const itemId = normalizeText(spare.itemId);
        const quantity = Math.max(0, Number(spare.quantity ?? 0));
        if (!itemId || quantity <= 0) continue;
        await tx`INSERT INTO "PreventiveMaintenancePlanSpare" (id,"planId","itemId",quantity,remarks,"createdAt","updatedAt") VALUES (${randomUUID()},${id},${itemId},${quantity},${normalizeText(spare.remarks)},NOW(),NOW())`;
      }
    });

    return getPreventiveMaintenancePlanById(id);
  } catch (error) {
    mapWriteError(error, "Failed to update preventive maintenance plan");
  }
}

export async function getPreventiveMaintenanceChecklist(workOrderId: string) {
  return sql<Array<{
    id: string; executionId: string; taskId: string; sequence: number; task: string;
    instructions: string | null; isMandatory: boolean; expectedResult: string | null;
    completed: boolean; result: string | null; reading: string | null; remarks: string | null;
    completedById: string | null; completedByName: string | null; completedAt: string | null;
  }>>`
    SELECT result.id, result."executionId", result."taskId", task.sequence, task.task,
      task.instructions, task."isMandatory", task."expectedResult", result.completed,
      result.result, result.reading, result.remarks, result."completedById",
      technician.name AS "completedByName", result."completedAt"::text AS "completedAt"
    FROM "PreventiveMaintenanceExecution" execution
    INNER JOIN "PreventiveMaintenanceChecklistResult" result ON result."executionId" = execution.id
    INNER JOIN "PreventiveMaintenancePlanTask" task ON task.id = result."taskId"
    LEFT JOIN "User" technician ON technician.id = result."completedById"
    WHERE execution."workOrderId" = ${workOrderId}
    ORDER BY task.sequence, task."createdAt"
  `;
}

export async function recordPreventiveMaintenanceChecklist(input: {
  workOrderId: string;
  resultId: string;
  completed: boolean;
  result?: string | null;
  reading?: string | null;
  remarks?: string | null;
  performedById: string;
}) {
  const rows = await sql<Array<{ id: string }>>`
    UPDATE "PreventiveMaintenanceChecklistResult" checklist
    SET completed=${Boolean(input.completed)}, result=${normalizeText(input.result)}, reading=${normalizeText(input.reading)},
      remarks=${normalizeText(input.remarks)}, "completedById"=${input.completed ? input.performedById : null},
      "completedAt"=${input.completed ? new Date() : null}, "updatedAt"=NOW()
    FROM "PreventiveMaintenanceExecution" execution
    WHERE checklist.id=${input.resultId} AND checklist."executionId"=execution.id
      AND execution."workOrderId"=${input.workOrderId}
    RETURNING checklist.id
  `;
  if (!rows.length) throw new Error("Preventive-maintenance checklist task not found for this work order");
  await writeMaintenanceAudit(sql, input.performedById, "RECORD_PM_CHECKLIST", input.workOrderId, {
    resultId: input.resultId, completed: input.completed, result: normalizeText(input.result), reading: normalizeText(input.reading),
  });
  return getPreventiveMaintenanceChecklist(input.workOrderId);
}

export async function requestPreventiveMaintenanceReschedule(input: {
  planId: string;
  requestedDueDate: string;
  reason: string;
  requestedById: string;
  remarks?: string | null;
}) {
  const reason = normalizeText(input.reason);
  const requestedDueDate = normalizeDate(input.requestedDueDate);
  if (!reason || !requestedDueDate) throw new Error("Requested due date and reason are required");
  const date = new Date(requestedDueDate);
  if (!Number.isFinite(date.getTime())) throw new Error("Requested due date is invalid");
  const rows = await sql<Array<{ id: string; nextDueDate: string | null; executionId: string | null }>>`
    SELECT plan.id, plan."nextDueDate"::text AS "nextDueDate", execution.id AS "executionId"
    FROM "PreventiveMaintenancePlan" plan
    LEFT JOIN LATERAL (
      SELECT id FROM "PreventiveMaintenanceExecution"
      WHERE "planId"=plan.id AND status IN ('SCHEDULED','IN_PROGRESS') ORDER BY "scheduledDate" DESC LIMIT 1
    ) execution ON true
    WHERE plan.id=${input.planId} AND plan.status IN ('ACTIVE','PAUSED')
      AND NOT EXISTS (SELECT 1 FROM "PreventiveMaintenanceScheduleChange" change WHERE change."planId"=plan.id AND change.status IN ('PENDING','CHECKED'))
  `;
  if (!rows.length) throw new Error("Plan not found, inactive, or already has a pending schedule-change request");
  const previousDueDate = rows[0].nextDueDate;
  if (!previousDueDate) throw new Error("This plan has no calendar due date to reschedule");
  const id = randomUUID();
  await sql`INSERT INTO "PreventiveMaintenanceScheduleChange" (id,"planId","executionId","previousDueDate","requestedDueDate",reason,status,"requestedById","requestedAt",remarks,"updatedAt") VALUES (${id},${input.planId},${rows[0].executionId},${previousDueDate},${date.toISOString()},${reason},'PENDING',${input.requestedById},NOW(),${normalizeText(input.remarks)},NOW())`;
  await writeMaintenanceAudit(sql, input.requestedById, "REQUEST_PM_RESCHEDULE", input.planId, { scheduleChangeId: id, previousDueDate, requestedDueDate: date.toISOString(), reason });
  return { id, status: "PENDING" };
}

export async function transitionPreventiveMaintenanceReschedule(input: {
  changeId: string;
  action: "check" | "approve" | "reject";
  performedById: string;
  remarks?: string | null;
}) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; planId: string; executionId: string | null; status: string; requestedById: string; checkedById: string | null; requestedDueDate: string }>>`
      SELECT id,"planId","executionId",status,"requestedById","checkedById","requestedDueDate"::text AS "requestedDueDate"
      FROM "PreventiveMaintenanceScheduleChange" WHERE id=${input.changeId} FOR UPDATE
    `;
    const change = rows[0];
    if (!change) throw new Error("Schedule-change request not found");
    if (change.requestedById === input.performedById) throw new Error("The requester cannot check, approve, or reject their own schedule change");
    if (input.action === "check") {
      if (change.status !== "PENDING") throw new Error("Only a pending schedule change can be checked");
      await tx`UPDATE "PreventiveMaintenanceScheduleChange" SET status='CHECKED',"checkedById"=${input.performedById},"checkedAt"=NOW(),remarks=COALESCE(${normalizeText(input.remarks)},remarks),"updatedAt"=NOW() WHERE id=${input.changeId}`;
    } else if (input.action === "approve") {
      if (change.status !== "CHECKED") throw new Error("Schedule change must be checked before approval");
      if (change.checkedById === input.performedById) throw new Error("Checker and approver must be different users");
      await tx`UPDATE "PreventiveMaintenanceScheduleChange" SET status='APPROVED',"approvedById"=${input.performedById},"approvedAt"=NOW(),remarks=COALESCE(${normalizeText(input.remarks)},remarks),"updatedAt"=NOW() WHERE id=${input.changeId}`;
      await tx`UPDATE "PreventiveMaintenancePlan" SET "nextDueDate"=${change.requestedDueDate},"updatedAt"=NOW() WHERE id=${change.planId}`;
      if (change.executionId) {
        await tx`UPDATE "PreventiveMaintenanceExecution" SET "scheduledDate"=${change.requestedDueDate},"updatedAt"=NOW() WHERE id=${change.executionId}`;
        await tx`UPDATE "MaintenanceWorkOrder" wo SET "scheduledEnd"=${change.requestedDueDate}::timestamp + (wo."scheduledEnd"-wo."scheduledStart"),"scheduledStart"=${change.requestedDueDate},"updatedAt"=NOW() FROM "PreventiveMaintenanceExecution" execution WHERE execution.id=${change.executionId} AND wo.id=execution."workOrderId" AND wo.status IN ('DRAFT','SUBMITTED','CHECKED','APPROVED','ASSIGNED')`;
      }
    } else {
      if (!["PENDING", "CHECKED"].includes(change.status)) throw new Error("Only a pending or checked schedule change can be rejected");
      await tx`UPDATE "PreventiveMaintenanceScheduleChange" SET status='REJECTED',"rejectedById"=${input.performedById},"rejectedAt"=NOW(),remarks=COALESCE(${normalizeText(input.remarks)},remarks),"updatedAt"=NOW() WHERE id=${input.changeId}`;
    }
    await writeMaintenanceAudit(tx, input.performedById, `${input.action.toUpperCase()}_PM_RESCHEDULE`, change.planId, { scheduleChangeId: input.changeId, remarks: normalizeText(input.remarks) });
    return { id: input.changeId, status: input.action === "check" ? "CHECKED" : input.action === "approve" ? "APPROVED" : "REJECTED" };
  });
}

export async function getPreventiveMaintenanceScheduleChangeScope(changeId: string) {
  const rows = await sql<Array<{ locationId: string }>>`
    SELECT asset."locationId" FROM "PreventiveMaintenanceScheduleChange" change
    INNER JOIN "PreventiveMaintenancePlan" plan ON plan.id=change."planId"
    INNER JOIN "Asset" asset ON asset.id=plan."assetId"
    WHERE change.id=${changeId} LIMIT 1
  `;
  return rows[0] ?? null;
}
