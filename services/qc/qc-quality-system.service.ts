import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { nextProductionDocumentNumber, writeProductionAudit } from "@/services/production/production-shared.service";

function optional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function listCipRecords() {
  return sql<Array<Record<string, unknown>>>`
    SELECT record.*, location."locationName", asset."assetName"
    FROM "QCCipRecord" record
    LEFT JOIN "Location" location ON location.id = record."locationId"
    LEFT JOIN "Asset" asset ON asset.id = record."assetId"
    ORDER BY record."recordDate" DESC
  `;
}

export async function getCipRecord(key: string) {
  if (isPublicIdParam(key)) {
    const rows = await sql`SELECT * FROM "QCCipRecord" WHERE "publicId" = ${Number(key)} LIMIT 1`;
    return rows[0] ?? null;
  }
  const rows = await listCipRecords();
  return rows.find((row) => row.id === key) ?? (await sql`SELECT * FROM "QCCipRecord" WHERE id = ${key} LIMIT 1`)[0] ?? null;
}

export async function saveCipRecord(payload: Record<string, unknown>, userId: string, id?: string) {
  return sql.begin(async (tx) => {
    const recordDate = new Date(String(payload.recordDate ?? ""));
    if (Number.isNaN(recordDate.getTime())) throw new Error("Date is required");
    const readings = JSON.stringify(payload.readings ?? {});
    if (id) {
      await tx`
        UPDATE "QCCipRecord"
        SET "recordDate" = ${recordDate}, "shiftCode" = ${optional(payload.shiftCode)}, "locationId" = ${optional(payload.locationId)},
            "assetId" = ${optional(payload.assetId)}, "cycleNo" = ${optional(payload.cycleNo)}, "startTime" = ${optional(payload.startTime)},
            "endTime" = ${optional(payload.endTime)}, remarks = ${optional(payload.remarks)}, readings = ${readings}, "updatedAt" = NOW()
        WHERE id = ${id} AND status = 'DRAFT'
      `;
      return id;
    }
    const recordNo = await nextProductionDocumentNumber(tx, "QC-CIP", "QC CIP Record");
    const recordId = randomUUID();
    await tx`
      INSERT INTO "QCCipRecord" (
        id, "recordNo", "recordDate", "shiftCode", "locationId", "assetId", "cycleNo", "startTime", "endTime",
        "operatorId", status, remarks, readings, "createdAt", "updatedAt"
      )
      VALUES (
        ${recordId}, ${recordNo}, ${recordDate}, ${optional(payload.shiftCode)}, ${optional(payload.locationId)}, ${optional(payload.assetId)},
        ${optional(payload.cycleNo)}, ${optional(payload.startTime)}, ${optional(payload.endTime)}, ${userId}, 'DRAFT', ${optional(payload.remarks)}, ${readings}, NOW(), NOW()
      )
    `;
    await writeProductionAudit(tx, userId, "qc", "CREATE", recordId, { recordNo });
    return recordId;
  });
}

export async function transitionCip(id: string, userId: string, action: "SUBMIT" | "VERIFY" | "APPROVE") {
  if (action === "SUBMIT") {
    await sql`UPDATE "QCCipRecord" SET status = 'SUBMITTED', "updatedAt" = NOW() WHERE id = ${id} AND status = 'DRAFT'`;
  } else if (action === "VERIFY") {
    await sql`UPDATE "QCCipRecord" SET status = 'VERIFIED', "verifiedById" = ${userId}, "updatedAt" = NOW() WHERE id = ${id} AND status = 'SUBMITTED'`;
  } else {
    await sql`UPDATE "QCCipRecord" SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW() WHERE id = ${id} AND status IN ('DRAFT', 'SUBMITTED', 'VERIFIED')`;
  }
  return getCipRecord(id);
}

export async function listRetentionSamples() {
  return sql<Array<Record<string, unknown>>>`
    SELECT sample.*, item."itemName"
    FROM "QCRetentionSample" sample
    LEFT JOIN "Item" item ON item.id = sample."itemId"
    ORDER BY sample."recordDate" DESC
  `;
}

