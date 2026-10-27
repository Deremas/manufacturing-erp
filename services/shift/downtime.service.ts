import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { nextMaintenanceDocumentNumber } from "@/services/maintenance/maintenance.service";
import { assertProductionMachine } from "@/services/production/machine-assignment.service";
import { writeProductionAudit, writeProductionHistory, type Tx } from "@/services/production/production-shared.service";

export type DowntimeStatus = "OPEN" | "MAINTENANCE_REQUESTED" | "WORK_IN_PROGRESS" | "RESTORED" | "CLOSED" | "CANCELLED";

export interface DowntimePayload {
  shiftSessionId: string;
  startTime: string;
  endTime?: string | null;
  reasonId?: string | null;
  /** Legacy shift UI compatibility. New forms must send reasonId. */
  reason?: "MACHINE_BREAKDOWN" | "POWER_INTERRUPTION" | "MATERIAL_SHORTAGE" | "QUALITY_ISSUE" | "OPERATOR_DELAY" | "MAINTENANCE" | "OTHER";
  assetId?: string | null;
  productionBatchId?: string | null;
  productionBatchStageId?: string | null;
  operatorId?: string | null;
  failureCause?: string | null;
  description?: string | null;
  maintenanceRequired?: boolean;
  plannedProductionRate?: number | null;
  actualLostQty?: number | null;
  remarks?: string | null;
  createdById: string;
}

export async function listDowntimeReasons() {
  return sql<Array<{ id: string; code: string; name: string; requiresMaintenance: boolean; affectsProduction: boolean; categoryId: string; categoryCode: string; categoryName: string }>>`
    SELECT r.id, r.code, r.name, r."requiresMaintenance", r."affectsProduction",
      c.id AS "categoryId", c.code AS "categoryCode", c.name AS "categoryName"
    FROM "DowntimeReasonConfig" r
    INNER JOIN "DowntimeCategory" c ON c.id = r."categoryId"
    WHERE r."isActive" = true AND c."isActive" = true
    ORDER BY c.name, r.name`;
}

export async function listDowntimeRows(shiftSessionId?: string, locationIds?: string[]) {
  return sql<Array<Record<string, unknown>>>`
    SELECT pd.id, pd."downtimeNo", pd."shiftSessionId", ss."sessionNo", ss."productionDate"::text AS "productionDate",
      ss."shiftCode", pd."startTime"::text AS "startTime", pd."endTime"::text AS "endTime", pd."restoredAt"::text AS "restoredAt",
      pd."durationMinutes", COALESCE(rc.code, pd.reason::text) AS "reasonCode", COALESCE(rc.name, replace(pd.reason::text, '_', ' ')) AS "reasonName",
      rc."requiresMaintenance" AS "reasonRequiresMaintenance", dc.name AS "categoryName", pd."failureCause", pd.description,
      pd."assetId", pd."locationId", l."locationName", pd."operatorId", op.name AS "operatorName",
      pd."productionBatchId", pd."productionBatchStageId", stage.name AS "productionStageName", pb."batchNo",
      pd."maintenanceRequired", pd."plannedProductionRate", pd."estimatedLostQty", pd."actualLostQty", pd.status,
      COALESCE(pd."maintenanceTicketId", mt.id) AS "maintenanceTicketId", mt."ticketNo" AS "maintenanceTicketNo",
      COALESCE(pd."workOrderId", wo.id) AS "workOrderId", wo."workOrderNo",
      CASE WHEN a.id IS NULL THEN NULL ELSE a."assetCode" || ' - ' || a."assetName" END AS machine,
      pd.remarks, pd."createdAt"::text AS "createdAt"
    FROM "ProductionDowntime" pd
    INNER JOIN "ShiftSession" ss ON ss.id = pd."shiftSessionId"
    INNER JOIN "Location" l ON l.id = pd."locationId"
    LEFT JOIN "Asset" a ON a.id = pd."assetId"
    LEFT JOIN "User" op ON op.id = pd."operatorId"
    LEFT JOIN "DowntimeReasonConfig" rc ON rc.id = pd."reasonId"
    LEFT JOIN "DowntimeCategory" dc ON dc.id = rc."categoryId"
    LEFT JOIN "ProductionBatch" pb ON pb.id = pd."productionBatchId"
    LEFT JOIN "ProductionBatchStage" execution ON execution.id = pd."productionBatchStageId"
    LEFT JOIN "ProductionStage" stage ON stage.id = execution."productionStageId"
    LEFT JOIN "MaintenanceTicket" mt ON mt."productionDowntimeId" = pd.id AND mt."isArchived" = false
    LEFT JOIN "MaintenanceWorkOrder" wo ON wo."productionDowntimeId" = pd.id OR wo."ticketId" = mt.id
    WHERE true
      ${shiftSessionId ? sql`AND pd."shiftSessionId" = ${shiftSessionId}` : sql``}
      ${locationIds?.length ? sql`AND pd."locationId" = ANY(${locationIds})` : sql``}
    ORDER BY pd."startTime" DESC`;
}

