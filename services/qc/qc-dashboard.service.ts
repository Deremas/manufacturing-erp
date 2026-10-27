import { sql } from "@/lib/db";
import type { QcRecordScope } from "@/services/qc/qc-record.service";

export async function getQcDashboard(scope?: QcRecordScope) {
  const today = new Date().toISOString().slice(0, 10);
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const scoped = Boolean(scope?.accessibleLocationIds && locationIds.length === 0);
  const recordScope = scoped
    ? sql`AND false`
    : locationIds.length
      ? sql`AND (record."locationId" IS NULL OR record."locationId" IN ${sql(locationIds)})`
      : sql``;
  const holdScope = scoped
    ? sql`AND false`
    : locationIds.length
      ? sql`AND (decision."locationId" IS NULL OR decision."locationId" IN ${sql(locationIds)})`
      : sql``;
  const ncScope = scoped
    ? sql`AND false`
    : locationIds.length
      ? sql`AND (nc."locationId" IS NULL OR nc."locationId" IN ${sql(locationIds)})`
      : sql``;

  const [kpis, openNc, holds, pending, failed, formCounts] = await Promise.all([
    sql<Array<{
      testsToday: number; passedToday: number; failedToday: number; pendingApproval: number; awaitingResult: number;
      openNc: number; productsOnHold: number; recentCip: number; retentionSamples: number;
    }>>`
      SELECT
        (SELECT COUNT(*)::int FROM "QCTestRecord" record WHERE record."recordDate" >= ${today}::date AND record."recordDate" < (${today}::date + INTERVAL '1 day') ${recordScope}) AS "testsToday",
        (SELECT COUNT(*)::int FROM "QCTestRecord" record WHERE record."recordDate" >= ${today}::date AND record."recordDate" < (${today}::date + INTERVAL '1 day') AND record.result IN ('PASS', 'WITHIN_SPEC', 'ACCEPTED') ${recordScope}) AS "passedToday",
        (SELECT COUNT(*)::int FROM "QCTestRecord" record WHERE record."recordDate" >= ${today}::date AND record."recordDate" < (${today}::date + INTERVAL '1 day') AND record.result IN ('FAIL', 'OUT_OF_SPEC', 'REJECTED') ${recordScope}) AS "failedToday",
        (SELECT COUNT(*)::int FROM "QCTestRecord" record WHERE record.status IN ('SUBMITTED', 'CHECKED') ${recordScope}) AS "pendingApproval",
        (SELECT COUNT(*)::int FROM "QCTestRecord" record WHERE record.result IN ('PENDING', 'INCOMPLETE', 'NOT_EVALUATED') AND record.status NOT IN ('CANCELLED') ${recordScope}) AS "awaitingResult",
        (SELECT COUNT(*)::int FROM "QCNonconformity" nc WHERE nc.status NOT IN ('CLOSED') ${ncScope}) AS "openNc",
        (SELECT COUNT(*)::int FROM "QCHoldDecision" decision WHERE decision.decision = 'HOLD' AND decision.status NOT IN ('CANCELLED') ${holdScope}) AS "productsOnHold",
        (SELECT COUNT(*)::int FROM "QCCipRecord" WHERE "recordDate" >= (${today}::date - INTERVAL '7 day')) AS "recentCip",
        (SELECT COUNT(*)::int FROM "QCRetentionSample" WHERE status IN ('STORED', 'DUE')) AS "retentionSamples"
    `,
    sql<Array<{ id: string; ncNo: string; issueDescription: string; severity: string; status: string; createdAt: string; itemName: string | null; batchNo: string | null }>>`
      SELECT nc.id, nc."ncNo", nc."issueDescription", nc.severity, nc.status, nc."createdAt"::text AS "createdAt",
        item."itemName", nc."batchNo"
      FROM "QCNonconformity" nc
      LEFT JOIN "Item" item ON item.id = nc."itemId"
      WHERE nc.status NOT IN ('CLOSED') ${ncScope}
      ORDER BY nc."createdAt" DESC
      LIMIT 8
    `,
    sql<Array<{ id: string; decisionNo: string; decision: string; reason: string; status: string; recordDate: string; itemName: string | null; batchNo: string | null; quantity: number | null }>>`
      SELECT decision.id, decision."decisionNo", decision.decision, decision.reason, decision.status,
        decision."recordDate"::text AS "recordDate", item."itemName", decision."batchNo", decision.quantity
      FROM "QCHoldDecision" decision
      LEFT JOIN "Item" item ON item.id = decision."itemId"
      WHERE decision.decision = 'HOLD' AND decision.status NOT IN ('CANCELLED') ${holdScope}
      ORDER BY decision."recordDate" DESC
      LIMIT 8
    `,
    sql<Array<{ id: string; recordNo: string; formTitleSnapshot: string; status: string; slug: string }>>`
      SELECT record.id, record."recordNo", record."formTitleSnapshot", record.status, type.slug
      FROM "QCTestRecord" record
      INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
      WHERE record.status IN ('SUBMITTED', 'CHECKED') ${recordScope}
      ORDER BY record."updatedAt" DESC
      LIMIT 8
    `,
    sql<Array<{ id: string; recordNo: string; formTitleSnapshot: string; result: string; slug: string; recordDate: string }>>`
      SELECT record.id, record."recordNo", record."formTitleSnapshot", record.result, type.slug, record."recordDate"::text AS "recordDate"
      FROM "QCTestRecord" record
      INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
      WHERE record.result IN ('FAIL', 'OUT_OF_SPEC', 'REJECTED') ${recordScope}
      ORDER BY record."recordDate" DESC
      LIMIT 8
    `,
    sql<Array<{ slug: string; count: number }>>`
      SELECT type.slug, COUNT(*)::int AS count
      FROM "QCTestRecord" record
      INNER JOIN "QCTestType" type ON type.id = record."testTypeId"
      WHERE record.status NOT IN ('CANCELLED') ${recordScope}
      GROUP BY type.slug
    `,
  ]);

  return {
    kpis: kpis[0] ?? {
      testsToday: 0, passedToday: 0, failedToday: 0, pendingApproval: 0, awaitingResult: 0,
      openNc: 0, productsOnHold: 0, recentCip: 0, retentionSamples: 0,
    },
    openNonconformities: openNc,
    activeHolds: holds,
    pendingApprovals: pending,
    recentFailed: failed,
    formCounts: Object.fromEntries(formCounts.map((row) => [row.slug, row.count])),
  };
}