export async function getRetentionSample(key: string) {
  if (isPublicIdParam(key)) {
    const rows = await sql`SELECT * FROM "QCRetentionSample" WHERE "publicId" = ${Number(key)} LIMIT 1`;
    return rows[0] ?? null;
  }
  const rows = await listRetentionSamples();
  return rows.find((row) => row.id === key) ?? (await sql`SELECT * FROM "QCRetentionSample" WHERE id = ${key} LIMIT 1`)[0] ?? null;
}

export async function saveRetentionSample(payload: Record<string, unknown>, userId: string, id?: string) {
  return sql.begin(async (tx) => {
    const recordDate = new Date(String(payload.recordDate ?? ""));
    if (Number.isNaN(recordDate.getTime())) throw new Error("Date is required");
    if (id) {
      await tx`
        UPDATE "QCRetentionSample"
        SET "recordDate" = ${recordDate}, "itemId" = ${optional(payload.itemId)}, "batchNo" = ${optional(payload.batchNo)},
            "shiftCode" = ${optional(payload.shiftCode)}, quantity = ${payload.quantity == null ? null : Number(payload.quantity)},
            "storageLocation" = ${optional(payload.storageLocation)}, "retainUntil" = ${payload.retainUntil ? new Date(String(payload.retainUntil)) : null},
            condition = ${optional(payload.condition)}, "disposalDate" = ${payload.disposalDate ? new Date(String(payload.disposalDate)) : null},
            status = ${optional(payload.status) ?? "STORED"}, remarks = ${optional(payload.remarks)}, "updatedAt" = NOW()
        WHERE id = ${id}
      `;
      return id;
    }
    const sampleNo = await nextProductionDocumentNumber(tx, "QC-RET", "QC Retention Sample");
    const recordId = randomUUID();
    await tx`
      INSERT INTO "QCRetentionSample" (
        id, "sampleNo", "recordDate", "itemId", "batchNo", "shiftCode", quantity, "storageLocation", "retainUntil",
        "storedById", condition, status, remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${recordId}, ${sampleNo}, ${recordDate}, ${optional(payload.itemId)}, ${optional(payload.batchNo)}, ${optional(payload.shiftCode)},
        ${payload.quantity == null ? null : Number(payload.quantity)}, ${optional(payload.storageLocation)},
        ${payload.retainUntil ? new Date(String(payload.retainUntil)) : null}, ${userId}, ${optional(payload.condition)},
        ${optional(payload.status) ?? "STORED"}, ${optional(payload.remarks)}, NOW(), NOW()
      )
    `;
    await writeProductionAudit(tx, userId, "qc", "CREATE", recordId, { sampleNo });
    return recordId;
  });
}

export async function listHoldDecisions() {
  return sql<Array<Record<string, unknown>>>`
    SELECT decision.*, item."itemName", location."locationName"
    FROM "QCHoldDecision" decision
    LEFT JOIN "Item" item ON item.id = decision."itemId"
    LEFT JOIN "Location" location ON location.id = decision."locationId"
    ORDER BY decision."recordDate" DESC
  `;
}

export async function getHoldDecision(key: string) {
  if (isPublicIdParam(key)) {
    const rows = await sql`SELECT * FROM "QCHoldDecision" WHERE "publicId" = ${Number(key)} LIMIT 1`;
    return rows[0] ?? null;
  }
  const rows = await listHoldDecisions();
  return rows.find((row) => row.id === key) ?? (await sql`SELECT * FROM "QCHoldDecision" WHERE id = ${key} LIMIT 1`)[0] ?? null;
}