export async function getDowntimeById(id: string) {
  const all = await listDowntimeRows();
  return all.find((row) => row.id === id) ?? null;
}

function legacyReasonCode(reason?: DowntimePayload["reason"]) {
  return reason === "MACHINE_BREAKDOWN" ? "MECHANICAL_FAILURE" : reason;
}

export async function createDowntime(payload: DowntimePayload) {
  const start = new Date(payload.startTime);
  if (Number.isNaN(start.getTime())) throw new Error("Valid downtime start time is required");
  return sql.begin(async (tx) => {
    const shifts = await tx<Array<{ locationId: string; status: string }>>`SELECT "locationId", status::text AS status FROM "ShiftSession" WHERE id = ${payload.shiftSessionId} LIMIT 1 FOR UPDATE`;
    const shift = shifts[0];
    if (!shift) throw new Error("Shift session not found");
    if (shift.status !== "ACTIVE") throw new Error("Downtime can only be started for an active shift");

    const reasonRows = payload.reasonId
      ? await tx<Array<{ id: string; code: string; requiresMaintenance: boolean }>>`SELECT id, code, "requiresMaintenance" FROM "DowntimeReasonConfig" WHERE id = ${payload.reasonId} AND "isActive" = true LIMIT 1`
      : await tx<Array<{ id: string; code: string; requiresMaintenance: boolean }>>`SELECT id, code, "requiresMaintenance" FROM "DowntimeReasonConfig" WHERE code = ${legacyReasonCode(payload.reason) ?? "OTHER"} AND "isActive" = true LIMIT 1`;
    const reason = reasonRows[0];
    if (!reason) throw new Error("Select an active downtime reason from settings");
    const maintenanceRequired = reason.requiresMaintenance || Boolean(payload.maintenanceRequired);
    if (maintenanceRequired && !payload.assetId) throw new Error("Production asset is required for maintenance-related downtime");

    let assetRate: number | null = null;
    if (payload.assetId) {
      await assertProductionMachine(tx, payload.assetId, shift.locationId);
      const rateRows = await tx<Array<{ rate: number | null }>>`SELECT "expectedProductionRatePerHour" AS rate FROM "Asset" WHERE id = ${payload.assetId}`;
      assetRate = rateRows[0]?.rate == null ? null : Number(rateRows[0].rate);
    }
    if (payload.productionBatchId) {
      const batch = await tx<Array<{ id: string }>>`SELECT id FROM "ProductionBatch" WHERE id = ${payload.productionBatchId} AND "shiftSessionId" = ${payload.shiftSessionId} LIMIT 1`;
      if (!batch[0]) throw new Error("Selected batch does not belong to this shift");
    }
    let stageId = payload.productionBatchStageId ?? null;
    if (!stageId && payload.productionBatchId) {
      const stages = await tx<Array<{ id: string }>>`SELECT id FROM "ProductionBatchStage" WHERE "productionBatchId" = ${payload.productionBatchId} AND status = 'ACTIVE' ORDER BY "startedAt" DESC LIMIT 1`;
      stageId = stages[0]?.id ?? null;
    }

    const id = randomUUID();
    const downtimeNo = await nextMaintenanceDocumentNumber(tx, "DT", "Production Downtime");
    const rate = payload.plannedProductionRate == null ? assetRate : Number(payload.plannedProductionRate);
    await tx`INSERT INTO "ProductionDowntime" (id, "downtimeNo", "shiftSessionId", "productionBatchId", "productionBatchStageId", "assetId", "locationId", "startTime", "reasonId", "operatorId", "failureCause", description, "plannedProductionRate", "actualLostQty", remarks, "maintenanceRequired", status, "createdById", "createdAt", "updatedAt") VALUES (${id}, ${downtimeNo}, ${payload.shiftSessionId}, ${payload.productionBatchId || null}, ${stageId}, ${payload.assetId || null}, ${shift.locationId}, ${start}, ${reason.id}, ${payload.operatorId || payload.createdById}, ${payload.failureCause?.trim() || null}, ${payload.description?.trim() || null}, ${rate}, ${payload.actualLostQty == null ? null : Number(payload.actualLostQty)}, ${payload.remarks?.trim() || null}, ${maintenanceRequired}, 'OPEN', ${payload.createdById}, NOW(), NOW())`;
    await writeProductionAudit(tx, payload.createdById, "production.downtime", "START", id, { downtimeNo, reasonId: reason.id, assetId: payload.assetId });
    await writeProductionHistory(tx, "production.downtime", id, "START", payload.createdById, downtimeNo);
    if (payload.endTime) await stopDowntime({ id, endTime: payload.endTime, stoppedById: payload.createdById }, tx);
    return { id, downtimeNo, status: payload.endTime ? "RESTORED" : "OPEN" };
  });
}

