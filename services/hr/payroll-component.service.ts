import { sql } from "@/lib/db";

export interface PayrollComponentRecord {
  id: string;
  code: string;
  name: string;
  type: string;
  taxable: boolean;
  recurring: boolean;
  defaultAmount: number;
  ratePercent?: number | null;
  isActive: boolean;
}

export interface PayrollComponentPayload {
  code: string;
  name: string;
  type: string;
  taxable: boolean;
  recurring: boolean;
  defaultAmount: number;
  ratePercent?: number | null;
  isActive: boolean;
}

function normalizeCode(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

export async function listPayrollComponents() {
  return sql<Array<PayrollComponentRecord>>`
    SELECT
      id,
      code,
      name,
      type::text AS type,
      taxable,
      recurring,
      "defaultAmount",
      "ratePercent",
      "isActive"
    FROM "PayrollComponent"
    WHERE "isArchived" = false
    ORDER BY code ASC
  `;
}

export async function createPayrollComponent(payload: PayrollComponentPayload) {
  const code = normalizeCode(payload.code);
  const name = String(payload.name ?? "").trim();
  if (!code || !name || !payload.type) {
    throw new Error("Component code, name, and type are required.");
  }

  const duplicate = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "PayrollComponent"
    WHERE UPPER(code) = ${code}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (duplicate[0]) {
    throw new Error("A payroll component with this code already exists.");
  }

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "PayrollComponent" (
      code,
      name,
      type,
      taxable,
      recurring,
      "defaultAmount",
      "ratePercent",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${code},
      ${name},
      ${payload.type}::"PayrollComponentType",
      ${Boolean(payload.taxable)},
      ${Boolean(payload.recurring)},
      ${Number(payload.defaultAmount ?? 0)},
      ${payload.ratePercent == null || payload.ratePercent === 0 ? null : Number(payload.ratePercent)},
      ${Boolean(payload.isActive)},
      false,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function updatePayrollComponent(id: string, payload: PayrollComponentPayload) {
  const code = normalizeCode(payload.code);
  const name = String(payload.name ?? "").trim();
  if (!code || !name || !payload.type) {
    throw new Error("Component code, name, and type are required.");
  }

  const duplicate = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "PayrollComponent"
    WHERE UPPER(code) = ${code}
      AND id <> ${id}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (duplicate[0]) {
    throw new Error("A payroll component with this code already exists.");
  }

  await sql`
    UPDATE "PayrollComponent"
    SET
      code = ${code},
      name = ${name},
      type = ${payload.type}::"PayrollComponentType",
      taxable = ${Boolean(payload.taxable)},
      recurring = ${Boolean(payload.recurring)},
      "defaultAmount" = ${Number(payload.defaultAmount ?? 0)},
      "ratePercent" = ${payload.ratePercent == null || payload.ratePercent === 0 ? null : Number(payload.ratePercent)},
      "isActive" = ${Boolean(payload.isActive)},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;
}

export async function archivePayrollComponent(id: string) {
  await sql`
    UPDATE "PayrollComponent"
    SET
      "isArchived" = true,
      "isActive" = false,
      "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}
