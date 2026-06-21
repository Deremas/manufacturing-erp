// ----------------------------------------------------------------------------
// KONEL ERP — BankAccount Service
// ----------------------------------------------------------------------------
// Manages BankAccount CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";
import { AuditAction } from "@/services/audit/auditLog";

const bankAccounts: BankAccount[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `bacct-${Date.now()}-${idCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

async function recordAudit(
  action: AuditAction,
  recordId: string,
  userId: string,
  userName: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
): Promise<void> {
  const { createAuditLog } = await import("@/services/audit/auditLog");
  await createAuditLog({
    userId,
    userName,
    action,
    module: "BANK_ACCOUNT",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<BankAccount>> {
  let filtered = [...bankAccounts];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.accountName.toLowerCase().includes(q) ||
        a.accountCode.toLowerCase().includes(q) ||
        a.accountNumber.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((a) => a.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((a) => a.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<BankAccount>> {
  const account = bankAccounts.find((a) => a.id === id);
  if (!account) return { success: false, error: "BankAccount not found" };
  return { success: true, data: account };
}

export async function create(
  input: CreateBankAccountInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<BankAccount>> {
  const ts = now();
  const newAccount: BankAccount = {
    id: nextId(),
    accountCode: input.accountCode,
    accountName: input.accountName,
    accountType: input.accountType,
    bankId: input.bankId,
    accountNumber: input.accountNumber,
    branch: input.branch,
    swiftCode: input.swiftCode,
    locationId: input.locationId,
    currency: input.currency ?? "ETB",
    openingBalance: input.openingBalance ?? 0,
    currentBalance: input.currentBalance ?? 0,
    isDefault: input.isDefault ?? false,
    allowPayments: input.allowPayments ?? true,
    allowReceipts: input.allowReceipts ?? true,
    openingBalanceDate: input.openingBalanceDate,
    createdById: userId,
    updatedById: userId,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  bankAccounts.push(newAccount);
  await recordAudit(
    AuditAction.CREATE,
    newAccount.id,
    userId,
    userName,
    undefined,
    { ...newAccount },
  );
  return {
    success: true,
    data: newAccount,
    message: "BankAccount created successfully",
  };
}

export async function update(
  id: string,
  input: UpdateBankAccountInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<BankAccount>> {
  const idx = bankAccounts.findIndex((a) => a.id === id);
  if (idx === -1) return { success: false, error: "BankAccount not found" };
  const old = { ...bankAccounts[idx] };
  bankAccounts[idx] = {
    ...bankAccounts[idx],
    ...input,
    updatedById: userId,
    updatedAt: now(),
  };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...bankAccounts[idx],
  });
  return {
    success: true,
    data: bankAccounts[idx],
    message: "BankAccount updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<BankAccount>> {
  const idx = bankAccounts.findIndex((a) => a.id === id);
  if (idx === -1) return { success: false, error: "BankAccount not found" };
  const old = { ...bankAccounts[idx] };
  bankAccounts[idx].isActive = false;
  bankAccounts[idx].updatedById = userId;
  bankAccounts[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...bankAccounts[idx],
  });
  return {
    success: true,
    data: bankAccounts[idx],
    message: "BankAccount deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<BankAccount>> {
  const idx = bankAccounts.findIndex((a) => a.id === id);
  if (idx === -1) return { success: false, error: "BankAccount not found" };
  const old = { ...bankAccounts[idx] };
  bankAccounts[idx].isArchived = true;
  bankAccounts[idx].isActive = false;
  bankAccounts[idx].updatedById = userId;
  bankAccounts[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...bankAccounts[idx],
  });
  return {
    success: true,
    data: bankAccounts[idx],
    message: "BankAccount archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<BankAccount>> {
  const idx = bankAccounts.findIndex((a) => a.id === id);
  if (idx === -1) return { success: false, error: "BankAccount not found" };
  const old = { ...bankAccounts[idx] };
  bankAccounts[idx].isArchived = false;
  bankAccounts[idx].isActive = true;
  bankAccounts[idx].updatedById = userId;
  bankAccounts[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...bankAccounts[idx],
  });
  return {
    success: true,
    data: bankAccounts[idx],
    message: "BankAccount restored successfully",
  };
}

export async function search(
  query: string,
): Promise<ServiceResult<BankAccount[]>> {
  const q = query.toLowerCase();
  const results = bankAccounts.filter(
    (a) =>
      !a.isArchived &&
      (a.accountName.toLowerCase().includes(q) ||
        a.accountNumber.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}