export async function saveHoldDecision(payload: Record<string, unknown>, userId: string, id?: string) {
  const decision = String(payload.decision ?? "").toUpperCase();
  if (!["HOLD", "RELEASE", "REJECT", "REWORK"].includes(decision)) throw new Error("Decision must be HOLD, RELEASE, REJECT, or REWORK");
  if (!String(payload.reason ?? "").trim()) throw new Error("Reason is required");
  return sql.begin(async (tx) => {
    const recordDate = new Date(String(payload.recordDate ?? ""));
    if (Number.isNaN(recordDate.getTime())) throw new Error("Date is required");
    if (id) {
      await tx`
        UPDATE "QCHoldDecision"
        SET "recordDate" = ${recordDate}, "itemId" = ${optional(payload.itemId)}, "batchNo" = ${optional(payload.batchNo)},
            "shiftCode" = ${optional(payload.shiftCode)}, "locationId" = ${optional(payload.locationId)},
            quantity = ${payload.quantity == null ? null : Number(payload.quantity)}, "qcRecordId" = ${optional(payload.qcRecordId)},
            decision = ${decision}, reason = ${String(payload.reason)}, remarks = ${optional(payload.remarks)}, "updatedAt" = NOW()
        WHERE id = ${id} AND status = 'DRAFT'
      `;
      return id;
    }
    const decisionNo = await nextProductionDocumentNumber(tx, "QC-HLD", "QC Hold Decision");
    const recordId = randomUUID();
    await tx`
      INSERT INTO "QCHoldDecision" (
        id, "decisionNo", "recordDate", "itemId", "batchNo", "shiftCode", "locationId", quantity, "qcRecordId",
        decision, reason, "requestedById", status, remarks, "createdAt", "updatedAt"
      )
      VALUES (
        ${recordId}, ${decisionNo}, ${recordDate}, ${optional(payload.itemId)}, ${optional(payload.batchNo)}, ${optional(payload.shiftCode)},
        ${optional(payload.locationId)}, ${payload.quantity == null ? null : Number(payload.quantity)}, ${optional(payload.qcRecordId)},
        ${decision}, ${String(payload.reason)}, ${userId}, 'DRAFT', ${optional(payload.remarks)}, NOW(), NOW()
      )
    `;
    await writeProductionAudit(tx, userId, "qc", "CREATE", recordId, { decisionNo });
    return recordId;
  });
}

export async function approveHoldDecision(id: string, userId: string) {
  await sql`UPDATE "QCHoldDecision" SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW() WHERE id = ${id}`;
  return (await sql`SELECT * FROM "QCHoldDecision" WHERE id = ${id}`)[0] ?? null;
}

export async function listManagementReviews() {
  return sql<Array<Record<string, unknown>>>`
    SELECT review.*, prepared.name AS "preparedByName"
    FROM "QCManagementReview" review
    LEFT JOIN "User" prepared ON prepared.id = review."preparedById"
    ORDER BY review."reviewDate" DESC
  `;
}

export async function getManagementReview(key: string) {
  const header = (await sql<Array<Record<string, unknown>>>`
    SELECT review.*, prepared.name AS "preparedByName"
    FROM "QCManagementReview" review
    LEFT JOIN "User" prepared ON prepared.id = review."preparedById"
    WHERE ${isPublicIdParam(key) ? sql`review."publicId" = ${Number(key)}` : sql`review.id = ${key}`}
    LIMIT 1
  `)[0];
  if (!header) return null;
  const id = String(header.id);
  const [participants, results] = await Promise.all([
    sql`SELECT * FROM "QCManagementReviewParticipant" WHERE "reviewId" = ${id}`,
    sql`SELECT * FROM "QCManagementReviewResult" WHERE "reviewId" = ${id}`,
  ]);
  return { ...header, participants, results };
}

