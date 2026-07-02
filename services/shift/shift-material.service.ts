import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  postProductionMaterialIssueDocument,
  postProductionMaterialReturnDocument,
} from "@/services/inventory/module-integration.service";
import {
  nextProductionDocumentNumber,
  normalizeProductionStatus,
  type Tx,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";

export interface ProductionIssueItemInput {
  itemId: string;
  uomId?: string | null;
  requestedQty?: number;
  issuedQty: number;
  unitCost: number;
  remarks?: string;
}

export interface ProductionReturnItemInput {
  itemId: string;
  uomId?: string | null;
  returnedQty: number;
  condition?: string;
  unitCost?: number;
  remarks?: string;
}

export async function listProductionMaterialIssues(shiftSessionId?: string) {
  try {
    return await sql<Array<{
      id: string;
      issueNo: string;
      shiftSessionId: string;
      sessionNo: string;
      storeLocationName: string;
      productionLocationName: string;
      status: string;
      itemCount: number;
    }>>`
      SELECT
        pmi.id,
        pmi."issueNo",
        pmi."shiftSessionId",
        ss."sessionNo",
        sl."locationName" AS "storeLocationName",
        pl."locationName" AS "productionLocationName",
        pmi.status::text AS status,
        COALESCE(COUNT(pmii.id), 0)::int AS "itemCount"
      FROM "ProductionMaterialIssue" pmi
      INNER JOIN "ShiftSession" ss ON ss.id = pmi."shiftSessionId"
      INNER JOIN "Location" sl ON sl.id = pmi."storeLocationId"
      INNER JOIN "Location" pl ON pl.id = pmi."productionLocationId"
      LEFT JOIN "ProductionMaterialIssueItem" pmii ON pmii."issueId" = pmi.id
      ${shiftSessionId ? sql`WHERE pmi."shiftSessionId" = ${shiftSessionId}` : sql``}
      GROUP BY pmi.id, ss."sessionNo", sl."locationName", pl."locationName"
      ORDER BY pmi."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function listProductionMaterialReturns(shiftSessionId?: string) {
  try {
    return await sql<Array<{
      id: string;
      returnNo: string;
      shiftSessionId: string;
      sessionNo: string;
      fromLocationName: string;
      toStoreLocationName: string;
      status: string;
      itemCount: number;
    }>>`
      SELECT
        pmr.id,
        pmr."returnNo",
        pmr."shiftSessionId",
        ss."sessionNo",
        fl."locationName" AS "fromLocationName",
        tl."locationName" AS "toStoreLocationName",
        pmr.status::text AS status,
        COALESCE(COUNT(pmri.id), 0)::int AS "itemCount"
      FROM "ProductionMaterialReturn" pmr
      INNER JOIN "ShiftSession" ss ON ss.id = pmr."shiftSessionId"
      INNER JOIN "Location" fl ON fl.id = pmr."fromLocationId"
      INNER JOIN "Location" tl ON tl.id = pmr."toStoreLocationId"
      LEFT JOIN "ProductionMaterialReturnItem" pmri ON pmri."returnId" = pmr.id
      ${shiftSessionId ? sql`WHERE pmr."shiftSessionId" = ${shiftSessionId}` : sql``}
      GROUP BY pmr.id, ss."sessionNo", fl."locationName", tl."locationName"
      ORDER BY pmr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

async function writeIssueItems(tx: Tx, issueId: string, items: ProductionIssueItemInput[]) {
  for (const item of items) {
    await tx`
      INSERT INTO "ProductionMaterialIssueItem" (
        id, "issueId", "itemId", "uomId", "requestedQty", "issuedQty", "unitCost", remarks
      )
      VALUES (
        ${randomUUID()},
        ${issueId},
        ${item.itemId},
        ${item.uomId ?? null},
        ${Number(item.requestedQty ?? item.issuedQty)},
        ${Number(item.issuedQty)},
        ${Number(item.unitCost ?? 0)},
        ${item.remarks ?? null}
      )
    `;
  }
}

async function writeReturnItems(tx: Tx, returnId: string, items: ProductionReturnItemInput[]) {
  for (const item of items) {
    await tx`
      INSERT INTO "ProductionMaterialReturnItem" (
        id, "returnId", "itemId", "uomId", "returnedQty", condition, remarks
      )
      VALUES (
        ${randomUUID()},
        ${returnId},
        ${item.itemId},
        ${item.uomId ?? null},
        ${Number(item.returnedQty)},
        ${item.condition ?? "Good"},
        ${item.remarks ?? null}
      )
    `;
  }
}

export async function createProductionMaterialIssue(payload: {
  shiftSessionId: string;
  productionBatchId?: string | null;
  storeLocationId: string;
  productionLocationId: string;
  remarks?: string;
  createdById: string;
  status?: string;
  items: ProductionIssueItemInput[];
}) {
  if (!payload.items.length) throw new Error("At least one material issue item is required");
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const issueNo = await nextProductionDocumentNumber(tx, "PMI", "Production Material Issue");
    await tx`
      INSERT INTO "ProductionMaterialIssue" (
        id, "issueNo", "shiftSessionId", "productionBatchId", "storeLocationId", "productionLocationId",
        status, remarks, "createdById", "createdAt"
      )
      VALUES (
        ${id},
        ${issueNo},
        ${payload.shiftSessionId},
        ${payload.productionBatchId ?? null},
        ${payload.storeLocationId},
        ${payload.productionLocationId},
        ${normalizeProductionStatus(payload.status)},
        ${payload.remarks ?? null},
        ${payload.createdById},
        NOW()
      )
    `;
    await writeIssueItems(tx, id, payload.items);
    await writeProductionAudit(tx, payload.createdById, "production.material-issue", "CREATE", id, payload);
    await writeProductionHistory(tx, "production.material-issue", id, "CREATE", payload.createdById, issueNo);
    return { id, issueNo };
  });
}

export async function postProductionMaterialIssue(id: string, userId: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{
      id: string;
      issueNo: string;
      storeLocationId: string;
      status: string;
    }>>`
      SELECT id, "issueNo", "storeLocationId", status::text AS status
      FROM "ProductionMaterialIssue"
      WHERE id = ${id}
      LIMIT 1
    `;
    const issue = rows[0];
    if (!issue) throw new Error("Production material issue not found");
    if (issue.status === "POSTED") return { id };
    if (issue.status === "CANCELLED") throw new Error("Cancelled material issue cannot be posted");

    const items = await tx<Array<{ itemId: string; issuedQty: number; unitCost: number; remarks: string | null }>>`
      SELECT "itemId", "issuedQty", "unitCost", remarks
      FROM "ProductionMaterialIssueItem"
      WHERE "issueId" = ${id}
        AND "issuedQty" > 0
    `;

    await postProductionMaterialIssueDocument({
      productionOrderId: id,
      locationId: issue.storeLocationId,
      createdById: userId,
      remarks: issue.issueNo,
      lines: items.map((item) => ({
        itemId: item.itemId,
        quantity: item.issuedQty,
        unitCost: item.unitCost,
        remarks: item.remarks ?? undefined,
      })),
    }, { tx });

    await tx`
      UPDATE "ProductionMaterialIssue"
      SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "production.material-issue", "POST", id, { id });
    await writeProductionHistory(tx, "production.material-issue", id, "POST", userId, issue.issueNo);
    return { id };
  });
}

export async function createProductionMaterialReturn(payload: {
  shiftSessionId: string;
  productionBatchId?: string | null;
  fromLocationId: string;
  toStoreLocationId: string;
  remarks?: string;
  createdById: string;
  status?: string;
  items: ProductionReturnItemInput[];
}) {
  if (!payload.items.length) throw new Error("At least one material return item is required");
  return sql.begin(async (tx) => {
    const id = randomUUID();
    const returnNo = await nextProductionDocumentNumber(tx, "PMR", "Production Material Return");
    await tx`
      INSERT INTO "ProductionMaterialReturn" (
        id, "returnNo", "shiftSessionId", "productionBatchId", "fromLocationId", "toStoreLocationId",
        status, remarks, "createdById", "createdAt"
      )
      VALUES (
        ${id},
        ${returnNo},
        ${payload.shiftSessionId},
        ${payload.productionBatchId ?? null},
        ${payload.fromLocationId},
        ${payload.toStoreLocationId},
        ${normalizeProductionStatus(payload.status)},
        ${payload.remarks ?? null},
        ${payload.createdById},
        NOW()
      )
    `;
    await writeReturnItems(tx, id, payload.items);
    await writeProductionAudit(tx, payload.createdById, "production.material-return", "CREATE", id, payload);
    await writeProductionHistory(tx, "production.material-return", id, "CREATE", payload.createdById, returnNo);
    return { id, returnNo };
  });
}

export async function postProductionMaterialReturn(id: string, userId: string) {
  return sql.begin(async (tx) => {
    const rows = await tx<Array<{
      id: string;
      returnNo: string;
      toStoreLocationId: string;
      status: string;
    }>>`
      SELECT id, "returnNo", "toStoreLocationId", status::text AS status
      FROM "ProductionMaterialReturn"
      WHERE id = ${id}
      LIMIT 1
    `;
    const returnDoc = rows[0];
    if (!returnDoc) throw new Error("Production material return not found");
    if (returnDoc.status === "POSTED") return { id };
    if (returnDoc.status === "CANCELLED") throw new Error("Cancelled material return cannot be posted");

    const items = await tx<Array<{ itemId: string; returnedQty: number; condition: string; remarks: string | null }>>`
      SELECT "itemId", "returnedQty", condition, remarks
      FROM "ProductionMaterialReturnItem"
      WHERE "returnId" = ${id}
        AND "returnedQty" > 0
        AND UPPER(condition) = 'GOOD'
    `;

    await postProductionMaterialReturnDocument({
      productionReturnId: id,
      locationId: returnDoc.toStoreLocationId,
      createdById: userId,
      remarks: returnDoc.returnNo,
      lines: items.map((item) => ({
        itemId: item.itemId,
        quantity: item.returnedQty,
        unitCost: 0,
        remarks: item.remarks ?? undefined,
      })),
    }, { tx });

    await tx`
      UPDATE "ProductionMaterialReturn"
      SET status = 'POSTED', "postedById" = ${userId}, "postedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, userId, "production.material-return", "POST", id, { id });
    await writeProductionHistory(tx, "production.material-return", id, "POST", userId, returnDoc.returnNo);
    return { id };
  });
}
