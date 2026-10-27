import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { runWithTransientDbRetry } from "@/tests/_db-test-utils";
import { createAsset, createMaintenanceTicket, createWorkOrder } from "@/services/maintenance/maintenance.service";
import { startShiftSession } from "@/services/shift/shift-session.service";

import {
  closeTestDatabase,
  createInventoryTestContext,
  ensureStock,
  type InventoryTestContext,
} from "../inventory/_helpers";
import { createProductionTestContext } from "../production/_helpers";

export interface MaintenanceTestContext extends InventoryTestContext {
  assetTypeId: string;
  assetId: string;
  ticketId: string;
  workOrderId: string;
}

function nextMaintenanceTestCode(prefix: string) {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function ensureAssetType() {
  const existing = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "AssetType"
    WHERE "isArchived" = false
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  if (existing[0]?.id) {
    return existing[0].id;
  }

  const id = randomUUID();
  await sql`
    INSERT INTO "AssetType" (
      id, code, name, description, "isActive", "isArchived", "createdAt"
    )
    VALUES (
      ${id},
      ${`AT-${Date.now()}`},
      'Test Asset Type',
      'Maintenance test asset type',
      true,
      false,
      NOW()
    )
  `;
  return id;
}

export async function createMaintenanceTestContext(): Promise<MaintenanceTestContext> {
  return runWithTransientDbRetry(async () => {
    const inventory = await createInventoryTestContext();
    await seedMaintenanceGlSettings();
    const assetTypeId = await ensureAssetType();

    const asset = await createAsset({
      assetCode: `AST-${Date.now()}-${randomUUID().slice(0, 4).toUpperCase()}`,
      assetName: "Maintenance Test Asset",
      assetTypeId,
      locationId: inventory.sourceLocationId,
      departmentId: inventory.departmentId,
      responsibleUserId: inventory.adminUserId,
      criticality: "HIGH",
      status: "ACTIVE",
      description: "Maintenance integration test asset",
    });

    if (!asset) {
      throw new Error("Failed to create maintenance test asset");
    }

    const ticket = await createMaintenanceTicket({
      ticketNo: nextMaintenanceTestCode("MT"),
      requestDate: new Date().toISOString(),
      assetId: asset.id,
      locationId: inventory.sourceLocationId,
      departmentId: inventory.departmentId,
      requestedById: inventory.adminUserId,
      assignedToId: inventory.secondUserId,
      type: "BREAKDOWN",
      priority: "HIGH",
      problemDescription: "Maintenance test failure",
      status: "ASSIGNED",
      approvalStatus: "APPROVED",
      remarks: "Created by maintenance test helper",
    });

    if (!ticket) {
      throw new Error("Failed to create maintenance test ticket");
    }

    const workOrder = await createWorkOrder({
      workOrderNo: nextMaintenanceTestCode("WO"),
      ticketId: ticket.id,
      assetId: asset.id,
      locationId: inventory.sourceLocationId,
      assignedTechnicianId: inventory.secondUserId,
      supervisorId: inventory.adminUserId,
      workType: "CORRECTIVE",
      priority: "HIGH",
      scheduledStart: new Date().toISOString(),
      scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      problemDescription: "Maintenance test repair",
      status: "ASSIGNED",
      parts: [
        {
          itemId: inventory.itemId,
          requestedQty: 4,
          issuedQty: 0,
          usedQty: 0,
          returnedQty: 0,
          unitCost: 12,
          remarks: "Spare part request",
        },
      ],
      labor: [],
      externalCosts: [],
    });

    if (!workOrder) {
      throw new Error("Failed to create maintenance test work order");
    }

    return {
      ...inventory,
      assetTypeId,
      assetId: asset.id,
      ticketId: ticket.id,
      workOrderId: workOrder.id,
    };
  });
}

export async function seedMaintenanceGlSettings() {
  const accounts = [
    { code: "6100", name: "Maintenance Expense", type: "EXPENSE" },
    { code: "1300", name: "Spare Parts Inventory", type: "ASSET" },
    { code: "2100", name: "External Service Payable", type: "LIABILITY" },
  ] as const;

  for (const account of accounts) {
    await sql`
      INSERT INTO "Account" (
        id, "accountCode", "accountName", "accountType", "isControlAccount", "isActive", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()}, ${account.code}, ${account.name}, ${account.type}::"AccountType", false, true, false, NOW(), NOW()
      )
      ON CONFLICT ("accountCode") DO NOTHING
    `;
  }

  const rows = await sql<Array<{ id: string; accountCode: string }>>`
    SELECT id, "accountCode"
    FROM "Account"
    WHERE "accountCode" IN ('6100', '1300', '2100')
  `;
  const byCode = Object.fromEntries(rows.map((row) => [row.accountCode, row.id]));

  for (const [key, accountCode] of [
    ["expenseAccountId", "6100"],
    ["spareInventoryAccountId", "1300"],
    ["externalServiceAccountId", "2100"],
  ] as const) {
    const value = byCode[accountCode];
    if (!value) throw new Error(`Missing GL account ${accountCode} for maintenance tests`);
    await sql`
      INSERT INTO "ModuleSetting" (id, module, key, value, "isArchived", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, 'maintenance', ${key}, ${value}, false, NOW(), NOW())
      ON CONFLICT ("module", "key") DO UPDATE SET
        value = EXCLUDED.value,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }
}

export async function seedMaintenanceSpareStock(
  context: MaintenanceTestContext,
  quantity: number,
  unitCost = 12,
) {
  await ensureStock(context, quantity, unitCost, context.sourceLocationId);
}

export async function createDowntimeLinkedWorkOrderContext() {
  const production = await createProductionTestContext();
  await seedMaintenanceGlSettings();
  const assetTypeId = await ensureAssetType();
  const dedicatedProductionLocationId = randomUUID();

  await sql`
    INSERT INTO "Location" (
      id, "locationCode", "locationName", "locationType", "isStockLocation", "isProductionLocation",
      "isActive", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${dedicatedProductionLocationId},
      ${`MNT-PRD-${Date.now()}`},
      'Maintenance Downtime Test Floor',
      'PRODUCTION',
      false,
      true,
      true,
      false,
      NOW(),
      NOW()
    )
  `;

  const asset = await createAsset({
    assetCode: `PRD-AST-${Date.now()}-${randomUUID().slice(0, 4).toUpperCase()}`,
    assetName: "Production Line Test Asset",
    assetTypeId,
    locationId: dedicatedProductionLocationId,
    responsibleUserId: production.adminUserId,
    criticality: "CRITICAL",
    status: "UNDER_MAINTENANCE",
  });

  if (!asset) {
    throw new Error("Failed to create downtime-linked asset");
  }

  const session = await startShiftSession({
    productionDate: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000) + Math.floor(Math.random() * 86_400_000)).toISOString(),
    shiftCode: "SHIFT_A",
    locationId: dedicatedProductionLocationId,
    startedById: production.adminUserId,
    attendance: [{ userId: production.adminUserId, role: "Supervisor" }],
  });

  const downtimeId = randomUUID();
  await sql`
    INSERT INTO "ProductionDowntime" (
      id, "shiftSessionId", "locationId", "assetId", "startTime", "endTime", "durationMinutes", reason, remarks, "createdById", "createdAt", "updatedAt"
    )
    VALUES (
        ${downtimeId},
        ${session.id},
      ${dedicatedProductionLocationId},
      ${asset.id},
      NOW() - INTERVAL '45 minutes',
      NOW(),
      45,
      'MACHINE_BREAKDOWN',
      'Maintenance ticket pending',
      ${production.adminUserId},
      NOW(),
      NOW()
    )
  `;

  const ticket = await createMaintenanceTicket({
    ticketNo: nextMaintenanceTestCode("MT"),
    requestDate: new Date().toISOString(),
    assetId: asset.id,
    locationId: dedicatedProductionLocationId,
    requestedById: production.adminUserId,
    assignedToId: production.secondUserId,
    type: "BREAKDOWN",
    priority: "CRITICAL",
    problemDescription: "Production breakdown linked to downtime",
    productionDowntimeId: downtimeId,
    status: "ASSIGNED",
    approvalStatus: "APPROVED",
  });

  if (!ticket) {
    throw new Error("Failed to create downtime-linked ticket");
  }

  const workOrder = await createWorkOrder({
    workOrderNo: nextMaintenanceTestCode("WO"),
    ticketId: ticket.id,
    assetId: asset.id,
    locationId: dedicatedProductionLocationId,
    assignedTechnicianId: production.secondUserId,
    supervisorId: production.adminUserId,
    workType: "CORRECTIVE",
    priority: "CRITICAL",
    scheduledStart: new Date().toISOString(),
    scheduledEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    problemDescription: "Production downtime repair",
    status: "IN_PROGRESS",
    parts: [],
    labor: [],
    externalCosts: [],
  });

  if (!workOrder) {
    throw new Error("Failed to create downtime-linked work order");
  }

  return {
    production,
    asset,
    sessionId: session.id,
    productionLocationId: dedicatedProductionLocationId,
    downtimeId,
    ticketId: ticket.id,
    workOrderId: workOrder.id,
  };
}

export { closeTestDatabase };
