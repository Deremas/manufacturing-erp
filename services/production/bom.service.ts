import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  nextProductionDocumentNumber,
  normalizeBomStatus,
  type Tx,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";

export interface BomLineInput {
  componentItemId: string;
  uomId?: string | null;
  quantity: number;
  wastagePercent?: number;
  required?: boolean;
  remarks?: string;
}

export interface BomPayload {
  bomName: string;
  finishedGoodId: string;
  outputQty: number;
  uomId?: string | null;
  version?: string;
  isDefault?: boolean;
  status?: string;
  description?: string;
  createdById: string;
  updatedById?: string;
  items: BomLineInput[];
}

export async function listBoms() {
  try {
    return await sql<Array<{
      id: string;
      bomNo: string;
      bomName: string;
      finishedGoodId: string;
      finishedGoodCode: string;
      finishedGoodName: string;
      outputQty: number;
      uomName: string | null;
      version: string;
      status: string;
      isDefault: boolean;
      componentCount: number;
    }>>`
      SELECT
        b.id,
        b."bomNo",
        b."bomName",
        b."finishedGoodId",
        fg."itemCode" AS "finishedGoodCode",
        fg."itemName" AS "finishedGoodName",
        b."outputQty",
        u.name AS "uomName",
        b.version,
        b.status::text AS status,
        b."isDefault",
        COALESCE(COUNT(bi.id), 0)::int AS "componentCount"
      FROM "BOM" b
      INNER JOIN "Item" fg ON fg.id = b."finishedGoodId"
      LEFT JOIN "Unit" u ON u.id = b."uomId"
      LEFT JOIN "BOMItem" bi ON bi."bomId" = b.id
      GROUP BY b.id, fg."itemCode", fg."itemName", u.name
      ORDER BY b."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getBomById(id: string) {
  const rows = await sql<Array<{
    id: string;
    bomNo: string;
    bomName: string;
    finishedGoodId: string;
    finishedGoodCode: string;
    finishedGoodName: string;
    outputQty: number;
    uomId: string | null;
    uomName: string | null;
    version: string;
    status: string;
    isDefault: boolean;
    description: string | null;
  }>>`
    SELECT
      b.id,
      b."bomNo",
      b."bomName",
      b."finishedGoodId",
      fg."itemCode" AS "finishedGoodCode",
      fg."itemName" AS "finishedGoodName",
      b."outputQty",
      b."uomId",
      u.name AS "uomName",
      b.version,
      b.status::text AS status,
      b."isDefault",
      b.description
    FROM "BOM" b
    INNER JOIN "Item" fg ON fg.id = b."finishedGoodId"
    LEFT JOIN "Unit" u ON u.id = b."uomId"
    WHERE b.id = ${id}
    LIMIT 1
  `;

  const header = rows[0];
  if (!header) return null;

  const items = await sql<Array<{
    id: string;
    componentItemId: string;
    componentItemCode: string;
    componentItemName: string;
    uomId: string | null;
    uomName: string | null;
    quantity: number;
    wastagePercent: number;
    required: boolean;
    remarks: string | null;
  }>>`
    SELECT
      bi.id,
      bi."componentItemId",
      i."itemCode" AS "componentItemCode",
      i."itemName" AS "componentItemName",
      bi."uomId",
      u.name AS "uomName",
      bi.quantity,
      bi."wastagePercent",
      bi.required,
      bi.remarks
    FROM "BOMItem" bi
    INNER JOIN "Item" i ON i.id = bi."componentItemId"
    LEFT JOIN "Unit" u ON u.id = bi."uomId"
    WHERE bi."bomId" = ${id}
    ORDER BY i."itemCode" ASC
  `;

  const costEstimate = items.reduce((sum, item) => sum + (Number(item.quantity) * (1 + (Number(item.wastagePercent) / 100))), 0);

  return { ...header, items, costEstimate };
}

function validateBomItems(items: BomLineInput[]) {
  if (!items.length) {
    throw new Error("At least one BOM component is required");
  }
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.componentItemId) throw new Error("Component item is required");
    if (seen.has(item.componentItemId)) throw new Error("Duplicate BOM component items are not allowed");
    if (Number(item.quantity ?? 0) <= 0) throw new Error("Component quantity must be greater than zero");
    seen.add(item.componentItemId);
  }
}

async function ensureSingleDefault(tx: Tx, finishedGoodId: string, currentBomId?: string) {
  await tx`
    UPDATE "BOM"
    SET "isDefault" = false, "updatedAt" = NOW()
    WHERE "finishedGoodId" = ${finishedGoodId}
      ${currentBomId ? tx`AND id <> ${currentBomId}` : tx``}
  `;
}

async function writeBomItems(tx: Tx, bomId: string, items: BomLineInput[]) {
  for (const item of items) {
    await tx`
      INSERT INTO "BOMItem" (
        id, "bomId", "componentItemId", "uomId", quantity, "wastagePercent", required, remarks
      )
      VALUES (
        ${randomUUID()},
        ${bomId},
        ${item.componentItemId},
        ${item.uomId ?? null},
        ${Number(item.quantity)},
        ${Number(item.wastagePercent ?? 0)},
        ${item.required ?? true},
        ${item.remarks ?? null}
      )
    `;
  }
}

export async function createBom(payload: BomPayload) {
  validateBomItems(payload.items);
  if (Number(payload.outputQty ?? 0) <= 0) throw new Error("Output quantity must be greater than zero");

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const bomNo = await nextProductionDocumentNumber(tx, "BOM", "Bill of Materials");
    if (payload.isDefault) {
      await ensureSingleDefault(tx, payload.finishedGoodId);
    }
    await tx`
      INSERT INTO "BOM" (
        id, "bomNo", "bomName", "finishedGoodId", "outputQty", "uomId", version,
        "isDefault", status, description, "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${bomNo},
        ${payload.bomName},
        ${payload.finishedGoodId},
        ${Number(payload.outputQty)},
        ${payload.uomId ?? null},
        ${payload.version ?? "1.0"},
        ${payload.isDefault ?? false},
        ${normalizeBomStatus(payload.status)},
        ${payload.description ?? null},
        ${payload.createdById},
        ${payload.updatedById ?? payload.createdById},
        NOW(),
        NOW()
      )
    `;
    await writeBomItems(tx, id, payload.items);
    await writeProductionAudit(tx, payload.createdById, "production.bom", "CREATE", id, payload);
    await writeProductionHistory(tx, "production.bom", id, "CREATE", payload.createdById, payload.bomName);
    return { id, bomNo };
  });
}

export async function updateBom(id: string, payload: BomPayload) {
  validateBomItems(payload.items);
  return sql.begin(async (tx) => {
    if (payload.isDefault) {
      await ensureSingleDefault(tx, payload.finishedGoodId, id);
    }
    await tx`
      UPDATE "BOM"
      SET
        "bomName" = ${payload.bomName},
        "finishedGoodId" = ${payload.finishedGoodId},
        "outputQty" = ${Number(payload.outputQty)},
        "uomId" = ${payload.uomId ?? null},
        version = ${payload.version ?? "1.0"},
        "isDefault" = ${payload.isDefault ?? false},
        status = ${normalizeBomStatus(payload.status)}::"BOMStatus",
        description = ${payload.description ?? null},
        "updatedById" = ${payload.updatedById ?? payload.createdById},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`DELETE FROM "BOMItem" WHERE "bomId" = ${id}`;
    await writeBomItems(tx, id, payload.items);
    await writeProductionAudit(tx, payload.createdById, "production.bom", "UPDATE", id, payload);
    await writeProductionHistory(tx, "production.bom", id, "UPDATE", payload.createdById, payload.bomName);
    return { id };
  });
}

export async function duplicateBom(id: string, userId: string) {
  const existing = await getBomById(id);
  if (!existing) throw new Error("BOM not found");
  return createBom({
    bomName: `${existing.bomName} Copy`,
    finishedGoodId: existing.finishedGoodId,
    outputQty: existing.outputQty,
    uomId: existing.uomId,
    version: `${existing.version}-copy`,
    isDefault: false,
    status: existing.status,
    description: existing.description ?? undefined,
    createdById: userId,
    items: existing.items.map((item) => ({
      componentItemId: item.componentItemId,
      uomId: item.uomId,
      quantity: item.quantity,
      wastagePercent: item.wastagePercent,
      required: item.required,
      remarks: item.remarks ?? undefined,
    })),
  });
}

export async function deactivateBom(id: string, userId: string) {
  await sql.begin(async (tx) => {
    await tx`UPDATE "BOM" SET status = 'INACTIVE', "isDefault" = false, "updatedAt" = NOW() WHERE id = ${id}`;
    await writeProductionAudit(tx, userId, "production.bom", "DEACTIVATE", id, { id });
    await writeProductionHistory(tx, "production.bom", id, "DEACTIVATE", userId, "BOM deactivated");
  });
  return { id };
}
