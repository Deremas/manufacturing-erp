import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { nextProductionDocumentNumber, writeProductionAudit, writeProductionHistory } from "@/services/production/production-shared.service";

export async function listNonconformities() {
  try {
    return await sql<Array<{
      id: string;
      ncNo: string;
      batchNo: string | null;
      itemCode: string | null;
      itemName: string | null;
      locationName: string | null;
      issueDescription: string;
      severity: string;
      reinspectionResult: string | null;
      status: string;
    }>>`
      SELECT
        nc.id,
        nc."ncNo",
        pb."batchNo" AS "batchNo",
        i."itemCode" AS "itemCode",
        i."itemName" AS "itemName",
        l."locationName" AS "locationName",
        nc."issueDescription",
        nc.severity,
        nc."reinspectionResult",
        nc.status
      FROM "QCNonconformity" nc
      LEFT JOIN "ProductionBatch" pb ON pb.id = nc."productionBatchId"
      LEFT JOIN "Item" i ON i.id = nc."itemId"
      LEFT JOIN "Location" l ON l.id = nc."locationId"
      ORDER BY nc."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function createNonconformity(payload: {
  productionBatchId?: string | null;
  itemId?: string | null;
  locationId?: string | null;
  issueDescription: string;
  severity: string;
  correctiveAction?: string;
  responsiblePersonId?: string | null;
  reinspectionResult?: string;
  remarks?: string;
  createdById: string;
}) {
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const ncNo = await nextProductionDocumentNumber(tx, "NC", "QC Nonconformity");
    await tx`
      INSERT INTO "QCNonconformity" (
        id, "ncNo", "productionBatchId", "itemId", "locationId", "issueDescription", severity,
        "correctiveAction", "responsiblePersonId", "reinspectionResult", status, "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${ncNo},
        ${payload.productionBatchId ?? null},
        ${payload.itemId ?? null},
        ${payload.locationId ?? null},
        ${payload.issueDescription},
        ${payload.severity},
        ${payload.correctiveAction ?? null},
        ${payload.responsiblePersonId ?? null},
        ${payload.reinspectionResult ?? "PENDING"},
        'OPEN',
        ${payload.createdById},
        NOW(),
        NOW()
      )
    `;
    await writeProductionAudit(tx, payload.createdById, "qc.nonconformity", "CREATE", id, payload);
    await writeProductionHistory(tx, "qc.nonconformity", id, "CREATE", payload.createdById, ncNo);
    return { id, ncNo };
  });
}

export async function closeNonconformity(id: string, userId: string, correctiveAction: string, reinspectionResult: string) {
  if (!correctiveAction.trim()) throw new Error("Closed nonconformity requires corrective action");
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "QCNonconformity"
      SET
        "correctiveAction" = ${correctiveAction},
        "reinspectionResult" = ${reinspectionResult},
        status = 'CLOSED',
        "closedById" = ${userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "qc.nonconformity", "CLOSE", id, { id, correctiveAction, reinspectionResult });
    await writeProductionHistory(tx, "qc.nonconformity", id, "CLOSE", userId, "Nonconformity closed");
  });
  return { id };
}
