import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  nextProductionDocumentNumber,
  normalizeProductionStatus,
  type Tx,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";
import { getBatchCostReportRows } from "@/services/production/production-costing.service";

export interface ShiftAttendanceInput {
  userId: string;
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
    if (!row.userId) continue;
    await tx`
      INSERT INTO "ShiftAttendance" (id, "shiftSessionId", "userId", role, present, remarks)
      VALUES (
        ${randomUUID()},
        ${shiftSessionId},
        ${row.userId},
        ${row.role ?? null},
        ${row.present ?? true},
        ${row.remarks ?? null}
      )
    `;
  }
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
      sessionNo: string;
      productionDate: string;
      shiftCode: string;
      locationName: string;
      status: string;
      startedByName: string | null;
      startedAt: string | null;
      employeeCount: number;
    }>>`
      SELECT
        ss.id,
        ss."sessionNo",
        ss."productionDate"::text AS "productionDate",
        ss."shiftCode",
        l."locationName",
        ss.status::text AS status,
        u.name AS "startedByName",
        ss."startedAt"::text AS "startedAt",
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

export async function getShiftSessionById(id: string) {
  const rows = await sql<Array<{
    id: string;
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
    WHERE ss.id = ${id}
    LIMIT 1
  `;
  const header = rows[0];
  if (!header) return null;

  const [attendance, issues, returns, batches, downtimes, qcTests, costRows] = await Promise.all([
    sql<Array<{ userId: string; userName: string; role: string | null; present: boolean; remarks: string | null }>>`
      SELECT sa."userId", u.name AS "userName", sa.role, sa.present, sa.remarks
      FROM "ShiftAttendance" sa
      INNER JOIN "User" u ON u.id = sa."userId"
      WHERE sa."shiftSessionId" = ${id}
      ORDER BY u.name ASC
    `,
    sql<Array<{ id: string; issueNo: string; status: string; itemCount: number }>>`
      SELECT pmi.id, pmi."issueNo", pmi.status::text AS status, COALESCE(COUNT(pmii.id), 0)::int AS "itemCount"
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
    sql<Array<{ id: string; batchNo: string; status: string; producedQty: number; acceptedQty: number }>>`
      SELECT id, "batchNo", status::text AS status, "producedQty", "acceptedQty"
      FROM "ProductionBatch"
      WHERE "shiftSessionId" = ${id}
      ORDER BY "createdAt" DESC
    `,
    sql<Array<{ id: string; reason: string; durationMinutes: number; machine: string | null }>>`
      SELECT id, reason::text AS reason, "durationMinutes", machine
      FROM "ProductionDowntime"
      WHERE "shiftSessionId" = ${id}
      ORDER BY "createdAt" DESC
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
    await writeAttendance(tx, id, payload.attendance);
    await writeProductionAudit(tx, payload.startedById, "shift.session", "CREATE", id, payload);
    await writeProductionHistory(tx, "shift.session", id, "CREATE", payload.startedById, sessionNo);
    return { id, sessionNo };
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
    await tx`DELETE FROM "ShiftAttendance" WHERE "shiftSessionId" = ${id}`;
    await writeAttendance(tx, id, payload.attendance);
    await writeProductionAudit(tx, payload.startedById, "shift.session", "UPDATE", id, payload);
    await writeProductionHistory(tx, "shift.session", id, "UPDATE", payload.startedById, payload.shiftCode);
    return { id };
  });
}

export async function endShiftSession(id: string, userId: string, remarks?: string) {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "ShiftSession"
      SET status = 'COMPLETED', "endedById" = ${userId}, "endedAt" = NOW(), remarks = COALESCE(${remarks ?? null}, remarks), "updatedAt" = NOW()
      WHERE id = ${id}
        AND status = 'ACTIVE'
    `;
    await writeProductionAudit(tx, userId, "shift.session", "END", id, { id, remarks });
    await writeProductionHistory(tx, "shift.session", id, "END", userId, remarks ?? "Shift ended");
  });
  return { id };
}
