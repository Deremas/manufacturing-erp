import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { postProductionOutputDocument } from "@/services/inventory/module-integration.service";
import { recalculateProductionCost } from "@/services/production/production-costing.service";
import {
  getItemLookup,
  nextProductionDocumentNumber,
  normalizeProductionStatus,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";
import { createQCHoldRelease } from "@/services/qc/hold-release.service";

export interface ProductionBatchPayload {
  shiftSessionId: string;
  bomId?: string | null;
  finishedGoodId: string;
  locationId: string;
  producedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  wastageQty: number;
  remarks?: string;
  createdById: string;
  updatedById?: string;
  status?: string;
}

export async function listProductionBatches(shiftSessionId?: string) {
  try {
    return await sql<Array<{
      id: string;
      batchNo: string;
      shiftSessionId: string;
      sessionNo: string;
      finishedGoodCode: string;
      finishedGoodName: string;
      producedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      wastageQty: number;
      status: string;
    }>>`
      SELECT
        pb.id,
        pb."batchNo",
        pb."shiftSessionId",
        ss."sessionNo",
        i."itemCode" AS "finishedGoodCode",
        i."itemName" AS "finishedGoodName",
        pb."producedQty",
        pb."acceptedQty",
        pb."rejectedQty",
        pb."wastageQty",
        pb.status::text AS status
      FROM "ProductionBatch" pb
      INNER JOIN "ShiftSession" ss ON ss.id = pb."shiftSessionId"
      INNER JOIN "Item" i ON i.id = pb."finishedGoodId"
      ${shiftSessionId ? sql`WHERE pb."shiftSessionId" = ${shiftSessionId}` : sql``}
      ORDER BY pb."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getProductionBatchById(id: string) {
  const rows = await sql<Array<{
    id: string;
    batchNo: string;
    shiftSessionId: string;
    bomId: string | null;
    finishedGoodId: string;
    finishedGoodCode: string;
    finishedGoodName: string;
    locationId: string;
    locationName: string;
    producedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    wastageQty: number;
    status: string;
    postedAt: string | null;
    remarks: string | null;
  }>>`
    SELECT
      pb.id,
      pb."batchNo",
      pb."shiftSessionId",
      pb."bomId",
      pb."finishedGoodId",
      i."itemCode" AS "finishedGoodCode",
      i."itemName" AS "finishedGoodName",
      pb."locationId",
      l."locationName",
      pb."producedQty",
      pb."acceptedQty",
      pb."rejectedQty",
      pb."wastageQty",
      pb.status::text AS status,
      pb."postedAt"::text AS "postedAt",
      pb.remarks
    FROM "ProductionBatch" pb
    INNER JOIN "Item" i ON i.id = pb."finishedGoodId"
    INNER JOIN "Location" l ON l.id = pb."locationId"
    WHERE pb.id = ${id}
    LIMIT 1
  `;
  const header = rows[0];
  if (!header) return null;
  const [costRecord, qcTests] = await Promise.all([
    sql<Array<{ materialCost: number; wastageCost: number; overheadCost: number; laborCost: number; totalCost: number; costPerUnit: number }>>`
      SELECT "materialCost", "wastageCost", "overheadCost", "laborCost", "totalCost", "costPerUnit"
      FROM "ProductionCostRecord"
      WHERE "batchId" = ${id}
      LIMIT 1
    `,
    sql<Array<{ id: string; testNo: string; testType: string; result: string; status: string }>>`
      SELECT id, "testNo", "testType", result::text AS result, status
      FROM "QCTest"
      WHERE "productionBatchId" = ${id}
      ORDER BY "createdAt" DESC
    `,
  ]);
  return { ...header, costRecord: costRecord[0] ?? null, qcTests };
}

export async function createProductionBatch(payload: ProductionBatchPayload) {
  if (Number(payload.producedQty) <= 0) throw new Error("Produced quantity must be greater than zero");
  if ((Number(payload.acceptedQty) + Number(payload.rejectedQty) + Number(payload.wastageQty)) > Number(payload.producedQty)) {
    throw new Error("Accepted, rejected, and wastage quantities cannot exceed produced quantity");
  }
  const finishedGood = await getItemLookup(payload.finishedGoodId);
  if (!finishedGood) throw new Error("Finished good not found");

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const batchNo = await nextProductionDocumentNumber(tx, "BAT", "Production Batch");
    await tx`
      INSERT INTO "ProductionBatch" (
        id, "batchNo", "shiftSessionId", "bomId", "finishedGoodId", "locationId",
        "producedQty", "acceptedQty", "rejectedQty", "wastageQty", status, remarks,
        "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${batchNo},
        ${payload.shiftSessionId},
        ${payload.bomId ?? null},
        ${payload.finishedGoodId},
        ${payload.locationId},
        ${Number(payload.producedQty)},
        ${Number(payload.acceptedQty)},
        ${Number(payload.rejectedQty)},
        ${Number(payload.wastageQty)},
        ${normalizeProductionStatus(payload.status)},
        ${payload.remarks ?? null},
        ${payload.createdById},
        ${payload.updatedById ?? payload.createdById},
        NOW(),
        NOW()
      )
    `;
    await writeProductionAudit(tx, payload.createdById, "production.output", "CREATE", id, payload);
    await writeProductionHistory(tx, "production.output", id, "CREATE", payload.createdById, batchNo);
    return { id, batchNo };
  });
}

export async function postProductionBatch(id: string, userId: string) {
  const batch = await getProductionBatchById(id);
  if (!batch) throw new Error("Production batch not found");
  if (batch.status === "POSTED") return { id };
  if (batch.status === "CANCELLED") throw new Error("Cancelled production batch cannot be posted");

  if (Number(batch.acceptedQty) > 0) {
    await postProductionOutputDocument({
      productionOrderId: id,
      locationId: batch.locationId,
      createdById: userId,
      remarks: batch.batchNo,
      lines: [{
        itemId: batch.finishedGoodId,
        quantity: batch.acceptedQty,
        unitCost: 0,
        remarks: batch.remarks ?? undefined,
      }],
    });
  }

  if ((Number(batch.rejectedQty) + Number(batch.wastageQty)) > 0) {
    await createQCHoldRelease({
      productionBatchId: id,
      itemId: batch.finishedGoodId,
      locationId: batch.locationId,
      quantity: Number(batch.rejectedQty) + Number(batch.wastageQty),
      holdReason: `Rejected or wastage from batch ${batch.batchNo}`,
      remarks: batch.remarks ?? undefined,
      createdById: userId,
    });
  }

  const result = await sql.begin(async (tx) => {
    await tx`
      UPDATE "ProductionBatch"
      SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeProductionAudit(tx, userId, "production.output", "POST", id, { id });
    await writeProductionHistory(tx, "production.output", id, "POST", userId, batch.batchNo);
    return { id };
  });

  await recalculateProductionCost(id);
  return result;
}
