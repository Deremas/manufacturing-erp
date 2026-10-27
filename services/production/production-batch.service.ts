import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
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
import {
  assertProductionMachine,
  listProductionMachines,
  markMachineInUse,
  restoreMachineIfIdle,
} from "@/services/production/machine-assignment.service";

export interface ProductionBatchPayload {
  shiftSessionId: string;
  bomId?: string | null;
  finishedGoodId: string;
  locationId: string;
  machineId?: string | null;
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
      publicId: number;
      batchNo: string;
      shiftSessionId: string;
      sessionPublicId: number;
      sessionNo: string;
      shiftCode: string;
      productionDate: string;
      locationName: string;
      finishedGoodCode: string;
      finishedGoodName: string;
      producedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      wastageQty: number;
      status: string;
      machineId: string | null;
      machineName: string | null;
    }>>`
      SELECT
        pb.id,
        pb."publicId",
        pb."batchNo",
        pb."shiftSessionId",
        ss."publicId" AS "sessionPublicId",
        ss."sessionNo",
        ss."shiftCode",
        ss."productionDate"::text AS "productionDate",
        l."locationName",
        i."itemCode" AS "finishedGoodCode",
        i."itemName" AS "finishedGoodName",
        pb."producedQty",
        pb."acceptedQty",
        pb."rejectedQty",
        pb."wastageQty",
        pb.status::text AS status,
        pb."machineId",
        CASE WHEN a.id IS NULL THEN NULL ELSE a."assetCode" || ' - ' || a."assetName" END AS "machineName"
      FROM "ProductionBatch" pb
      INNER JOIN "ShiftSession" ss ON ss.id = pb."shiftSessionId"
      INNER JOIN "Item" i ON i.id = pb."finishedGoodId"
      INNER JOIN "Location" l ON l.id = pb."locationId"
      LEFT JOIN "Asset" a ON a.id = pb."machineId"
      ${shiftSessionId ? sql`WHERE pb."shiftSessionId" = ${shiftSessionId}` : sql``}
      ORDER BY pb."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getProductionBatchById(key: string) {
  const rows = await sql<Array<{
    id: string;
    publicId: number;
    batchNo: string;
    shiftSessionId: string;
    bomId: string | null;
    finishedGoodId: string;
    finishedGoodCode: string;
    finishedGoodName: string;
    locationId: string;
    locationName: string;
    machineId: string | null;
    machineName: string | null;
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
      pb."publicId",
      pb."batchNo",
      pb."shiftSessionId",
      pb."bomId",
      pb."finishedGoodId",
      i."itemCode" AS "finishedGoodCode",
      i."itemName" AS "finishedGoodName",
      pb."locationId",
      l."locationName",
      pb."machineId",
      CASE WHEN a.id IS NULL THEN NULL ELSE a."assetCode" || ' - ' || a."assetName" END AS "machineName",
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
    LEFT JOIN "Asset" a ON a.id = pb."machineId"
    WHERE ${isPublicIdParam(key) ? sql`pb."publicId" = ${Number(key)}` : sql`pb.id = ${key}`}
    LIMIT 1
  `;
  const header = rows[0];
  if (!header) return null;
  const id = header.id;
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