export async function saveManagementReview(payload: Record<string, unknown>, userId: string, id?: string) {
  const reviewDate = new Date(String(payload.reviewDate ?? payload.date ?? ""));
  if (Number.isNaN(reviewDate.getTime())) throw new Error("Date is required");
  const participants = Array.isArray(payload.participants) ? payload.participants as Array<Record<string, unknown>> : [];
  const results = Array.isArray(payload.results) ? payload.results as Array<Record<string, unknown>> : [];
  return sql.begin(async (tx) => {
    let reviewId = id;
    if (!reviewId) {
      const minuteNo = optional(payload.minuteNo) ?? await nextProductionDocumentNumber(tx, "QC-MRV", "QC Management Review");
      reviewId = randomUUID();
      await tx`
        INSERT INTO "QCManagementReview" (id, "minuteNo", "reviewDate", duration, place, "preparedById", "gmRemark", "draftAgenda", "approvedAgenda", "rejectReason", status, "createdAt", "updatedAt")
        VALUES (${reviewId}, ${minuteNo}, ${reviewDate}, ${optional(payload.duration)}, ${optional(payload.place)}, ${userId}, ${optional(payload.gmRemark)}, ${optional(payload.draftAgenda)}, ${optional(payload.approvedAgenda)}, ${optional(payload.rejectReason)}, 'DRAFT', NOW(), NOW())
      `;
    } else {
      await tx`
        UPDATE "QCManagementReview"
        SET "minuteNo" = COALESCE(${optional(payload.minuteNo)}, "minuteNo"), "reviewDate" = ${reviewDate}, duration = ${optional(payload.duration)}, place = ${optional(payload.place)},
            "gmRemark" = ${optional(payload.gmRemark)}, "draftAgenda" = ${optional(payload.draftAgenda)},
            "approvedAgenda" = ${optional(payload.approvedAgenda)}, "rejectReason" = ${optional(payload.rejectReason)}, "updatedAt" = NOW()
        WHERE id = ${reviewId} AND status IN ('DRAFT', 'REJECTED')
      `;
      await tx`DELETE FROM "QCManagementReviewParticipant" WHERE "reviewId" = ${reviewId}`;
      await tx`DELETE FROM "QCManagementReviewResult" WHERE "reviewId" = ${reviewId}`;
    }
    for (const participant of participants.filter((row) => String(row.name ?? "").trim())) {
      await tx`
        INSERT INTO "QCManagementReviewParticipant" (id, "reviewId", "userId", name, title, contribution)
        VALUES (${randomUUID()}, ${reviewId}, ${optional(rowUserId(participant))}, ${String(participant.name)}, ${optional(participant.title)}, ${optional(participant.contribution)})
      `;
    }
    for (const result of results.filter((row) => String(row.agenda ?? "").trim())) {
      await tx`
        INSERT INTO "QCManagementReviewResult" (id, "reviewId", agenda, resolution, responsible, "timeFrame")
        VALUES (${randomUUID()}, ${reviewId}, ${String(result.agenda)}, ${optional(result.resolution)}, ${optional(result.responsible)}, ${optional(result.timeFrame)})
      `;
    }
    await writeProductionAudit(tx, userId, "qc", id ? "UPDATE" : "CREATE", reviewId, {});
    return reviewId;
  });
}

function rowUserId(row: Record<string, unknown>) {
  return optional(row.userId);
}

export async function submitManagementReview(id: string, userId: string) {
  await sql`UPDATE "QCManagementReview" SET status = 'SUBMITTED', "updatedAt" = NOW() WHERE id = ${id} AND status = 'DRAFT'`;
  await sql.begin((tx) => writeProductionAudit(tx, userId, "qc", "SUBMIT", id, {}));
  return getManagementReview(id);
}

export async function approveManagementReview(id: string, userId: string) {
  await sql`UPDATE "QCManagementReview" SET status = 'APPROVED', "updatedAt" = NOW() WHERE id = ${id} AND status IN ('DRAFT', 'SUBMITTED', 'CHECKED')`;
  await sql.begin((tx) => writeProductionAudit(tx, userId, "qc", "APPROVE", id, {}));
  return getManagementReview(id);
}

export async function listInternalAudits() {
  return sql<Array<Record<string, unknown>>>`
    SELECT audit.*, prepared.name AS "preparedByName", lead.name AS "leadAuditorName"
    FROM "QCInternalAudit" audit
    LEFT JOIN "User" prepared ON prepared.id = audit."preparedById"
    LEFT JOIN "User" lead ON lead.id = audit."leadAuditorId"
    ORDER BY audit."auditDate" DESC
  `;
}

