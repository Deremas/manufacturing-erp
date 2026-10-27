import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import type { Tx } from "@/services/production/production-shared.service";

export interface ProductionMachineOption {
  value: string;
  label: string;
  assetCode: string;
  assetName: string;
  locationId: string;
  locationName: string;
  status: string;
}

export async function listProductionMachines(locationId?: string) {
  return sql<ProductionMachineOption[]>`
    SELECT
      a.id AS value,
      CONCAT(a."assetCode", ' - ', a."assetName") AS label,
      a."assetCode",
      a."assetName",
      a."locationId",
      l."locationName",
      a.status::text AS status
    FROM "Asset" a
    INNER JOIN "Location" l ON l.id = a."locationId"
    WHERE a."isProductionAsset" = true
      AND a."isActive" = true
      AND a."isArchived" = false
      AND a.status IN ('ACTIVE', 'ASSIGNED', 'IN_USE')
      ${locationId ? sql`AND a."locationId" = ${locationId}` : sql``}
    ORDER BY a."assetCode" ASC, a."assetName" ASC
  `;
}

export async function assertProductionMachine(
  tx: Tx,
  machineId: string,
  locationId: string,
) {
  const rows = await tx<Array<{
    id: string;
    assetCode: string;
    assetName: string;
    status: string;
    locationId: string;
  }>>`
    SELECT
      id,
      "assetCode",
      "assetName",
      status::text AS status,
      "locationId"
    FROM "Asset"
    WHERE id = ${machineId}
      AND "isProductionAsset" = true
      AND "isActive" = true
      AND "isArchived" = false
    LIMIT 1
  `;
  const machine = rows[0];
  if (!machine) throw new Error("Select an active production machine");
  if (machine.locationId !== locationId) {
    throw new Error("Selected machine does not belong to the production location");
  }
  if (!["ACTIVE", "ASSIGNED", "IN_USE"].includes(machine.status)) {
    throw new Error(`Machine is unavailable while ${machine.status.toLowerCase().replace(/_/g, " ")}`);
  }
  return machine;
}

export async function markMachineInUse(tx: Tx, machineId?: string | null) {
  if (!machineId) return;
  await tx`
    UPDATE "Asset"
    SET status = 'IN_USE', "updatedAt" = NOW()
    WHERE id = ${machineId}
      AND status IN ('ACTIVE', 'ASSIGNED')
  `;
}

export async function restoreMachineIfIdle(tx: Tx, machineId?: string | null) {
  if (!machineId) return;
  const rows = await tx<Array<{ status: string }>>`
    SELECT status::text AS status
    FROM "Asset"
    WHERE id = ${machineId}
    LIMIT 1
    FOR UPDATE
  `;
  if (rows[0]?.status !== "IN_USE") return;

  const busy = await tx<Array<{ n: number }>>`
    SELECT (
      (SELECT COUNT(*) FROM "ProductionMachineAssignment" WHERE "assetId" = ${machineId} AND "releasedAt" IS NULL)
      + (SELECT COUNT(*) FROM "ProductionBatch" WHERE "machineId" = ${machineId} AND status IN ('DRAFT', 'ACTIVE', 'PENDING_QC', 'REWORK'))
      + (SELECT COUNT(*) FROM "ProductionBatchStage" WHERE "machineId" = ${machineId} AND status IN ('ACTIVE', 'ON_HOLD', 'REWORK'))
    )::int AS n
  `;
  if (Number(busy[0]?.n ?? 0) > 0) return;

  const assigned = await tx<Array<{ id: string }>>`
    SELECT id FROM "AssetAssignment"
    WHERE "assetId" = ${machineId} AND status = 'ACTIVE'
    LIMIT 1
  `;
  const nextStatus = assigned[0] ? "ASSIGNED" : "ACTIVE";
  await tx`
    UPDATE "Asset"
    SET status = ${nextStatus}::"AssetStatus", "updatedAt" = NOW()
    WHERE id = ${machineId}
      AND status = 'IN_USE'
  `;
}

export async function syncPrimaryMachineAssignment(
  tx: Tx,
  input: {
    shiftSessionId: string;
    machineId?: string | null;
    locationId: string;
    assignedById: string;
    remarks?: string | null;
  },
) {
  const released = await tx<Array<{ assetId: string }>>`
    UPDATE "ProductionMachineAssignment"
    SET "releasedAt" = COALESCE("releasedAt", NOW()), "updatedAt" = NOW()
    WHERE "shiftSessionId" = ${input.shiftSessionId}
      AND "releasedAt" IS NULL
      ${input.machineId ? tx`AND "assetId" <> ${input.machineId}` : tx``}
    RETURNING "assetId"
  `;

  if (!input.machineId) {
    for (const row of released) await restoreMachineIfIdle(tx, row.assetId);
    return;
  }
  await assertProductionMachine(tx, input.machineId, input.locationId);
  const activeAssignments = await tx<Array<{ shiftSessionId: string }>>`
    SELECT "shiftSessionId"
    FROM "ProductionMachineAssignment"
    WHERE "assetId" = ${input.machineId}
      AND "releasedAt" IS NULL
      AND "shiftSessionId" <> ${input.shiftSessionId}
    LIMIT 1
  `;
  if (activeAssignments[0]) {
    throw new Error("Selected machine is already assigned to another active shift");
  }
  await tx`
    INSERT INTO "ProductionMachineAssignment" (
      id, "shiftSessionId", "assetId", "assignedAt", "releasedAt",
      "assignedById", remarks, "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.shiftSessionId},
      ${input.machineId},
      NOW(),
      NULL,
      ${input.assignedById},
      ${input.remarks ?? null},
      NOW(),
      NOW()
    )
    ON CONFLICT ("shiftSessionId", "assetId") DO UPDATE
    SET
      "assignedAt" = NOW(),
      "releasedAt" = NULL,
      "assignedById" = EXCLUDED."assignedById",
      remarks = EXCLUDED.remarks,
      "updatedAt" = NOW()
  `;
  await markMachineInUse(tx, input.machineId);
  for (const row of released) await restoreMachineIfIdle(tx, row.assetId);
}

export async function releaseShiftMachines(tx: Tx, shiftSessionId: string) {
  const released = await tx<Array<{ assetId: string }>>`
    UPDATE "ProductionMachineAssignment"
    SET "releasedAt" = COALESCE("releasedAt", NOW()), "updatedAt" = NOW()
    WHERE "shiftSessionId" = ${shiftSessionId}
      AND "releasedAt" IS NULL
    RETURNING "assetId"
  `;
  for (const row of released) await restoreMachineIfIdle(tx, row.assetId);
}
