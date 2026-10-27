import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  BankAccount,
  CreateBankAccountInput,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  UpdateBankAccountInput,
} from "@/types/master-data";

type BankAccountRow = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string | null;
  bankId: string;
  bankName: string | null;
  accountNumber: string;
  branch: string | null;
  swiftCode: string | null;
  locationId: string | null;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  isDefault: boolean;
  allowPayments: boolean;
  allowReceipts: boolean;
  openingBalanceDate: Date | null;
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

function mapBankAccount(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    accountCode: row.accountCode,
    accountName: row.accountName,
    accountType: row.accountType ?? "BANK",
    bankId: row.bankId,
    bankName: row.bankName ?? undefined,
    accountNumber: row.accountNumber,
    branch: row.branch ?? undefined,
    swiftCode: row.swiftCode ?? undefined,
    locationId: row.locationId ?? undefined,
    currency: row.currency,
    openingBalance: row.openingBalance,
    currentBalance: row.currentBalance,
    isDefault: row.isDefault,
    allowPayments: row.allowPayments,
    allowReceipts: row.allowReceipts,
    openingBalanceDate: row.openingBalanceDate?.toISOString(),
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

async function getBankAccountRowById(id: string, isArchived = false) {
  const rows = await sql<BankAccountRow[]>`
    SELECT
      ba.id,
      ba."accountCode",
      ba."accountName",
      NULL::text AS "accountType",
      ba."bankId",
      b.name AS "bankName",
      ba."accountNumber",
      ba.branch,
      ba."swiftCode",
      ba."locationId",
      ba.currency,
      ba."openingBalance",
      ba."currentBalance",
      ba."isDefault",
      ba."allowPayments",
      ba."allowReceipts",
      ba."openingBalanceDate",
      ba."createdById",
      ba."updatedById",
      ba."isActive",
      ba."isArchived",
      ba."createdAt",
      ba."updatedAt"
    FROM "BankAccount" ba
    LEFT JOIN "Bank" b ON b.id = ba."bankId"
    WHERE ba.id = ${id}
      AND ba."isArchived" = ${isArchived}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function validateBank(bankId: string) {
  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "Bank"
    WHERE id = ${bankId}
      AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0]?.id ?? null;
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<BankAccount>> {
  const rows = await sql<BankAccountRow[]>`
    SELECT
      ba.id,
      ba."accountCode",
      ba."accountName",
      NULL::text AS "accountType",
      ba."bankId",
      b.name AS "bankName",
      ba."accountNumber",
      ba.branch,
      ba."swiftCode",
      ba."locationId",
      ba.currency,
      ba."openingBalance",
      ba."currentBalance",
      ba."isDefault",
      ba."allowPayments",
      ba."allowReceipts",
      ba."openingBalanceDate",
      ba."createdById",
      ba."updatedById",
      ba."isActive",
      ba."isArchived",
      ba."createdAt",
      ba."updatedAt"
    FROM "BankAccount" ba
    LEFT JOIN "Bank" b ON b.id = ba."bankId"
    WHERE ba."isArchived" = false
    ORDER BY ba."accountName" ASC
  `;

  const accounts = rows.map(mapBankAccount);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = accounts.filter((account) => {
    if (params?.isActive !== undefined && account.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [account.accountName, account.accountCode, account.accountNumber, account.bankName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<BankAccount>> {
  const row = await getBankAccountRowById(id);
  if (!row) {
    return { success: false, error: "Bank account not found" };
  }
  return { success: true, data: mapBankAccount(row) };
}

export async function create(input: CreateBankAccountInput, userId: string, userName: string): Promise<ServiceResult<BankAccount>> {
  try {
    const accountCode = normalizeString(input.accountCode);
    const accountName = normalizeString(input.accountName);
    const bankId = normalizeString(input.bankId);
    const accountNumber = normalizeString(input.accountNumber);

    if (!accountCode || !accountName || !bankId || !accountNumber) {
      return { success: false, error: "Account code, account name, bank, and account number are required" };
    }

    if (!(await validateBank(bankId))) {
      return { success: false, error: "Selected bank was not found" };
    }

    const rows = await sql<BankAccountRow[]>`
      INSERT INTO "BankAccount" (
        "accountCode",
        "accountName",
        "bankId",
        "accountNumber",
        branch,
        "swiftCode",
        "locationId",
        currency,
        "openingBalance",
        "currentBalance",
        "isDefault",
        "allowPayments",
        "allowReceipts",
        "openingBalanceDate",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${accountCode},
        ${accountName},
        ${bankId},
        ${accountNumber},
        ${normalizeString(input.branch)},
        ${normalizeString(input.swiftCode)},
        ${normalizeString(input.locationId)},
        ${normalizeString(input.currency) ?? "ETB"},
        ${Number(input.openingBalance ?? 0)},
        ${Number(input.currentBalance ?? input.openingBalance ?? 0)},
        ${input.isDefault ?? false},
        ${input.allowPayments ?? true},
        ${input.allowReceipts ?? true},
        ${input.openingBalanceDate ? new Date(input.openingBalanceDate) : null},
        ${userId},
        ${userId},
        ${input.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        "accountCode" AS "accountCode",
        "accountName" AS "accountName",
        NULL::text AS "accountType",
        "bankId" AS "bankId",
        NULL::text AS "bankName",
        "accountNumber" AS "accountNumber",
        branch,
        "swiftCode" AS "swiftCode",
        "locationId" AS "locationId",
        currency,
        "openingBalance" AS "openingBalance",
        "currentBalance" AS "currentBalance",
        "isDefault" AS "isDefault",
        "allowPayments" AS "allowPayments",
        "allowReceipts" AS "allowReceipts",
        "openingBalanceDate" AS "openingBalanceDate",
        "createdById" AS "createdById",
        "updatedById" AS "updatedById",
        "isActive" AS "isActive",
        "isArchived" AS "isArchived",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `;

    const result = await getById(rows[0].id);
    if (!result.success || !result.data) {
      return { success: false, error: "Created bank account could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "BANK_ACCOUNT",
      recordId: result.data.id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Bank account created successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create bank account" };
  }
}

export async function update(id: string, input: UpdateBankAccountInput, userId: string, userName: string): Promise<ServiceResult<BankAccount>> {
  try {
    const existing = await getBankAccountRowById(id);
    if (!existing) {
      return { success: false, error: "Bank account not found" };
    }

    const bankId = Object.prototype.hasOwnProperty.call(input, "bankId")
      ? normalizeString(input.bankId)
      : existing.bankId;
    if (!bankId || !(await validateBank(bankId))) {
      return { success: false, error: "Selected bank was not found" };
    }

    const rows = await sql<BankAccountRow[]>`
      UPDATE "BankAccount"
      SET
        "accountCode" = ${Object.prototype.hasOwnProperty.call(input, "accountCode") ? normalizeString(input.accountCode) : existing.accountCode},
        "accountName" = ${Object.prototype.hasOwnProperty.call(input, "accountName") ? normalizeString(input.accountName) : existing.accountName},
        "bankId" = ${bankId},
        "accountNumber" = ${Object.prototype.hasOwnProperty.call(input, "accountNumber") ? normalizeString(input.accountNumber) : existing.accountNumber},
        branch = ${Object.prototype.hasOwnProperty.call(input, "branch") ? normalizeString(input.branch) : existing.branch},
        "swiftCode" = ${Object.prototype.hasOwnProperty.call(input, "swiftCode") ? normalizeString(input.swiftCode) : existing.swiftCode},
        "locationId" = ${Object.prototype.hasOwnProperty.call(input, "locationId") ? normalizeString(input.locationId) : existing.locationId},
        currency = ${Object.prototype.hasOwnProperty.call(input, "currency") ? normalizeString(input.currency) ?? "ETB" : existing.currency},
        "openingBalance" = ${Object.prototype.hasOwnProperty.call(input, "openingBalance") ? Number(input.openingBalance ?? 0) : existing.openingBalance},
        "currentBalance" = ${Object.prototype.hasOwnProperty.call(input, "currentBalance") ? Number(input.currentBalance ?? 0) : existing.currentBalance},
        "isDefault" = ${Object.prototype.hasOwnProperty.call(input, "isDefault") ? input.isDefault ?? false : existing.isDefault},
        "allowPayments" = ${Object.prototype.hasOwnProperty.call(input, "allowPayments") ? input.allowPayments ?? true : existing.allowPayments},
        "allowReceipts" = ${Object.prototype.hasOwnProperty.call(input, "allowReceipts") ? input.allowReceipts ?? true : existing.allowReceipts},
        "openingBalanceDate" = ${Object.prototype.hasOwnProperty.call(input, "openingBalanceDate")
          ? input.openingBalanceDate ? new Date(input.openingBalanceDate) : null
          : existing.openingBalanceDate},
        "updatedById" = ${userId},
        "isActive" = ${Object.prototype.hasOwnProperty.call(input, "isActive") ? input.isActive ?? true : existing.isActive},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        "accountCode" AS "accountCode",
        "accountName" AS "accountName",
        NULL::text AS "accountType",
        "bankId" AS "bankId",
        NULL::text AS "bankName",
        "accountNumber" AS "accountNumber",
        branch,
        "swiftCode" AS "swiftCode",
        "locationId" AS "locationId",
        currency,
        "openingBalance" AS "openingBalance",
        "currentBalance" AS "currentBalance",
        "isDefault" AS "isDefault",
        "allowPayments" AS "allowPayments",
        "allowReceipts" AS "allowReceipts",
        "openingBalanceDate" AS "openingBalanceDate",
        "createdById" AS "createdById",
        "updatedById" AS "updatedById",
        "isActive" AS "isActive",
        "isArchived" AS "isArchived",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `;

    const result = await getById(rows[0].id);
    if (!result.success || !result.data) {
      return { success: false, error: "Updated bank account could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "BANK_ACCOUNT",
      recordId: result.data.id,
      oldValue: mapBankAccount(existing) as unknown as Record<string, unknown>,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Bank account updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update bank account" };
  }
}

export async function deactivate(id: string, userId: string, userName: string): Promise<ServiceResult<BankAccount>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(id: string, userId: string, userName: string): Promise<ServiceResult<BankAccount>> {
  try {
    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Bank account not found" };
    }

    await sql`
      UPDATE "BankAccount"
      SET "isArchived" = true, "isActive" = false, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "BANK_ACCOUNT",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: { isArchived: true, isActive: false },
    });

    return { success: true, data: { ...existing.data, isArchived: true, isActive: false }, message: "Bank account archived successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive bank account" };
  }
}

export async function restore(id: string, userId: string, userName: string): Promise<ServiceResult<BankAccount>> {
  try {
    const rows = await sql<Array<{ id: string }>>`
      UPDATE "BankAccount"
      SET "isArchived" = false, "isActive" = true, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING id
    `;

    if (!rows[0]?.id) {
      return { success: false, error: "Bank account not found" };
    }

    const result = await getById(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Restored bank account could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "BANK_ACCOUNT",
      recordId: id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Bank account restored successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore bank account" };
  }
}

export async function search(query: string): Promise<ServiceResult<BankAccount[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