export async function getProductionBatchTraceability(key: string) {
  const batch = await getProductionBatchById(key);
  if (!batch) return null;
  const id = batch.id;
  const [stages, availableStages, machines, issues, materialLots, returns, tasks, holds, nonconformities, movements, downtimes, reworkBatches] = await Promise.all([
    sql<Array<Record<string, unknown>>>`SELECT execution.id, stage.code, stage.name, execution.status, execution."startedAt"::text AS "startedAt", execution."completedAt"::text AS "completedAt", execution."outputQty", execution."wastageQty", execution."downtimeMinutes", asset."assetCode", asset."assetName", operator.name AS "operatorName"
      FROM "ProductionBatchStage" execution INNER JOIN "ProductionStage" stage ON stage.id = execution."productionStageId" LEFT JOIN "Asset" asset ON asset.id = execution."machineId" LEFT JOIN "User" operator ON operator.id = execution."operatorId"
      WHERE execution."productionBatchId" = ${id} ORDER BY execution."createdAt"`,
    sql<Array<{ id: string; code: string; name: string; sequence: number }>>`
      SELECT id, code, name, sequence
      FROM "ProductionStage"
      WHERE "isActive" = true AND "isArchived" = false
      ORDER BY sequence, name
    `,
    listProductionMachines(batch.locationId),
    sql<Array<Record<string, unknown>>>`SELECT issue.id, issue."issueNo", issue.status::text AS status, location."locationName", COUNT(item.id)::int AS "itemCount", COALESCE(SUM(item."issuedQty" * item."unitCost"), 0) AS value
      FROM "ProductionMaterialIssue" issue LEFT JOIN "ProductionMaterialIssueItem" item ON item."issueId" = issue.id INNER JOIN "Location" location ON location.id = issue."storeLocationId"
      WHERE issue."productionBatchId" = ${id} GROUP BY issue.id, location."locationName" ORDER BY issue."createdAt"`,
    sql<Array<Record<string, unknown>>>`SELECT line.id, issue."issueNo", item."itemCode", item."itemName", line."issuedQty", unit.name AS "uomName",
        line."sourceLotNo", line."supplierBatchNo", line."serialNo", line."expiryDate"::text AS "expiryDate", line."unitCost"
      FROM "ProductionMaterialIssueItem" line
      INNER JOIN "ProductionMaterialIssue" issue ON issue.id = line."issueId"
      INNER JOIN "Item" item ON item.id = line."itemId"
      LEFT JOIN "Unit" unit ON unit.id = line."uomId"
      WHERE issue."productionBatchId" = ${id}
      ORDER BY issue."createdAt", item."itemCode"`,
    sql<Array<Record<string, unknown>>>`SELECT document.id, document."returnNo", document.status::text AS status, COUNT(item.id)::int AS "itemCount", COALESCE(SUM(item."returnedQty"), 0) AS quantity
      FROM "ProductionMaterialReturn" document LEFT JOIN "ProductionMaterialReturnItem" item ON item."returnId" = document.id WHERE document."productionBatchId" = ${id} GROUP BY document.id ORDER BY document."createdAt"`,
    sql<Array<Record<string, unknown>>>`SELECT task.id, task."taskNo", test_type.name AS "testType", task.status, task.priority, task."dueDate"::text AS "dueDate", test."testNo", test.result::text AS result, test.status AS "testStatus"
      FROM "QCTask" task INNER JOIN "QCTestType" test_type ON test_type.id = task."testTypeId" LEFT JOIN LATERAL (SELECT * FROM "QCTest" WHERE "taskId" = task.id ORDER BY "createdAt" DESC LIMIT 1) test ON true
      WHERE task."productionBatchId" = ${id} ORDER BY task.sequence`,
    sql<Array<Record<string, unknown>>>`SELECT id, "holdNo", "holdCategory", "holdReason", quantity, "releasedQty", "scrappedQty", "reworkedQty", "rejectedQty", status::text AS status FROM "QCHoldRelease" WHERE "productionBatchId" = ${id} ORDER BY "createdAt"`,
    sql<Array<Record<string, unknown>>>`SELECT id, "ncNo", severity, status, disposition, "rootCause", "correctiveAction" FROM "QCNonconformity" WHERE "productionBatchId" = ${id} ORDER BY "createdAt"`,
    sql<Array<Record<string, unknown>>>`SELECT id, "movementNumber", date::text AS date, "movementType"::text AS "movementType", "quantityIn", "quantityOut", "unitCost", "batchNo", "lotNo", remarks FROM "StockMovement" WHERE "sourceDocumentId" = ${id} OR "batchNo" = ${batch.batchNo} ORDER BY date`,
    sql<Array<Record<string, unknown>>>`SELECT downtime.id, downtime."startTime"::text AS "startTime", downtime."endTime"::text AS "endTime", stage.name AS "productionStage", downtime.reason::text AS reason, downtime."durationMinutes", downtime.status, downtime."maintenanceRequired", asset."assetCode", ticket."ticketNo", ticket.status::text AS "ticketStatus"
      FROM "ProductionDowntime" downtime LEFT JOIN "ProductionBatchStage" execution ON execution.id = downtime."productionBatchStageId" LEFT JOIN "ProductionStage" stage ON stage.id = execution."productionStageId" LEFT JOIN "Asset" asset ON asset.id = downtime."assetId" LEFT JOIN "MaintenanceTicket" ticket ON ticket."productionDowntimeId" = downtime.id
      WHERE downtime."productionBatchId" = ${id} ORDER BY downtime."startTime"`,
    sql<Array<Record<string, unknown>>>`SELECT id, "batchNo", status::text AS status, "producedQty", "acceptedQty", "rejectedQty", "wastageQty", remarks, "createdAt"::text AS "createdAt"
      FROM "ProductionBatch" WHERE "sourceBatchId" = ${id} ORDER BY "createdAt"`,
  ]);
  const timeline = [
    ...stages.map((stage) => ({
      id: `stage-${String(stage.id)}`,
      timestamp: stage.startedAt,
      event: "STAGE",
      stage: stage.name,
      status: stage.status,
      machine: [stage.assetCode, stage.assetName].filter(Boolean).join(" - ") || null,
      operator: stage.operatorName,
      outputQty: stage.outputQty,
      wastageQty: stage.wastageQty,
      downtimeMinutes: stage.downtimeMinutes,
    })),
    ...downtimes.map((downtime) => ({
      id: `downtime-${String(downtime.id)}`,
      timestamp: downtime.startTime,
      event: "DOWNTIME",
      stage: downtime.productionStage,
      status: downtime.status,
      machine: downtime.assetCode,
      operator: null,
      outputQty: null,
      wastageQty: null,
      downtimeMinutes: downtime.durationMinutes,
    })),
  ].sort((left, right) => String(left.timestamp ?? "").localeCompare(String(right.timestamp ?? "")));
  return {
    ...batch,
    stages,
    availableStages,
    machines,
    issues,
    materialLots,
    returns,
    tasks,
    holds,
    nonconformities,
    movements,
    downtimes,
    timeline,
    reworkBatches,
  };
}

