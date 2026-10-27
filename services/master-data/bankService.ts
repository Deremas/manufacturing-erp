import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  Bank,
  CreateBankInput,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  UpdateBankInput,
} from "@/types/master-data";

type BankRow = {
  id: string;
  code: string | null;
  name: string;
  shortName: string | null;
  swiftCode: string | null;
  description: string | null;
  createdById: string | null;
  updatedById: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function mapBank(row: BankRow): Bank {
  return {
    id: row.id,
    code: row.code ?? undefined,
    name: row.name,
    shortName: row.shortName ?? undefined,
    swiftCode: row.swiftCode ?? undefined,
    description: row.description ?? undefined,
    createdById: row.createdById ?? undefined,
    updatedById: row.updatedById ?? undefined,
    isActive: row.isActive,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function paginate<T>(items: T[], params?: QueryParams): PaginatedResult<T> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

async function getBankRowById(id: string, isArchived = false) {
  const rows = await sql<BankRow[]>`
    SELECT
      id,
      code,
      name,
      "shortName",
      "swiftCode",
      description,
      "createdById",
      "updatedById",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    FROM "Bank"
    WHERE id = ${id}
      AND "isArchived" = ${isArchived}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<Bank>> {
  const rows = await sql<BankRow[]>`
    SELECT
      id,
      code,
      name,
      "shortName",
      "swiftCode",
      description,
      "createdById",
      "updatedById",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    FROM "Bank"
    WHERE "isArchived" = false
    ORDER BY name ASC
  `;

  const banks = rows.map(mapBank);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = banks.filter((bank) => {
    if (params?.isActive !== undefined && bank.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [bank.name, bank.shortName, bank.code, bank.swiftCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<Bank>> {
  const row = await getBankRowById(id);
  if (!row) {
    return { success: false, error: "Bank not found" };
  }
  return { success: true, data: mapBank(row) };
}

export async function create(input: CreateBankInput, userId: string, userName: string): Promise<ServiceResult<Bank>> {
  try {
    const name = normalizeString(input.name);
    if (!name) {
      return { success: false, error: "Bank name is required" };
    }

    const rows = await sql<BankRow[]>`
      INSERT INTO "Bank" (
        code,
        name,
        "shortName",
        "swiftCode",
        description,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${normalizeString(input.code)},
        ${name},
        ${normalizeString(input.shortName)},
        ${normalizeString(input.swiftCode)},
        ${normalizeString(input.description)},
        ${userId},
        ${userId},
        ${input.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        code,
        name,
        "shortName",
        "swiftCode",
        description,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const bank = mapBank(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "BANK",
      recordId: bank.id,
      newValue: bank as unknown as Record<string, unknown>,
    });

    return { success: true, data: bank, message: "Bank created successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create bank" };
  }
}

export async function update(id: string, input: UpdateBankInput, userId: string, userName: string): Promise<ServiceResult<Bank>> {
  try {
    const existing = await getBankRowById(id);
    if (!existing) {
      return { success: false, error: "Bank not found" };
    }

    const rows = await sql<BankRow[]>`
      UPDATE "Bank"
      SET
        code = ${Object.prototype.hasOwnProperty.call(input, "code") ? normalizeString(input.code) : existing.code},
        name = ${Object.prototype.hasOwnProperty.call(input, "name") ? normalizeString(input.name) : existing.name},
        "shortName" = ${Object.prototype.hasOwnProperty.call(input, "shortName") ? normalizeString(input.shortName) : existing.shortName},
        "swiftCode" = ${Object.prototype.hasOwnProperty.call(input, "swiftCode") ? normalizeString(input.swiftCode) : existing.swiftCode},
        description = ${Object.prototype.hasOwnProperty.call(input, "description") ? normalizeString(input.description) : existing.description},
        "updatedById" = ${userId},
        "isActive" = ${Object.prototype.hasOwnProperty.call(input, "isActive") ? input.isActive ?? true : existing.isActive},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        code,
        name,
        "shortName",
        "swiftCode",
        description,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const bank = mapBank(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "BANK",
      recordId: bank.id,
      oldValue: mapBank(existing) as unknown as Record<string, unknown>,
      newValue: bank as unknown as Record<string, unknown>,
    });

    return { success: true, data: bank, message: "Bank updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update bank" };
  }
}

export async function deactivate(id: string, userId: string, userName: string): Promise<ServiceResult<Bank>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(id: string, userId: string, userName: string): Promise<ServiceResult<Bank>> {
  try {
    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Bank not found" };
    }

    await sql`
      UPDATE "Bank"
      SET "isArchived" = true, "isActive" = false, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "BANK",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: { isArchived: true, isActive: false },
    });

    return { success: true, data: { ...existing.data, isArchived: true, isActive: false }, message: "Bank archived successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive bank" };
  }
}

export async function restore(id: string, userId: string, userName: string): Promise<ServiceResult<Bank>> {
  try {
    const rows = await sql<BankRow[]>`
      UPDATE "Bank"
      SET "isArchived" = false, "isActive" = true, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING
        id,
        code,
        name,
        "shortName",
        "swiftCode",
        description,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    if (!rows[0]) {
      return { success: false, error: "Bank not found" };
    }

    const bank = mapBank(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "BANK",
      recordId: id,
      newValue: bank as unknown as Record<string, unknown>,
    });

    return { success: true, data: bank, message: "Bank restored successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore bank" };
  }
}

export async function search(query: string): Promise<ServiceResult<Bank[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
