import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { inventoryScrapRejectedQCStock } from "@/services/inventory/module-integration.service";
import {
  nextProductionDocumentNumber,
  normalizeHoldStatus,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";

export async function listHoldReleases() {
  try {
    return await sql<Array<{
      id: string;
      holdNo: string;
      productionBatchId: string | null;
      batchNo: string | null;
      itemCode: string;
      itemName: string;
      locationName: string;
      quantity: number;
      holdReason: string;
      status: string;
      releasedAt: string | null;
    }>>`
      SELECT
        qh.id,
        qh."holdNo",
        qh."productionBatchId",
        pb."batchNo" AS "batchNo",
        i."itemCode" AS "itemCode",
        i."itemName" AS "itemName",
        l."locationName",
        qh.quantity,
        qh."holdReason",
        qh.status::text AS status,
        qh."releasedAt"::text AS "releasedAt"
      FROM "QCHoldRelease" qh
      INNER JOIN "Item" i ON i.id = qh."itemId"
      INNER JOIN "Location" l ON l.id = qh."locationId"
      LEFT JOIN "ProductionBatch" pb ON pb.id = qh."productionBatchId"
      ORDER BY qh."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

async function canReleaseHold(holdId: string) {
  const rows = await sql<Array<{ latestResult: string | null }>>`
    SELECT qt.result::text AS "latestResult"
    FROM "QCHoldRelease" qh
    LEFT JOIN "QCTest" qt
      ON (qt."productionBatchId" = qh."productionBatchId" OR (qt."productionBatchId" IS NULL AND qt."itemId" = qh."itemId"))
    WHERE qh.id = ${holdId}
    ORDER BY qt."sampleDate" DESC NULLS LAST, qt."createdAt" DESC NULLS LAST
    LIMIT 1
  `;
  const latest = rows[0]?.latestResult;
  return latest === null || latest === "PASSED";
}

export async function createQCHoldRelease(payload: {
  productionBatchId?: string | null;
  itemId: string;
  locationId: string;
  quantity: number;
  holdReason: string;
  remarks?: string;
  createdById: string;
}, options?: { tx?: typeof sql }) {
  const db = options?.tx ?? sql;
  const exec = async (tx: typeof sql) => {
    const id = randomUUID();
    const holdNo = await nextProductionDocumentNumber(tx, "QCH", "QC Hold");
    await tx`
      INSERT INTO "QCHoldRelease" (
        id, "holdNo", "productionBatchId", "itemId", "locationId", quantity, "holdReason", status, remarks, "createdById", "createdAt"
      )
      VALUES (
        ${id},
        ${holdNo},
        ${payload.productionBatchId ?? null},
        ${payload.itemId},
        ${payload.locationId},
        ${Number(payload.quantity)},
        ${payload.holdReason},
        'ON_HOLD',
        ${payload.remarks ?? null},
        ${payload.createdById},
        NOW()
      )
    `;
    await writeProductionAudit(tx, payload.createdById, "qc.hold-release", "CREATE", id, payload);
    await writeProductionHistory(tx, "qc.hold-release", id, "CREATE", payload.createdById, holdNo);
    return { id, holdNo };
  };

  if (options?.tx) {
    return exec(db);
  }

  return sql.begin(exec);
}

export async function releaseQCHold(id: string, userId: string) {
  const allowed = await canReleaseHold(id);
  if (!allowed) {
    throw new Error("QC failed output cannot be released until a passing QC result is recorded");
  }

  await sql.begin(async (tx) => {
    await tx`
      UPDATE "QCHoldRelease"
      SET status = 'RELEASED', "releasedById" = ${userId}, "releasedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.hold-release", "RELEASE", id, { id });
    await writeProductionHistory(tx, "qc.hold-release", id, "RELEASE", userId, "QC hold released");
  });
  return { id };
}

export async function rejectQCHold(id: string, userId: string) {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "QCHoldRelease"
      SET status = 'REJECTED', "releasedById" = ${userId}, "releasedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.hold-release", "REJECT", id, { id });
    await writeProductionHistory(tx, "qc.hold-release", id, "REJECT", userId, "QC hold rejected");
  });
  return { id };
}

export async function scrapQCHold(id: string, userId: string) {
  const rows = await sql<Array<{ itemId: string; locationId: string; quantity: number }>>`
    SELECT "itemId", "locationId", quantity
    FROM "QCHoldRelease"
    WHERE id = ${id}
    LIMIT 1
  `;
  const hold = rows[0];
  if (!hold) throw new Error("QC hold not found");

  await sql.begin(async (tx) => {
    await inventoryScrapRejectedQCStock({
      itemId: hold.itemId,
      locationId: hold.locationId,
      quantity: Number(hold.quantity),
      unitCost: 0,
      qcDocumentId: id,
      createdById: userId,
      remarks: "QC hold scrapped",
    });
    await tx`
      UPDATE "QCHoldRelease"
      SET status = 'SCRAPPED', "releasedById" = ${userId}, "releasedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.hold-release", "SCRAP", id, { id });
    await writeProductionHistory(tx, "qc.hold-release", id, "SCRAP", userId, "QC hold scrapped");
  });
  return { id };
}
