import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import {
  nextProductionDocumentNumber,
  normalizeProductionStatus,
  type Tx,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";
import { getBatchCostReportRows } from "@/services/production/production-costing.service";
import {
  releaseShiftMachines,
  syncPrimaryMachineAssignment,
} from "@/services/production/machine-assignment.service";

export interface ShiftAttendanceInput {
  userId?: string;
  displayName?: string;
  role?: string;
  present?: boolean;
  remarks?: string;
}

export interface ShiftSessionPayload {
  productionDate: string;
  shiftCode: string;
  locationId: string;
  remarks?: string;
  startedById: string;
  attendance: ShiftAttendanceInput[];
}

async function writeAttendance(tx: Tx, shiftSessionId: string, attendance: ShiftAttendanceInput[]) {
  for (const row of attendance) {
    const displayName = row.displayName?.trim() || null;
    const userId = row.userId?.trim() || null;
    if (!userId && !displayName) continue;
    await tx`
      INSERT INTO "ShiftAttendance" (id, "shiftSessionId", "userId", "displayName", role, present, remarks)
      VALUES (
        ${randomUUID()},
        ${shiftSessionId},
        ${userId},
        ${displayName},
        ${row.role ?? null},
        true,
        ${row.remarks ?? null}
      )
    `;
  }
  await tx`
    DELETE FROM "DailyAttendance"
    WHERE "shiftSessionId" = ${shiftSessionId}
      AND "sourceType" = 'SHIFT'
  `;
}

async function ensureNoDuplicateActiveSession(tx: Tx, productionDate: string, shiftCode: string, locationId: string, currentId?: string) {
  const rows = await tx<Array<{ id: string }>>`
    SELECT id
    FROM "ShiftSession"
    WHERE DATE("productionDate") = DATE(${new Date(productionDate)})
      AND "shiftCode" = ${shiftCode}
      AND "locationId" = ${locationId}
      AND status = 'ACTIVE'
      ${currentId ? tx`AND id <> ${currentId}` : tx``}
    LIMIT 1
  `;
  if (rows[0]?.id) {
    throw new Error("An active shift session already exists for this date, shift, and production location");
  }
}

export async function listShiftSessions() {
  try {
    return await sql<Array<{
      id: string;
      publicId: number;
      sessionNo: string;
      productionDate: string;
      shiftCode: string;
      locationName: string;
      status: string;
      startedByName: string | null;
      startedAt: string | null;
      endedAt: string | null;
      employeeCount: number;
    }>>`
      SELECT
        ss.id,
        ss."publicId",
        ss."sessionNo",
        ss."productionDate"::text AS "productionDate",
        ss."shiftCode",
        l."locationName",
        ss.status::text AS status,
        u.name AS "startedByName",
        ss."startedAt"::text AS "startedAt",
        ss."endedAt"::text AS "endedAt",
        COALESCE(COUNT(sa.id), 0)::int AS "employeeCount"
      FROM "ShiftSession" ss
      INNER JOIN "Location" l ON l.id = ss."locationId"
      LEFT JOIN "User" u ON u.id = ss."startedById"
      LEFT JOIN "ShiftAttendance" sa ON sa."shiftSessionId" = ss.id
      GROUP BY ss.id, l."locationName", u.name
      ORDER BY ss."productionDate" DESC, ss."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getShiftSessionById(key: string) {
  const rows = await sql<Array<{
    id: string;
    publicId: number;
    sessionNo: string;
    productionDate: string;
    shiftCode: string;
    locationId: string;
    locationName: string;
    status: string;
    startedById: string | null;
    startedByName: string | null;
    startedAt: string | null;
    endedById: string | null;
    endedByName: string | null;
    endedAt: string | null;
    remarks: string | null;
  }>>`
    SELECT
      ss.id,
      ss."publicId",
      ss."sessionNo",
      ss."productionDate"::text AS "productionDate",
      ss."shiftCode",
      ss."locationId",
      l."locationName",
      ss.status::text AS status,
      ss."startedById",
      su.name AS "startedByName",
      ss."startedAt"::text AS "startedAt",
      ss."endedById",
      eu.name AS "endedByName",
      ss."endedAt"::text AS "endedAt",
      ss.remarks
    FROM "ShiftSession" ss
    INNER JOIN "Location" l ON l.id = ss."locationId"
    LEFT JOIN "User" su ON su.id = ss."startedById"
    LEFT JOIN "User" eu ON eu.id = ss."endedById"
    WHERE ${isPublicIdParam(key) ? sql`ss."publicId" = ${Number(key)}` : sql`ss.id = ${key}`}
    LIMIT 1
  `;
  const header = rows[0];
  if (!header) return null;
  const id = header.id;

  const [attendance, issues, returns, batches, downtimes, qcTests, costRows] = await Promise.all([
    sql<Array<{ userId: string | null; userName: string; displayName: string | null; role: string | null; present: boolean; remarks: string | null }>>`
      SELECT sa."userId", COALESCE(NULLIF(sa."displayName", ''), u.name, '') AS "userName", sa."displayName", sa.role, sa.present, sa.remarks
      FROM "ShiftAttendance" sa
      LEFT JOIN "User" u ON u.id = sa."userId"
      WHERE sa."shiftSessionId" = ${id}
      ORDER BY COALESCE(NULLIF(sa."displayName", ''), u.name, '') ASC
    `,
    sql<Array<{ id: string; issueNo: string; status: string; itemCount: number; issuedQty: number }>>`
      SELECT pmi.id, pmi."issueNo", pmi.status::text AS status,
        COALESCE(COUNT(pmii.id), 0)::int AS "itemCount",
        COALESCE(SUM(pmii."issuedQty"), 0)::float AS "issuedQty"
      FROM "ProductionMaterialIssue" pmi
      LEFT JOIN "ProductionMaterialIssueItem" pmii ON pmii."issueId" = pmi.id
      WHERE pmi."shiftSessionId" = ${id}
      GROUP BY pmi.id
      ORDER BY pmi."createdAt" DESC
    `,
    sql<Array<{ id: string; returnNo: string; status: string; itemCount: number }>>`
      SELECT pmr.id, pmr."returnNo", pmr.status::text AS status, COALESCE(COUNT(pmri.id), 0)::int AS "itemCount"
      FROM "ProductionMaterialReturn" pmr
      LEFT JOIN "ProductionMaterialReturnItem" pmri ON pmri."returnId" = pmr.id
      WHERE pmr."shiftSessionId" = ${id}
      GROUP BY pmr.id
      ORDER BY pmr."createdAt" DESC
    `,
    sql<Array<{ id: string; publicId: number; batchNo: string; status: string; producedQty: number; acceptedQty: number; rejectedQty: number; wastageQty: number; finishedGoodCode: string; finishedGoodName: string; machineName: string | null }>>`
      SELECT pb.id, pb."publicId", pb."batchNo", pb.status::text AS status, pb."producedQty", pb."acceptedQty", pb."rejectedQty", pb."wastageQty",
        i."itemCode" AS "finishedGoodCode", i."itemName" AS "finishedGoodName",
        CASE WHEN a.id IS NULL THEN NULL ELSE a."assetCode" || ' - ' || a."assetName" END AS "machineName"
      FROM "ProductionBatch" pb
      INNER JOIN "Item" i ON i.id = pb."finishedGoodId"
      LEFT JOIN "Asset" a ON a.id = pb."machineId"
      WHERE pb."shiftSessionId" = ${id}
      ORDER BY pb."createdAt" DESC
    `,
    sql<Array<{ id: string; reason: string; durationMinutes: number; machine: string | null; batchNo: string | null; maintenanceTicketNo: string | null; status: string }>>`
      SELECT pd.id, pd.reason::text AS reason, pd."durationMinutes",
        CASE WHEN a.id IS NULL THEN NULL ELSE a."assetCode" || ' - ' || a."assetName" END AS machine,
        pb."batchNo", mt."ticketNo" AS "maintenanceTicketNo", pd.status
      FROM "ProductionDowntime" pd
      LEFT JOIN "Asset" a ON a.id = pd."assetId"
      LEFT JOIN "ProductionBatch" pb ON pb.id = pd."productionBatchId"
      LEFT JOIN "MaintenanceTicket" mt ON mt."productionDowntimeId" = pd.id
      WHERE pd."shiftSessionId" = ${id}
      ORDER BY pd."createdAt" DESC
    `,
    sql<Array<{ id: string; testNo: string; testType: string; result: string; status: string }>>`
      SELECT qt.id, qt."testNo", qt."testType", qt.result::text AS result, qt.status
      FROM "QCTest" qt
      INNER JOIN "ProductionBatch" pb ON pb.id = qt."productionBatchId"
      WHERE pb."shiftSessionId" = ${id}
      ORDER BY qt."createdAt" DESC
    `,
    getBatchCostReportRows({ shiftSessionId: id }),
  ]);

  return { ...header, attendance, issues, returns, batches, downtimes, qcTests, costRows };
}

export async function shiftBrowserPath(key: string, suffix = "") {
  const rows = await sql<Array<{ publicId: number }>>`
    SELECT "publicId"
    FROM "ShiftSession"
    WHERE ${isPublicIdParam(key) ? sql`"publicId" = ${Number(key)}` : sql`id = ${key}`}
    LIMIT 1
  `;
  if (!rows[0]) return "/production/shift-sessions";
  return `/production/shift-sessions/${rows[0].publicId}${suffix}`;
}

export async function startShiftSession(payload: ShiftSessionPayload) {
  return sql.begin(async (tx) => {
    await ensureNoDuplicateActiveSession(tx, payload.productionDate, payload.shiftCode, payload.locationId);
    const id = randomUUID();
    const sessionNo = await nextProductionDocumentNumber(tx, "SES", "Shift Session");
    await tx`
      INSERT INTO "ShiftSession" (
        id, "sessionNo", "productionDate", "shiftCode", "locationId", status,
        "startedById", "startedAt", remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${sessionNo},
        ${new Date(payload.productionDate)},
        ${payload.shiftCode},
        ${payload.locationId},
        'ACTIVE',
        ${payload.startedById},
        NOW(),
        ${payload.remarks ?? null},
        NOW(),
        NOW()
      )
    `;
    await syncPrimaryMachineAssignment(tx, {
      shiftSessionId: id,
      machineId: null,
      locationId: payload.locationId,
      assignedById: payload.startedById,
      remarks: payload.remarks,
    });
    await writeAttendance(tx, id, payload.attendance);
    await writeProductionAudit(tx, payload.startedById, "shift.session", "CREATE", id, payload);
    await writeProductionHistory(tx, "shift.session", id, "CREATE", payload.startedById, sessionNo);
    const created = await tx<Array<{ publicId: number }>>`
      SELECT "publicId" FROM "ShiftSession" WHERE id = ${id} LIMIT 1
    `;
    return { id, publicId: created[0]?.publicId, sessionNo };
  });
}

export async function updateShiftSession(id: string, payload: ShiftSessionPayload) {
  return sql.begin(async (tx) => {
    await ensureNoDuplicateActiveSession(tx, payload.productionDate, payload.shiftCode, payload.locationId, id);
    await tx`
      UPDATE "ShiftSession"
      SET
        "productionDate" = ${new Date(payload.productionDate)},
        "shiftCode" = ${payload.shiftCode},
        "locationId" = ${payload.locationId},
        remarks = ${payload.remarks ?? null},
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND status <> 'POSTED'
        AND status <> 'CANCELLED'
    `;
    await syncPrimaryMachineAssignment(tx, {
      shiftSessionId: id,
      machineId: null,
      locationId: payload.locationId,
      assignedById: payload.startedById,
      remarks: payload.remarks,
    });
    await tx`DELETE FROM "ShiftAttendance" WHERE "shiftSessionId" = ${id}`;
    await writeAttendance(tx, id, payload.attendance);
    await writeProductionAudit(tx, payload.startedById, "shift.session", "UPDATE", id, payload);
    await writeProductionHistory(tx, "shift.session", id, "UPDATE", payload.startedById, payload.shiftCode);
    const updated = await tx<Array<{ publicId: number }>>`
      SELECT "publicId" FROM "ShiftSession" WHERE id = ${id} LIMIT 1
    `;
    return { id, publicId: updated[0]?.publicId };
  });
}

export async function deleteDraftShiftSession(id: string, userId: string, reason: string) {
  const note = reason.trim();
  if (!note) throw new Error("A reason is required to delete a draft shift");
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; sessionNo: string; status: string }>>`
      SELECT id, "sessionNo", status::text AS status
      FROM "ShiftSession"
      WHERE id = ${id}
      LIMIT 1
      FOR UPDATE
    `;
    const session = rows[0];
    if (!session) throw new Error("Shift session not found");
    const dependents = await tx<Array<{ batches: number; issues: number; returns: number; downtimes: number; tests: number; tickets: number }>>`
      SELECT
        (SELECT COUNT(*) FROM "ProductionBatch" WHERE "shiftSessionId" = ${id})::int AS batches,
        (SELECT COUNT(*) FROM "ProductionMaterialIssue" WHERE "shiftSessionId" = ${id})::int AS issues,
        (SELECT COUNT(*) FROM "ProductionMaterialReturn" WHERE "shiftSessionId" = ${id})::int AS returns,
        (SELECT COUNT(*) FROM "ProductionDowntime" WHERE "shiftSessionId" = ${id})::int AS downtimes,
        (SELECT COUNT(*) FROM "QCTest" WHERE "shiftSessionId" = ${id})::int AS tests,
        (SELECT COUNT(*) FROM "MaintenanceTicket" WHERE "shiftSessionId" = ${id})::int AS tickets
    `;
    const blocked = dependents[0];
    const blockedCount = Number(blocked?.batches ?? 0) + Number(blocked?.issues ?? 0) + Number(blocked?.returns ?? 0) + Number(blocked?.downtimes ?? 0) + Number(blocked?.tests ?? 0) + Number(blocked?.tickets ?? 0);
    if (blockedCount > 0) {
      throw new Error(`${session.sessionNo} has materials, output, downtime, or quality records and cannot be deleted.`);
    }
    await writeProductionAudit(tx, userId, "shift.session", "DELETE", id, { sessionNo: session.sessionNo, status: session.status, reason: note });
    await releaseShiftMachines(tx, id);
    await tx`DELETE FROM "ShiftAttendance" WHERE "shiftSessionId" = ${id}`;
    await tx`DELETE FROM "ProductionMachineAssignment" WHERE "shiftSessionId" = ${id}`;
    await tx`DELETE FROM "ShiftSession" WHERE id = ${id}`;
    return { id, sessionNo: session.sessionNo };
  });
}

export async function endShiftSession(id: string, userId: string, remarks?: string) {
  await sql.begin(async (tx) => {
    const openDocuments = await tx<Array<{ issues: number; returns: number }>>`
      SELECT
        (SELECT COUNT(*) FROM "ProductionMaterialIssue" WHERE "shiftSessionId" = ${id} AND status::text NOT IN ('POSTED', 'CANCELLED'))::int AS issues,
        (SELECT COUNT(*) FROM "ProductionMaterialReturn" WHERE "shiftSessionId" = ${id} AND status::text NOT IN ('POSTED', 'CANCELLED'))::int AS returns
    `;
    const open = openDocuments[0];
    if (Number(open?.issues ?? 0) + Number(open?.returns ?? 0) > 0) {
      throw new Error("Post or cancel open material issues and returns before closing this shift.");
    }
    const updated = await tx<Array<{ id: string }>>`
      UPDATE "ShiftSession"
      SET status = 'COMPLETED', "endedById" = ${userId}, "endedAt" = NOW(), remarks = COALESCE(${remarks ?? null}, remarks), "updatedAt" = NOW()
      WHERE id = ${id}
        AND status = 'ACTIVE'
      RETURNING id
    `;
    if (!updated[0]) throw new Error("Only an active shift can be closed.");
    await releaseShiftMachines(tx, id);
    await writeProductionAudit(tx, userId, "shift.session", "END", id, { id, remarks });
    await writeProductionHistory(tx, "shift.session", id, "END", userId, remarks ?? "Shift ended");
  });
  return { id };
}