function csvValue(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildProductionBatchTraceabilityCsv(batch: NonNullable<Awaited<ReturnType<typeof getProductionBatchTraceability>>>) {
  const sections: Array<[string, Array<Record<string, unknown>>]> = [
    ["Production timeline", batch.timeline],
    ["Material issues", batch.issues],
    ["Raw-material lots and serials", batch.materialLots],
    ["Material returns", batch.returns],
    ["QC tasks and tests", batch.tasks],
    ["Holds and dispositions", batch.holds],
    ["Nonconformities", batch.nonconformities],
    ["Finished-goods inventory movements", batch.movements],
    ["Downtime and maintenance", batch.downtimes],
    ["Linked rework batches", batch.reworkBatches],
  ];
  const lines = [
    ["Batch", batch.batchNo],
    ["Finished good", `${batch.finishedGoodCode} - ${batch.finishedGoodName}`],
    ["Status", batch.status],
    ["Produced", batch.producedQty],
    ["Accepted", batch.acceptedQty],
    ["Rejected", batch.rejectedQty],
    ["Wastage", batch.wastageQty],
  ].map((row) => row.map(csvValue).join(","));
  for (const [title, rows] of sections) {
    lines.push("", csvValue(title));
    if (rows.length === 0) {
      lines.push("No records");
      continue;
    }
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    lines.push(columns.map(csvValue).join(","));
    lines.push(...rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}

export async function createProductionBatch(payload: ProductionBatchPayload) {
  if (Number(payload.producedQty) <= 0) throw new Error("Produced quantity must be greater than zero");
  if ((Number(payload.acceptedQty) + Number(payload.rejectedQty) + Number(payload.wastageQty)) > Number(payload.producedQty)) {
    throw new Error("Accepted, rejected, and wastage quantities cannot exceed produced quantity");
  }
  const finishedGood = await getItemLookup(payload.finishedGoodId);
  if (!finishedGood) throw new Error("Finished good not found");

  return sql.begin(async (tx) => {
    const shiftRows = await tx<Array<{ locationId: string; status: string }>>`
      SELECT "locationId", status::text AS status
      FROM "ShiftSession"
      WHERE id = ${payload.shiftSessionId}
      LIMIT 1
      FOR UPDATE
    `;
    const shift = shiftRows[0];
    if (!shift) throw new Error("Shift session not found");
    if (shift.status !== "ACTIVE") throw new Error("Production output requires an active shift session");
    const machineId = payload.machineId;
    if (machineId) await assertProductionMachine(tx, machineId, shift.locationId);

    const id = randomUUID();
    const batchNo = await nextProductionDocumentNumber(tx, "BAT", "Production Batch");
    await tx`
      INSERT INTO "ProductionBatch" (
        id, "batchNo", "shiftSessionId", "bomId", "finishedGoodId", "locationId", "machineId",
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
        ${machineId ?? null},
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
    await markMachineInUse(tx, machineId);
    return { id, batchNo };
  });
}

export async function postProductionBatch(id: string, userId: string) {
  const result = await sql.begin(async (tx) => {
    const rows = await tx<Array<{
      id: string;
      batchNo: string;
      finishedGoodId: string;
      locationId: string;
      producedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      wastageQty: number;
      status: string;
      remarks: string | null;
      machineId: string | null;
    }>>`
      SELECT
        id,
        "batchNo",
        "finishedGoodId",
        "locationId",
        "producedQty",
        "acceptedQty",
        "rejectedQty",
        "wastageQty",
        status::text AS status,
        remarks,
        "machineId"
      FROM "ProductionBatch"
      WHERE id = ${id}
      LIMIT 1
      FOR UPDATE
    `;

    const batch = rows[0];
    if (!batch) throw new Error("Production batch not found");
    if (batch.status === "POSTED") return { id };
    if (batch.status === "CANCELLED") throw new Error("Cancelled production batch cannot be posted");
    const classifiedQty = Number(batch.acceptedQty) + Number(batch.rejectedQty) + Number(batch.wastageQty);
    if (Math.abs(classifiedQty - Number(batch.producedQty)) > 0.000001) {
      throw new Error("Accepted, rejected, and wastage quantities must equal produced quantity before posting");
    }
    const cost = await recalculateProductionCost(id, { tx });
    const outputUnitCost = Number(batch.producedQty) > 0 ? Number(cost.totalCost) / Number(batch.producedQty) : 0;

    if (Number(batch.acceptedQty) > 0) {
      await postProductionOutputDocument({
        productionOrderId: id,
        locationId: batch.locationId,
        createdById: userId,
        remarks: batch.batchNo,
        lines: [{
          itemId: batch.finishedGoodId,
          quantity: batch.acceptedQty,
          unitCost: outputUnitCost,
          remarks: batch.remarks ?? undefined,
        }],
      }, { tx });
    }

    const controlledQty = Number(batch.rejectedQty) + Number(batch.wastageQty);
    let qcHoldLocationId: string | null = null;
    if (controlledQty > 0) {
      const holdLocations = await tx<Array<{ id: string }>>`
        SELECT id FROM "Location"
        WHERE "isQcHoldLocation" = true AND "isStockLocation" = true AND "isActive" = true AND "isArchived" = false
        ORDER BY "locationCode" LIMIT 1
      `;
      qcHoldLocationId = holdLocations[0]?.id ?? null;
      if (!qcHoldLocationId) throw new Error("Configure an active QC quarantine location before posting rejected or wastage output");
      if (qcHoldLocationId === batch.locationId) throw new Error("QC quarantine and released output locations must be different");

      await postProductionOutputDocument({
        productionOrderId: id,
        locationId: qcHoldLocationId,
        createdById: userId,
        remarks: `Controlled rejected/wastage output ${batch.batchNo}`,
        lines: [{ itemId: batch.finishedGoodId, quantity: controlledQty, unitCost: outputUnitCost, remarks: batch.remarks ?? undefined }],
      }, { tx });
      if (Number(batch.rejectedQty) > 0) {
        await createQCHoldRelease({ productionBatchId: id, itemId: batch.finishedGoodId, locationId: qcHoldLocationId,
          destinationLocationId: batch.locationId, quantity: Number(batch.rejectedQty), holdCategory: "REJECTED",
          holdReason: `Rejected output from batch ${batch.batchNo}; rework, reuse, downgrade, return, or scrap required`,
          remarks: batch.remarks ?? undefined, createdById: userId }, { tx });
      }
      if (Number(batch.wastageQty) > 0) {
        await createQCHoldRelease({ productionBatchId: id, itemId: batch.finishedGoodId, locationId: qcHoldLocationId,
          destinationLocationId: batch.locationId, quantity: Number(batch.wastageQty), holdCategory: "WASTAGE",
          holdReason: `Production wastage from batch ${batch.batchNo}; recovery or scrap disposition required`,
          remarks: batch.remarks ?? undefined, createdById: userId }, { tx });
      }
    }

    await tx`
      UPDATE "ProductionBatch"
      SET status = 'POSTED', "qcHoldLocationId" = COALESCE(${qcHoldLocationId}, "qcHoldLocationId"),
          "releaseLocationId" = ${batch.locationId}, "postedById" = ${userId}, "postedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeProductionAudit(tx, userId, "production.output", "POST", id, { id, batchNo: batch.batchNo });
    await writeProductionHistory(tx, "production.output", id, "POST", userId, batch.batchNo);
    await restoreMachineIfIdle(tx, batch.machineId);
    return { id };
  });

  return result;
}
