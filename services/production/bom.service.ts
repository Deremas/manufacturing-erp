import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
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
}

export interface BomPayload {
  bomName: string;
  finishedGoodId: string;
  outputQty: number;
  uomId?: string | null;
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
      publicId: number;
      bomNo: string;
      bomName: string;
      finishedGoodId: string;
      finishedGoodCode: string;
      finishedGoodName: string;
      outputQty: number;
      uomName: string | null;
      status: string;
      isDefault: boolean;
      description: string | null;
      createdByName: string | null;
      componentCount: number;
    }>>`
      SELECT
        b.id,
        b."publicId",
        b."bomNo",
        b."bomName",
        b."finishedGoodId",
        fg."itemCode" AS "finishedGoodCode",
        fg."itemName" AS "finishedGoodName",
        b."outputQty",
        COALESCE(NULLIF(TRIM(u.abbreviation), ''), u.name) AS "uomName",
        b.status::text AS status,
        b."isDefault",
        b.description,
        creator.name AS "createdByName",
        COALESCE(COUNT(bi.id), 0)::int AS "componentCount"
      FROM "BOM" b
      INNER JOIN "Item" fg ON fg.id = b."finishedGoodId"
      LEFT JOIN "Unit" u ON u.id = b."uomId"
      LEFT JOIN "User" creator ON creator.id = b."createdById"
      LEFT JOIN "BOMItem" bi ON bi."bomId" = b.id
      GROUP BY b.id, fg."itemCode", fg."itemName", u.name, u.abbreviation, creator.name
      ORDER BY b."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getBomById(key: string) {
  const rows = await sql<Array<{
    id: string;
    publicId: number;
    bomNo: string;
    bomName: string;
    finishedGoodId: string;
    finishedGoodCode: string;
    finishedGoodName: string;
    outputQty: number;
    uomId: string | null;
    uomName: string | null;
    status: string;
    isDefault: boolean;
    description: string | null;
  }>>`
    SELECT
      b.id,
      b."publicId",
      b."bomNo",
      b."bomName",
      b."finishedGoodId",
      fg."itemCode" AS "finishedGoodCode",
      fg."itemName" AS "finishedGoodName",
      b."outputQty",
      b."uomId",
      u.name AS "uomName",
      b.status::text AS status,
      b."isDefault",
      b.description
    FROM "BOM" b
    INNER JOIN "Item" fg ON fg.id = b."finishedGoodId"
    LEFT JOIN "Unit" u ON u.id = b."uomId"
    WHERE ${isPublicIdParam(key) ? sql`b."publicId" = ${Number(key)}` : sql`b.id = ${key}`}
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
      bi.required
    FROM "BOMItem" bi
    INNER JOIN "Item" i ON i.id = bi."componentItemId"
    LEFT JOIN "Unit" u ON u.id = bi."uomId"
    WHERE bi."bomId" = ${header.id}
    ORDER BY i."itemCode" ASC
  `;

  const costEstimate = items.reduce((sum, item) => sum + (Number(item.quantity) * (1 + (Number(item.wastagePercent) / 100))), 0);

  return { ...header, items, costEstimate };
}

function validateBomPayload(payload: BomPayload) {
  if (!payload.bomName?.trim()) throw new Error("BOM name is required");
  if (!payload.finishedGoodId) throw new Error("Finished good is required");
  if (Number(payload.outputQty ?? 0) <= 0) throw new Error("Output quantity must be greater than zero");
  if (!payload.items.length) throw new Error("At least one material is required");
  const seen = new Set<string>();
  for (const item of payload.items) {
    if (!item.componentItemId) throw new Error("Material is required");
    if (seen.has(item.componentItemId)) throw new Error("Use one row per material and increase the quantity");
    if (Number(item.quantity ?? 0) <= 0) throw new Error("Material quantity must be greater than zero");
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
        id, "bomId", "componentItemId", "uomId", quantity, "wastagePercent", required
      )
      VALUES (
        ${randomUUID()},
        ${bomId},
        ${item.componentItemId},
        ${item.uomId ?? null},
        ${Number(item.quantity)},
        ${Number(item.wastagePercent ?? 0)},
        ${item.required ?? true}
      )
    `;
  }
}

export async function createBom(payload: BomPayload) {
  validateBomPayload(payload);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const bomNo = await nextProductionDocumentNumber(tx, "BOM", "Bill of Materials");
    const existingDefaults = await tx<Array<{ id: string }>>`
      SELECT id
      FROM "BOM"
      WHERE "finishedGoodId" = ${payload.finishedGoodId}
        AND "isDefault" = true
        AND status = 'ACTIVE'
      LIMIT 1
    `;
    const isDefault = Boolean(payload.isDefault) || existingDefaults.length === 0;
    if (isDefault) {
      await ensureSingleDefault(tx, payload.finishedGoodId);
    }
    await tx`
      INSERT INTO "BOM" (
        id, "bomNo", "bomName", "finishedGoodId", "outputQty", "uomId",
        "isDefault", status, description, "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${bomNo},
        ${payload.bomName},
        ${payload.finishedGoodId},
        ${Number(payload.outputQty)},
        ${payload.uomId ?? null},
        ${isDefault},
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
  validateBomPayload(payload);
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