export async function stopDowntime(input: { id: string; endTime?: string | null; actualLostQty?: number | null; remarks?: string | null; stoppedById: string }, existingTx?: Tx) {
  const execute = async (tx: Tx) => {
    const rows = await tx<Array<{ startTime: string; status: string; plannedProductionRate: number | null }>>`SELECT "startTime"::text AS "startTime", status, "plannedProductionRate" FROM "ProductionDowntime" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    const record = rows[0];
    if (!record) throw new Error("Downtime record not found");
    if (!["OPEN", "MAINTENANCE_REQUESTED", "WORK_IN_PROGRESS"].includes(record.status)) throw new Error("Only active downtime can be stopped");
    const end = input.endTime ? new Date(input.endTime) : new Date();
    const durationMinutes = Math.max(Math.round((end.getTime() - new Date(record.startTime).getTime()) / 60000), 0);
    if (durationMinutes <= 0) throw new Error("Downtime end time must be after start time");
    const estimated = record.plannedProductionRate == null ? null : (durationMinutes / 60) * Number(record.plannedProductionRate);
    await tx`UPDATE "ProductionDowntime" SET "endTime" = ${end}, "restoredAt" = ${end}, "durationMinutes" = ${durationMinutes}, "estimatedLostQty" = ${estimated}, "actualLostQty" = COALESCE(${input.actualLostQty == null ? null : Number(input.actualLostQty)}, "actualLostQty"), status = 'RESTORED', remarks = CASE WHEN ${input.remarks?.trim() || null} IS NULL THEN remarks WHEN remarks IS NULL OR remarks = '' THEN ${input.remarks?.trim() || null} ELSE remarks || E'\n' || ${input.remarks?.trim() || null} END, "updatedAt" = NOW() WHERE id = ${input.id}`;
    await writeProductionAudit(tx, input.stoppedById, "production.downtime", "STOP", input.id, { endTime: end, durationMinutes, estimatedLostQty: estimated });
    await writeProductionHistory(tx, "production.downtime", input.id, "STOP", input.stoppedById, `${durationMinutes} minutes`);
    return { id: input.id, status: "RESTORED", durationMinutes, estimatedLostQty: estimated };
  };
  return existingTx ? execute(existingTx) : sql.begin(execute);
}

export async function createMaintenanceTicketFromDowntime(input: { id: string; requestedById: string; overrideDuplicate?: boolean; remarks?: string | null }) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; downtimeNo: string | null; assetId: string | null; locationId: string; shiftSessionId: string; productionBatchId: string | null; startTime: string; description: string | null; failureCause: string | null; maintenanceRequired: boolean; reasonName: string | null; departmentId: string | null }>>`
      SELECT pd.id, pd."downtimeNo", pd."assetId", pd."locationId", pd."shiftSessionId", pd."productionBatchId", pd."startTime"::text AS "startTime", pd.description, pd."failureCause", pd."maintenanceRequired", r.name AS "reasonName", a."departmentId"
      FROM "ProductionDowntime" pd LEFT JOIN "DowntimeReasonConfig" r ON r.id = pd."reasonId" LEFT JOIN "Asset" a ON a.id = pd."assetId" WHERE pd.id = ${input.id} LIMIT 1 FOR UPDATE`;
    const downtime = rows[0];
    if (!downtime) throw new Error("Downtime record not found");
    if (!downtime.assetId) throw new Error("A production asset is required before creating a maintenance ticket");
    if (!downtime.maintenanceRequired) throw new Error("Selected downtime reason does not require maintenance");
    const active = await tx<Array<{ id: string; ticketNo: string }>>`SELECT id, "ticketNo" FROM "MaintenanceTicket" WHERE "productionDowntimeId" = ${input.id} AND status NOT IN ('CLOSED','CANCELLED','REJECTED') AND "isArchived" = false LIMIT 1`;
    if (active[0] && !input.overrideDuplicate) throw new Error(`Active ticket ${active[0].ticketNo} already exists for this downtime`);
    const ticketId = randomUUID();
    const ticketNo = await nextMaintenanceDocumentNumber(tx, "MT", "Maintenance Ticket");
    const problem = downtime.description || downtime.failureCause || `${downtime.reasonName ?? "Machine"} downtime ${downtime.downtimeNo ?? downtime.id}`;
    await tx`INSERT INTO "MaintenanceTicket" (id, "ticketNo", "requestDate", "assetId", "locationId", "departmentId", "requestedById", type, priority, "problemDescription", "failureDate", "productionDowntimeId", "productionBatchId", "shiftSessionId", status, "approvalStatus", remarks, "isArchived", "createdAt", "updatedAt") VALUES (${ticketId}, ${ticketNo}, NOW(), ${downtime.assetId}, ${downtime.locationId}, ${downtime.departmentId}, ${input.requestedById}, 'BREAKDOWN', 'HIGH', ${problem}, ${new Date(downtime.startTime)}, ${input.id}, ${downtime.productionBatchId}, ${downtime.shiftSessionId}, 'DRAFT', 'PENDING', ${input.remarks?.trim() || `Created from ${downtime.downtimeNo ?? input.id}`}, false, NOW(), NOW())`;
    await tx`UPDATE "ProductionDowntime" SET "maintenanceTicketId" = ${ticketId}, status = 'MAINTENANCE_REQUESTED', "updatedAt" = NOW() WHERE id = ${input.id}`;
    await writeProductionAudit(tx, input.requestedById, "maintenance.ticket", "CREATE_FROM_DOWNTIME", ticketId, { ticketNo, productionDowntimeId: input.id });
    await writeProductionHistory(tx, "maintenance.ticket", ticketId, "CREATE_FROM_DOWNTIME", input.requestedById, ticketNo);
    return { id: ticketId, ticketNo, productionDowntimeId: input.id };
  });
}

export async function closeDowntime(input: { id: string; closedById: string; remarks?: string | null }) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ status: string; endTime: string | null; maintenanceRequired: boolean; ticketStatus: string | null }>>`SELECT pd.status, pd."endTime"::text AS "endTime", pd."maintenanceRequired", mt.status::text AS "ticketStatus" FROM "ProductionDowntime" pd LEFT JOIN "MaintenanceTicket" mt ON mt.id = pd."maintenanceTicketId" OR mt."productionDowntimeId" = pd.id WHERE pd.id = ${input.id} LIMIT 1 FOR UPDATE`;
    const record = rows[0];
    if (!record) throw new Error("Downtime record not found");
    if (!record.endTime) throw new Error("Stop downtime before closing it");
    if (record.maintenanceRequired && record.ticketStatus && !["CLOSED", "CANCELLED", "REJECTED"].includes(record.ticketStatus)) throw new Error("Linked maintenance ticket must be closed first");
    await tx`UPDATE "ProductionDowntime" SET status = 'CLOSED', "closedById" = ${input.closedById}, remarks = CASE WHEN ${input.remarks?.trim() || null} IS NULL THEN remarks WHEN remarks IS NULL OR remarks = '' THEN ${input.remarks?.trim() || null} ELSE remarks || E'\n' || ${input.remarks?.trim() || null} END, "updatedAt" = NOW() WHERE id = ${input.id}`;
    await writeProductionAudit(tx, input.closedById, "production.downtime", "CLOSE", input.id, { remarks: input.remarks });
    await writeProductionHistory(tx, "production.downtime", input.id, "CLOSE", input.closedById, input.remarks ?? "Downtime closed");
    return { id: input.id, status: "CLOSED" };
  });
}

export async function updateDowntime(input:{id:string;failureCause?:string|null;description?:string|null;operatorId?:string|null;plannedProductionRate?:number|null;actualLostQty?:number|null;remarks?:string|null;updatedById:string}){
  return sql.begin(async tx=>{
    const rows=await tx<Array<{status:string}>>`SELECT status FROM "ProductionDowntime" WHERE id=${input.id} LIMIT 1 FOR UPDATE`;
    if(!rows[0])throw new Error("Downtime record not found");
    if(rows[0].status!=="OPEN")throw new Error("Only open downtime can be edited");
    await tx`UPDATE "ProductionDowntime" SET "failureCause"=${input.failureCause?.trim()||null},description=${input.description?.trim()||null},"operatorId"=${input.operatorId||null},"plannedProductionRate"=${input.plannedProductionRate==null?null:Number(input.plannedProductionRate)},"actualLostQty"=${input.actualLostQty==null?null:Number(input.actualLostQty)},remarks=${input.remarks?.trim()||null},"updatedAt"=NOW() WHERE id=${input.id}`;
    await writeProductionAudit(tx,input.updatedById,"production.downtime","UPDATE",input.id,input);
    await writeProductionHistory(tx,"production.downtime",input.id,"UPDATE",input.updatedById,input.remarks??"Downtime details updated");
  });
}
