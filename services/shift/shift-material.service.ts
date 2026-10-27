import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  postProductionMaterialIssueDocument,
  postProductionMaterialReturnDocument,
} from "@/services/inventory/module-integration.service";
import { postStockMovement } from "@/services/inventory/inventory-posting.service";
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
  sourceLotNo?: string;
  supplierBatchNo?: string;
  serialNo?: string;
  expiryDate?: string | null;
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
        id, "issueId", "itemId", "uomId", "requestedQty", "issuedQty", "unitCost",
        "sourceLotNo", "supplierBatchNo", "serialNo", "expiryDate", remarks
      )
      VALUES (
        ${randomUUID()},
        ${issueId},
        ${item.itemId},
        ${item.uomId ?? null},
        ${Number(item.requestedQty ?? item.issuedQty)},
        ${Number(item.issuedQty)},
        ${Number(item.unitCost ?? 0)},
        ${item.sourceLotNo?.trim() || null},
        ${item.supplierBatchNo?.trim() || null},
        ${item.serialNo?.trim() || null},
        ${item.expiryDate ? new Date(item.expiryDate) : null},
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

const INVENTORY_ISSUE_REMARK = "inventory-issue:";

function inventoryIssueRemark(stockIssueId: string) {
  return `${INVENTORY_ISSUE_REMARK}${stockIssueId}`;
}

export async function receiveInventoryIssueOnShift(input: {
  shiftSessionId: string;
  stockIssueId: string;
  userId: string;
}) {
  const stockIssueId = input.stockIssueId.trim();
  if (!stockIssueId) throw new Error("Choose a posted stock issue to receive.");

  return sql.begin(async (tx) => {
    const headers = await tx<Array<{
      id: string;
      issueNo: string;
      status: string;
      storeLocationId: string;
      issuedToType: string;
      issuedToId: string;
      purpose: string;
      remarks: string;
      departmentName: string | null;
      shiftStatus: string;
      factoryLocationId: string;
      sessionNo: string;
    }>>`
      SELECT
        si.id,
        si."issueNo",
        si.status,
        si."locationId" AS "storeLocationId",
        si."issuedToType",
        si."issuedToId",
        COALESCE(si.purpose, '') AS purpose,
        COALESCE(si.remarks, '') AS remarks,
        d.name AS "departmentName",
        ss.status::text AS "shiftStatus",
        ss."locationId" AS "factoryLocationId",
        ss."sessionNo"
      FROM "StockIssue" si
      INNER JOIN "ShiftSession" ss ON ss.id = ${input.shiftSessionId}
      LEFT JOIN "Department" d ON d.id = si."issuedToId"
      WHERE si.id = ${stockIssueId}
      LIMIT 1
      FOR UPDATE OF si
    `;
    const issue = headers[0];
    if (!issue) throw new Error("Stock issue not found.");
    if (issue.status !== "POSTED") {
      throw new Error("Post the stock issue in Inventory before receiving it here.");
    }
    if (issue.shiftStatus !== "ACTIVE") {
      throw new Error("This shift is closed, so it cannot receive materials.");
    }

    const issuedToFactory = issue.issuedToType.toLowerCase() === "location" && issue.issuedToId === issue.factoryLocationId;
    const issuedToProduction = issue.issuedToType.toLowerCase() === "department" && /production/i.test(issue.departmentName ?? "");
    const forThisSession = issue.purpose === issue.sessionNo || issue.remarks.includes(issue.sessionNo);
    if (!issuedToFactory && !issuedToProduction && !forThisSession) {
      throw new Error("This stock issue is not issued to the factory for this shift.");
    }

    const already = await tx<Array<{ id: string }>>`
      SELECT id
      FROM "ProductionMaterialIssue"
      WHERE remarks = ${inventoryIssueRemark(issue.id)}
      LIMIT 1
    `;
    if (already[0]) throw new Error(`${issue.issueNo} is already received.`);

    const lines = await tx<Array<{ itemId: string; uomId: string | null; quantity: number; unitCost: number }>>`
      SELECT
        sii."itemId",
        i."uomId",
        GREATEST(sii.quantity - COALESCE(returned.quantity, 0), 0)::float AS quantity,
        sii."unitCost"
      FROM "StockIssueItem" sii
      INNER JOIN "Item" i ON i.id = sii."itemId"
      LEFT JOIN LATERAL (
        SELECT SUM(sri.quantity) AS quantity
        FROM "StockReturn" sr
        INNER JOIN "StockReturnItem" sri ON sri."returnId" = sr.id
        WHERE sr.reason = ${issue.id}
          AND sri."itemId" = sii."itemId"
          AND sr.status IN ('SUBMITTED', 'APPROVED', 'POSTED')
      ) returned ON true
      WHERE sii."issueId" = ${issue.id}
        AND GREATEST(sii.quantity - COALESCE(returned.quantity, 0), 0) > 0
    `;
    if (lines.length === 0) throw new Error(`${issue.issueNo} has no quantity left to receive.`);

    const id = randomUUID();
    const issueNo = await nextProductionDocumentNumber(tx, "PMI", "Production Material Issue");
    const remark = inventoryIssueRemark(issue.id);
    await tx`
      INSERT INTO "ProductionMaterialIssue" (
        id, "issueNo", "shiftSessionId", "storeLocationId", "productionLocationId",
        status, "postedById", "postedAt", remarks, "createdById", "createdAt"
      )
      VALUES (
        ${id},
        ${issueNo},
        ${input.shiftSessionId},
        ${issue.storeLocationId},
        ${issue.factoryLocationId},
        'POSTED',
        ${input.userId},
        NOW(),
        ${remark},
        ${input.userId},
        NOW()
      )
    `;
    await writeIssueItems(tx, id, lines.map((line) => ({
      itemId: line.itemId,
      uomId: line.uomId,
      requestedQty: Number(line.quantity),
      issuedQty: Number(line.quantity),
      unitCost: Number(line.unitCost ?? 0),
    })));

    // The inventory stock issue already removed these quantities from the store.
    // Receiving only brings that quantity into factory WIP.
    for (const line of lines) {
      await postStockMovement({
        itemId: line.itemId,
        locationId: issue.factoryLocationId,
        movementType: "TRANSFER_IN",
        sourceModule: "production.material-receipt",
        sourceDocumentId: id,
        qtyIn: Number(line.quantity),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: `${issue.issueNo} received on ${issue.sessionNo}`,
        createdById: input.userId,
      }, { tx });
    }

    await writeProductionAudit(tx, input.userId, "production.material-receipt", "POST", id, {
      stockIssueId: issue.id,
      stockIssueNo: issue.issueNo,
      issueNo,
    });
    await writeProductionHistory(tx, "production.material-receipt", id, "POST", input.userId, `Received ${issue.issueNo} into factory WIP`);
    return { id, issueNo, stockIssueNo: issue.issueNo };
  });
}
