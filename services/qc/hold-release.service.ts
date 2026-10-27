import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { inventoryScrapRejectedQCStock } from "@/services/inventory/module-integration.service";
import { postTransfer } from "@/services/inventory/inventory-posting.service";
import { adjustReservedStock } from "@/services/inventory/reservation.service";
import { syncInventoryLossJournal } from "@/services/accounting/accounting.service";
import { recalculateProductionCost } from "@/services/production/production-costing.service";
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
  const rows = await sql<Array<{
    productionBatchId: string | null;
    blockingCount: number;
    failedCount: number;
    criticalNcCount: number;
    latestLegacyResult: string | null;
    latestLegacyStatus: string | null;
  }>>`
    SELECT
      qh."productionBatchId",
      COUNT(*) FILTER (WHERE task.required = true AND task.status <> 'COMPLETED')::int AS "blockingCount",
      COUNT(*) FILTER (
        WHERE test_type."blocksReleaseOnFail" = true
          AND test.result IS DISTINCT FROM 'PASSED'::"QCResult"
      )::int AS "failedCount",
      (SELECT COUNT(*)::int FROM "QCNonconformity" nc
       WHERE nc."productionBatchId" = qh."productionBatchId"
         AND UPPER(nc.severity) = 'CRITICAL' AND nc.status NOT IN ('CLOSED', 'CANCELLED')) AS "criticalNcCount",
      legacy.result::text AS "latestLegacyResult",
      legacy.status AS "latestLegacyStatus"
    FROM "QCHoldRelease" qh
    LEFT JOIN "QCTask" task ON task."productionBatchId" = qh."productionBatchId"
    LEFT JOIN "QCTestType" test_type ON test_type.id = task."testTypeId"
    LEFT JOIN LATERAL (
      SELECT candidate.result
      FROM "QCTest" candidate
      WHERE candidate."taskId" = task.id AND candidate.status = 'APPROVED'
      ORDER BY candidate."createdAt" DESC
      LIMIT 1
    ) test ON true
    LEFT JOIN LATERAL (
      SELECT candidate.result, candidate.status
      FROM "QCTest" candidate
      WHERE qh."productionBatchId" IS NULL
        AND candidate."productionBatchId" IS NULL
        AND candidate."itemId" = qh."itemId"
        AND candidate."locationId" = qh."locationId"
      ORDER BY candidate."sampleDate" DESC, candidate."createdAt" DESC
      LIMIT 1
    ) legacy ON true
    WHERE qh.id = ${holdId}
    GROUP BY qh."productionBatchId", legacy.result, legacy.status
  `;
  const result = rows[0];
  if (!result) return false;
  if (!result.productionBatchId && result.latestLegacyResult) {
    return result.latestLegacyResult === "PASSED"
      && ["COMPLETED", "CHECKED", "APPROVED"].includes(result.latestLegacyStatus ?? "");
  }
  return result.blockingCount === 0 && result.failedCount === 0 && result.criticalNcCount === 0;
}

export async function getHoldReleaseById(key: string) {
  const rows = await sql<Array<{
    id: string;
    publicId: number;
    holdNo: string;
    productionBatchId: string | null;
    batchNo: string | null;
    itemId: string;
    itemCode: string;
    itemName: string;
    locationId: string;
    locationName: string;
    quantity: number;
    holdCategory: string;
    releasedQty: number;
    scrappedQty: number;
    reworkedQty: number;
    rejectedQty: number;
    holdReason: string;
    status: string;
    releasedAt: string | null;
    releasedByName: string | null;
    remarks: string | null;
    createdAt: string;
  }>>`
    SELECT
      qh.id,
      qh."publicId",
      qh."holdNo",
      qh."productionBatchId",
      pb."batchNo" AS "batchNo",
      qh."itemId",
      i."itemCode",
      i."itemName",
      qh."locationId",
      l."locationName",
      qh.quantity, qh."holdCategory", qh."releasedQty", qh."scrappedQty", qh."reworkedQty", qh."rejectedQty",
      qh."holdReason",
      qh.status::text AS status,
      qh."releasedAt"::text AS "releasedAt",
      ru.name AS "releasedByName",
      qh.remarks,
      qh."createdAt"::text AS "createdAt"
    FROM "QCHoldRelease" qh
    INNER JOIN "Item" i ON i.id = qh."itemId"
    INNER JOIN "Location" l ON l.id = qh."locationId"
    LEFT JOIN "ProductionBatch" pb ON pb.id = qh."productionBatchId"
    LEFT JOIN "User" ru ON ru.id = qh."releasedById"
    WHERE ${isPublicIdParam(key) ? sql`qh."publicId" = ${Number(key)}` : sql`qh.id = ${key}`}
    LIMIT 1
  `;

  const hold = rows[0];
  if (!hold) return null;
  const dispositions = await sql<Array<{ id: string; dispositionNo: string; dispositionType: string; quantity: number; unitCost: number; totalCost: number; journalEntryId: string | null; reason: string; status: string; performedAt: string }>>`
    SELECT id, "dispositionNo", "dispositionType", quantity, "unitCost", "totalCost", "journalEntryId", reason, status, "performedAt"::text AS "performedAt"
    FROM "QCDisposition" WHERE "holdReleaseId" = ${hold.id} ORDER BY "performedAt" DESC
  `;
  return { ...hold, remainingQty: Math.max(0, Number(hold.quantity) - Number(hold.releasedQty) - Number(hold.scrappedQty) - Number(hold.reworkedQty) - Number(hold.rejectedQty)), dispositions };
}

