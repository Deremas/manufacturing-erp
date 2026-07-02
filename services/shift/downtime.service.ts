import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { writeProductionAudit, writeProductionHistory } from "@/services/production/production-shared.service";

export interface DowntimePayload {
  shiftSessionId: string;
  startTime: string;
  endTime: string;
  reason: "MACHINE_BREAKDOWN" | "POWER_INTERRUPTION" | "MATERIAL_SHORTAGE" | "QUALITY_ISSUE" | "OPERATOR_DELAY" | "MAINTENANCE" | "OTHER";
  machine?: string;
  remarks?: string;
  createdById: string;
}

export async function listDowntimeRows(shiftSessionId?: string) {
  try {
    return await sql<Array<{
      id: string;
      shiftSessionId: string;
      sessionNo: string;
      productionDate: string;
      shiftCode: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      reason: string;
      machine: string | null;
      remarks: string | null;
    }>>`
      SELECT
        pd.id,
        pd."shiftSessionId",
        ss."sessionNo",
        ss."productionDate"::text AS "productionDate",
        ss."shiftCode",
        pd."startTime"::text AS "startTime",
        pd."endTime"::text AS "endTime",
        pd."durationMinutes",
        pd.reason::text AS reason,
        pd.machine,
        pd.remarks
      FROM "ProductionDowntime" pd
      INNER JOIN "ShiftSession" ss ON ss.id = pd."shiftSessionId"
      ${shiftSessionId ? sql`WHERE pd."shiftSessionId" = ${shiftSessionId}` : sql``}
      ORDER BY pd."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function createDowntime(payload: DowntimePayload) {
  const start = new Date(payload.startTime);
  const end = new Date(payload.endTime);
  const durationMinutes = Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0);
  if (durationMinutes <= 0) throw new Error("Downtime end time must be after start time");

  return sql.begin(async (tx) => {
    const id = randomUUID();
    await tx`
      INSERT INTO "ProductionDowntime" (
        id, "shiftSessionId", "startTime", "endTime", "durationMinutes", reason, machine, remarks, "createdById", "createdAt"
      )
      VALUES (
        ${id},
        ${payload.shiftSessionId},
        ${start},
        ${end},
        ${durationMinutes},
        ${payload.reason}::"DowntimeReason",
        ${payload.machine ?? null},
        ${payload.remarks ?? null},
        ${payload.createdById},
        NOW()
      )
    `;
    await writeProductionAudit(tx, payload.createdById, "shift.downtime", "CREATE", id, payload);
    await writeProductionHistory(tx, "shift.downtime", id, "CREATE", payload.createdById, payload.reason);
    return { id };
  });
}