export async function getInternalAudit(key: string) {
  const header = (await sql<Array<Record<string, unknown>>>`
    SELECT audit.*, prepared.name AS "preparedByName", lead.name AS "leadAuditorName"
    FROM "QCInternalAudit" audit
    LEFT JOIN "User" prepared ON prepared.id = audit."preparedById"
    LEFT JOIN "User" lead ON lead.id = audit."leadAuditorId"
    WHERE ${isPublicIdParam(key) ? sql`audit."publicId" = ${Number(key)}` : sql`audit.id = ${key}`}
    LIMIT 1
  `)[0];
  if (!header) return null;
  const findings = await sql`SELECT * FROM "QCInternalAuditFinding" WHERE "auditId" = ${String(header.id)}`;
  return { ...header, findings };
}

export async function saveInternalAudit(payload: Record<string, unknown>, userId: string, id?: string) {
  const auditDate = new Date(String(payload.auditDate ?? payload.date ?? ""));
  if (Number.isNaN(auditDate.getTime())) throw new Error("Date is required");
  const findings = Array.isArray(payload.findings) ? payload.findings as Array<Record<string, unknown>> : [];
  return sql.begin(async (tx) => {
    let auditId = id;
    if (!auditId) {
      const auditNo = optional(payload.auditNo) ?? await nextProductionDocumentNumber(tx, "QC-AUD", "QC Internal Audit");
      auditId = randomUUID();
      await tx`
        INSERT INTO "QCInternalAudit" (id, "auditNo", "auditDate", scope, "auditArea", "leadAuditorId", auditee, "preparedById", status, remarks, "createdAt", "updatedAt")
        VALUES (${auditId}, ${auditNo}, ${auditDate}, ${optional(payload.scope)}, ${optional(payload.auditArea)}, ${optional(payload.leadAuditorId)}, ${optional(payload.auditee)}, ${userId}, 'DRAFT', ${optional(payload.remarks)}, NOW(), NOW())
      `;
    } else {
      const nextAuditNo = optional(payload.auditNo);
      await tx`
        UPDATE "QCInternalAudit"
        SET "auditDate" = ${auditDate},
            "auditNo" = COALESCE(${nextAuditNo}, "auditNo"),
            auditee = ${optional(payload.auditee)},
            remarks = ${optional(payload.remarks)},
            "updatedAt" = NOW()
        WHERE id = ${auditId}
      `;
      await tx`DELETE FROM "QCInternalAuditFinding" WHERE "auditId" = ${auditId}`;
    }
    for (const [index, finding] of findings.filter((row) =>
      ["nonconformity", "rootCause", "correction", "correctiveAction", "preventiveAction", "effectiveness"].some((key) => String(row[key] ?? "").trim()),
    ).entries()) {
      await tx`
        INSERT INTO "QCInternalAuditFinding" (
          id, "auditId", "findingNo", nonconformity, "rootCause", correction, "correctiveAction", "preventiveAction",
          "responsibleId", "targetDate", effectiveness, "evaluatedById", status
        )
        VALUES (
          ${randomUUID()}, ${auditId}, ${optional(finding.findingNo) ?? `F-${index + 1}`}, ${String(finding.nonconformity)},
          ${optional(finding.rootCause)}, ${optional(finding.correction)}, ${optional(finding.correctiveAction)}, ${optional(finding.preventiveAction)},
          ${optional(finding.responsibleId)}, ${finding.targetDate ? new Date(String(finding.targetDate)) : null}, ${optional(finding.effectiveness)},
          ${optional(finding.evaluatedById)}, ${optional(finding.status) ?? "OPEN"}
        )
      `;
    }
    return auditId;
  });
}

export async function approveInternalAudit(id: string, userId: string) {
  await sql`UPDATE "QCInternalAudit" SET status = 'APPROVED', "updatedAt" = NOW() WHERE id = ${id} AND status IN ('DRAFT', 'SUBMITTED', 'CHECKED')`;
  await sql.begin((tx) => writeProductionAudit(tx, userId, "qc", "APPROVE", id, {}));
  return getInternalAudit(id);
}