export async function createQCHoldRelease(payload: {
  productionBatchId?: string | null;
  itemId: string;
  locationId: string;
  destinationLocationId?: string | null;
  quantity: number;
  holdCategory?: "GENERAL" | "ACCEPTED_QC" | "REJECTED" | "WASTAGE";
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
        id, "holdNo", "productionBatchId", "itemId", "locationId", "destinationLocationId", quantity, "holdCategory", "holdReason", status, remarks, "createdById", "createdAt"
      )
      VALUES (
        ${id},
        ${holdNo},
        ${payload.productionBatchId ?? null},
        ${payload.itemId},
        ${payload.locationId},
        ${payload.destinationLocationId ?? null},
        ${Number(payload.quantity)},
        ${payload.holdCategory ?? "GENERAL"},
        ${payload.holdReason},
        'ON_HOLD',
        ${payload.remarks ?? null},
        ${payload.createdById},
        NOW()
      )
    `;
    const reservation = await adjustReservedStock({
      itemId: payload.itemId,
      locationId: payload.locationId,
      quantityDelta: Number(payload.quantity),
      sourceType: "qc.hold-release",
      sourceId: id,
      adjustedById: payload.createdById,
      remarks: payload.holdReason,
    }, { tx });
    await writeProductionAudit(tx, payload.createdById, "qc.hold-release", "CREATE", id, payload);
    await writeProductionHistory(tx, "qc.hold-release", id, "CREATE", payload.createdById, holdNo);
    return { id, holdNo, reservedApplied: reservation.appliedQuantity };
  };

  if (options?.tx) {
    return exec(db);
  }

  return sql.begin(exec);
}

export async function disposeQcHold(input: {
  holdId: string;
  dispositionType: "RELEASE" | "REWORK" | "SCRAP" | "REJECT" | "RETURN" | "DOWNGRADE";
  quantity: number;
  destinationLocationId?: string | null;
  reason: string;
  userId: string;
}) {
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Disposition quantity must be greater than zero");
  if (!input.reason.trim()) throw new Error("Disposition reason is required");
  if (["RELEASE", "DOWNGRADE"].includes(input.dispositionType) && !(await canReleaseHold(input.holdId))) {
    throw new Error("QC release is blocked until every required test passes and critical nonconformities are closed");
  }

  return sql.begin(async (tx) => {
    const rows = await tx<Array<{
      itemId: string; locationId: string; destinationLocationId: string | null; quantity: number;
      releasedQty: number; scrappedQty: number; reworkedQty: number; rejectedQty: number;
      productionBatchId: string | null; status: string;
    }>>`
      SELECT "itemId", "locationId", "destinationLocationId", quantity, "releasedQty", "scrappedQty",
             "reworkedQty", "rejectedQty", "productionBatchId", status::text AS status
      FROM "QCHoldRelease" WHERE id = ${input.holdId} LIMIT 1 FOR UPDATE
    `;
    const hold = rows[0];
    if (!hold) throw new Error("QC hold not found");
    if (["RELEASED", "SCRAPPED", "REWORKED"].includes(hold.status)) throw new Error("This QC hold is already fully disposed");
    const remaining = Number(hold.quantity) - Number(hold.releasedQty) - Number(hold.scrappedQty) - Number(hold.reworkedQty) - Number(hold.rejectedQty);
    if (quantity > remaining + 0.000001) throw new Error(`Only ${remaining} remains available for disposition`);

    const destination = input.destinationLocationId || hold.destinationLocationId;
    const transferTypes = ["RELEASE", "REWORK", "RETURN", "DOWNGRADE", "REJECT"];
    if (transferTypes.includes(input.dispositionType) && (!destination || destination === hold.locationId)) {
      throw new Error(`${input.dispositionType.toLowerCase()} requires a different destination location`);
    }
    await adjustReservedStock({
      itemId: hold.itemId,
      locationId: hold.locationId,
      quantityDelta: -quantity,
      sourceType: "qc.hold-release",
      sourceId: input.holdId,
      adjustedById: input.userId,
      remarks: `${input.dispositionType}: ${input.reason}`,
    }, { tx });
    const balances = await tx<Array<{ averageCost: number }>>`
      SELECT "averageCost" FROM "StockBalance"
      WHERE "itemId" = ${hold.itemId} AND "locationId" = ${hold.locationId} AND "isArchived" = false
      LIMIT 1
    `;
    const unitCost = Number(balances[0]?.averageCost ?? 0);
    const totalCost = quantity * unitCost;
    if (transferTypes.includes(input.dispositionType)) {
      await postTransfer({
        itemId: hold.itemId, fromLocationId: hold.locationId, toLocationId: destination!, quantity,
        unitCost, remarks: `QC ${input.dispositionType.toLowerCase()}: ${input.reason}`,
        createdById: input.userId, sourceDocumentId: input.holdId,
      }, { tx });
    } else if (input.dispositionType === "SCRAP") {
      await inventoryScrapRejectedQCStock({ itemId: hold.itemId, locationId: hold.locationId, quantity,
        unitCost, qcDocumentId: input.holdId, createdById: input.userId,
        remarks: input.reason }, { tx });
    }

    const dispositionId = randomUUID();
    const dispositionNo = await nextProductionDocumentNumber(tx, "QCD", "QC Disposition");
    await tx`INSERT INTO "QCDisposition" (
      id, "dispositionNo", "holdReleaseId", "productionBatchId", "itemId", "fromLocationId", "toLocationId",
      "dispositionType", quantity, "unitCost", "totalCost", status, reason, "performedById", "approvedById", "approvedAt", "performedAt", "createdAt"
    ) VALUES (${dispositionId}, ${dispositionNo}, ${input.holdId}, ${hold.productionBatchId}, ${hold.itemId},
      ${hold.locationId}, ${destination || null}, ${input.dispositionType}, ${quantity}, ${unitCost}, ${totalCost}, 'POSTED', ${input.reason.trim()},
      ${input.userId}, ${input.userId}, NOW(), NOW(), NOW())`;

    let journalEntryId: string | null = null;
    let reworkBatchId: string | null = null;
    if (input.dispositionType === "SCRAP") {
      const journal = await syncInventoryLossJournal(tx, {
        sourceType: "qc.scrap",
        sourceId: dispositionId,
        description: `QC scrap ${dispositionNo}: ${input.reason.trim()}`,
        amount: totalCost,
        postedById: input.userId,
      });
      journalEntryId = journal?.id ?? null;
      await tx`UPDATE "QCDisposition" SET "journalEntryId" = ${journalEntryId} WHERE id = ${dispositionId}`;
    }
    if (input.dispositionType === "REWORK") {
      if (!hold.productionBatchId) throw new Error("Rework requires a production-linked QC hold");
      const sourceRows = await tx<Array<{ shiftSessionId: string; bomId: string | null; finishedGoodId: string; machineId: string | null }>>`
        SELECT "shiftSessionId", "bomId", "finishedGoodId", "machineId" FROM "ProductionBatch" WHERE id = ${hold.productionBatchId} LIMIT 1
      `;
      const source = sourceRows[0];
      if (!source) throw new Error("Source production batch was not found");
      reworkBatchId = randomUUID();
      const reworkBatchNo = await nextProductionDocumentNumber(tx, "BAT", "Production Batch");
      await tx`INSERT INTO "ProductionBatch" (id, "batchNo", "sourceBatchId", "shiftSessionId", "bomId", "finishedGoodId", "locationId", "machineId",
        "producedQty", "acceptedQty", "rejectedQty", "wastageQty", status, remarks, "createdById", "updatedById", "createdAt", "updatedAt")
        VALUES (${reworkBatchId}, ${reworkBatchNo}, ${hold.productionBatchId}, ${source.shiftSessionId}, ${source.bomId}, ${source.finishedGoodId},
          ${destination!}, ${source.machineId}, ${quantity}, 0, 0, 0, 'REWORK', ${`Created from QC disposition ${dispositionNo}: ${input.reason.trim()}`},
          ${input.userId}, ${input.userId}, NOW(), NOW())`;
      await writeProductionHistory(tx, "production.batch", reworkBatchId, "CREATE_REWORK", input.userId, `Rework of ${hold.productionBatchId}`);
    }

    const column = input.dispositionType === "SCRAP" ? "scrappedQty"
      : input.dispositionType === "REWORK" ? "reworkedQty"
        : input.dispositionType === "REJECT" ? "rejectedQty" : "releasedQty";
    await tx.unsafe(`UPDATE "QCHoldRelease" SET "${column}" = "${column}" + $1, "updatedAt" = NOW() WHERE id = $2`, [quantity, input.holdId]);
    const nextRemaining = remaining - quantity;
    const finalStatus = nextRemaining > 0.000001 ? "PARTIALLY_DISPOSED"
      : input.dispositionType === "SCRAP" ? "SCRAPPED"
        : input.dispositionType === "REWORK" ? "REWORKED"
          : input.dispositionType === "REJECT" ? "REJECTED" : "RELEASED";
    await tx`UPDATE "QCHoldRelease" SET status = ${finalStatus}::"HoldStatus", "releasedById" = ${input.userId},
      "releasedAt" = CASE WHEN ${nextRemaining} <= 0.000001 THEN NOW() ELSE "releasedAt" END WHERE id = ${input.holdId}`;
    if (hold.productionBatchId) {
      await tx`UPDATE "ProductionBatch" SET
        status = CASE WHEN ${input.dispositionType} IN ('RELEASE', 'DOWNGRADE', 'RETURN') AND ${nextRemaining} <= 0.000001 THEN 'RELEASED'::"ProductionStatus"
          WHEN ${input.dispositionType} = 'REWORK' THEN 'REWORK'::"ProductionStatus"
          WHEN ${input.dispositionType} IN ('SCRAP', 'REJECT') AND ${nextRemaining} <= 0.000001 THEN 'REJECTED'::"ProductionStatus" ELSE status END,
        "releasedQty" = "releasedQty" + ${input.dispositionType === "RELEASE" || input.dispositionType === "DOWNGRADE" ? quantity : 0}, "updatedAt" = NOW()
        WHERE id = ${hold.productionBatchId}`;
      await recalculateProductionCost(hold.productionBatchId, { tx });
    }
    await writeProductionAudit(tx, input.userId, "qc.disposition", input.dispositionType, dispositionId, input);
    await writeProductionHistory(tx, "qc.hold-release", input.holdId, input.dispositionType, input.userId, `${dispositionNo}: ${quantity}`);
    return { id: dispositionId, dispositionNo, remainingQty: nextRemaining, status: finalStatus, unitCost, totalCost, journalEntryId, reworkBatchId };
  });
}

export async function releaseQCHold(id: string, userId: string, quantity?: number, destinationLocationId?: string | null, reason = "QC release approved") {
  const hold = await getHoldReleaseById(id);
  if (!hold) throw new Error("QC hold not found");
  return disposeQcHold({ holdId: id, dispositionType: "RELEASE", quantity: quantity ?? hold.remainingQty, destinationLocationId, reason, userId });
}

export async function rejectQCHold(id: string, userId: string) {
  await sql.begin(async (tx) => {
    const holdRows = await tx<Array<{ status: string }>>`
      SELECT status::text AS status
      FROM "QCHoldRelease"
      WHERE id = ${id}
      LIMIT 1
      FOR UPDATE
    `;
    const hold = holdRows[0];
    if (!hold) throw new Error("QC hold not found");
    if (hold.status !== "ON_HOLD") throw new Error("Only stock currently on hold can be rejected");
    await tx`
      UPDATE "QCHoldRelease"
      SET status = 'REJECTED'
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.hold-release", "REJECT", id, { id });
    await writeProductionHistory(tx, "qc.hold-release", id, "REJECT", userId, "QC hold rejected");
  });
  return { id };
}

export async function scrapQCHold(id: string, userId: string) {
  const hold = await getHoldReleaseById(id);
  if (!hold) throw new Error("QC hold not found");
  return disposeQcHold({ holdId: id, dispositionType: "SCRAP", quantity: hold.remainingQty, reason: "QC hold scrapped", userId });
}
