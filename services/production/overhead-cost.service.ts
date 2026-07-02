import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import {
  nextProductionDocumentNumber,
  writeProductionAudit,
  writeProductionHistory,
} from "@/services/production/production-shared.service";

export interface OverheadCostPayload {
  categoryName: string;
  allocationMethod: "FIXED_PER_SHIFT" | "COST_PER_UNIT" | "COST_PER_HOUR";
  rate: number;
  effectiveFrom: string;
  status?: string;
  description?: string;
  createdById: string;
  updatedById?: string;
}

export async function listOverheadCostSettings() {
  try {
    return await sql<Array<{
      id: string;
      categoryName: string;
      allocationMethod: string;
      rate: number;
      effectiveFrom: string;
      status: string;
      description: string | null;
    }>>`
      SELECT
        id,
        "categoryName",
        "allocationMethod"::text AS "allocationMethod",
        rate,
        "effectiveFrom"::text AS "effectiveFrom",
        status,
        description
      FROM "OverheadCostSetting"
      ORDER BY "effectiveFrom" DESC, "createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getOverheadCostSettingById(id: string) {
  const rows = await sql<Array<{
    id: string;
    categoryName: string;
    allocationMethod: string;
    rate: number;
    effectiveFrom: string;
    status: string;
    description: string | null;
  }>>`
    SELECT
      id,
      "categoryName",
      "allocationMethod"::text AS "allocationMethod",
      rate,
      "effectiveFrom"::text AS "effectiveFrom",
      status,
      description
    FROM "OverheadCostSetting"
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createOverheadCostSetting(payload: OverheadCostPayload) {
  if (Number(payload.rate ?? 0) < 0) throw new Error("Rate cannot be negative");
  return sql.begin(async (tx) => {
    const id = randomUUID();
    await nextProductionDocumentNumber(tx, "CST", "Production Cost Setting");
    await tx`
      INSERT INTO "OverheadCostSetting" (
        id, "categoryName", "allocationMethod", rate, "effectiveFrom", status, description,
        "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${payload.categoryName},
        ${payload.allocationMethod}::"CostAllocationMethod",
        ${Number(payload.rate)},
        ${new Date(payload.effectiveFrom)},
        ${String(payload.status ?? "ACTIVE").toUpperCase()},
        ${payload.description ?? null},
        ${payload.createdById},
        ${payload.updatedById ?? payload.createdById},
        NOW(),
        NOW()
      )
    `;
    await writeProductionAudit(tx, payload.createdById, "production.cost-settings", "CREATE", id, payload);
    await writeProductionHistory(tx, "production.cost-settings", id, "CREATE", payload.createdById, payload.categoryName);
    return { id };
  });
}

export async function updateOverheadCostSetting(id: string, payload: OverheadCostPayload) {
  return sql.begin(async (tx) => {
    await tx`
      UPDATE "OverheadCostSetting"
      SET
        "categoryName" = ${payload.categoryName},
        "allocationMethod" = ${payload.allocationMethod}::"CostAllocationMethod",
        rate = ${Number(payload.rate)},
        "effectiveFrom" = ${new Date(payload.effectiveFrom)},
        status = ${String(payload.status ?? "ACTIVE").toUpperCase()},
        description = ${payload.description ?? null},
        "updatedById" = ${payload.updatedById ?? payload.createdById},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProductionAudit(tx, payload.createdById, "production.cost-settings", "UPDATE", id, payload);
    await writeProductionHistory(tx, "production.cost-settings", id, "UPDATE", payload.createdById, payload.categoryName);
    return { id };
  });
}