export async function listCorrectiveActions() {
  return sql<Array<Record<string, unknown>>>`
    SELECT plan.*, prepared.name AS "preparedByName"
    FROM "QCCorrectiveAction" plan
    LEFT JOIN "User" prepared ON prepared.id = plan."preparedById"
    ORDER BY plan."planDate" DESC
  `;
}

export async function getCorrectiveAction(key: string) {
  const header = (await sql<Array<Record<string, unknown>>>`
    SELECT plan.*, prepared.name AS "preparedByName"
    FROM "QCCorrectiveAction" plan
    LEFT JOIN "User" prepared ON prepared.id = plan."preparedById"
    WHERE ${isPublicIdParam(key) ? sql`plan."publicId" = ${Number(key)}` : sql`plan.id = ${key}`}
    LIMIT 1
  `)[0];
  if (!header) return null;
  const lines = await sql`SELECT * FROM "QCCorrectiveActionLine" WHERE "planId" = ${String(header.id)}`;
  return { ...header, lines };
}

export async function saveCorrectiveAction(payload: Record<string, unknown>, userId: string, id?: string) {
  const planDate = new Date(String(payload.planDate ?? payload.date ?? ""));
  if (Number.isNaN(planDate.getTime())) throw new Error("Date is required");
  const lines = Array.isArray(payload.lines) ? payload.lines as Array<Record<string, unknown>> : [];
  return sql.begin(async (tx) => {
    let planId = id;
    if (!planId) {
      const planNo = await nextProductionDocumentNumber(tx, "QC-CAPLAN", "QC Corrective Action Plan");
      planId = randomUUID();
      await tx`
        INSERT INTO "QCCorrectiveAction" (id, "planNo", "planDate", "functionName", "preparedById", "sourceType", "sourceId", status, remarks, "createdAt", "updatedAt")
        VALUES (${planId}, ${planNo}, ${planDate}, ${optional(payload.functionName)}, ${userId}, ${optional(payload.sourceType)}, ${optional(payload.sourceId)}, 'DRAFT', ${optional(payload.remarks)}, NOW(), NOW())
      `;
    } else {
      await tx`
        UPDATE "QCCorrectiveAction"
        SET "planDate" = ${planDate}, "functionName" = ${optional(payload.functionName)}, "sourceType" = ${optional(payload.sourceType)},
            "sourceId" = ${optional(payload.sourceId)}, remarks = ${optional(payload.remarks)}, "updatedAt" = NOW()
        WHERE id = ${planId}
      `;
      await tx`DELETE FROM "QCCorrectiveActionLine" WHERE "planId" = ${planId}`;
    }
    for (const line of lines.filter((row) =>
      ["nonconformity", "ncrNo", "rootCause", "actions", "followUpDates", "responsibility"].some((key) => String(row[key] ?? "").trim()),
    )) {
      await tx`
        INSERT INTO "QCCorrectiveActionLine" (id, "planId", nonconformity, "ncrNo", "rootCause", actions, "realizationDate", "followUpDates", responsibility)
        VALUES (
          ${randomUUID()}, ${planId}, ${optional(line.nonconformity)}, ${optional(line.ncrNo)}, ${optional(line.rootCause)},
          ${optional(line.actions)}, ${line.realizationDate ? new Date(String(line.realizationDate)) : null},
          ${optional(line.followUpDates)}, ${optional(line.responsibility)}
        )
      `;
    }
    return planId;
  });
}

export async function submitCorrectiveAction(id: string) {
  await sql`UPDATE "QCCorrectiveAction" SET status = 'SUBMITTED', "updatedAt" = NOW() WHERE id = ${id} AND status = 'DRAFT'`;
  return getCorrectiveAction(id);
}

export async function approveCorrectiveAction(id: string, userId: string) {
  await sql`UPDATE "QCCorrectiveAction" SET status = 'APPROVED', "approvedById" = ${userId}, "updatedAt" = NOW() WHERE id = ${id}`;
  return getCorrectiveAction(id);
}
