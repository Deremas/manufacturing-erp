// ----------------------------------------------------------------------------
// KONEL ERP — Bank Service
// ----------------------------------------------------------------------------
// Manages Bank CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  Bank,
  CreateBankInput,
  UpdateBankInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";
import { AuditAction } from "@/services/audit/auditLog";

const banks: Bank[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `bank-${Date.now()}-${idCounter}`;
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
    module: "BANK",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<Bank>> {
  let filtered = [...banks];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((b) => b.name.toLowerCase().includes(q));
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((b) => b.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((b) => b.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<Bank>> {
  const bank = banks.find((b) => b.id === id);
  if (!bank) return { success: false, error: "Bank not found" };
  return { success: true, data: bank };
}

export async function create(
  input: CreateBankInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Bank>> {
  const ts = now();
  const newBank: Bank = {
    id: nextId(),
    code: input.code,
    name: input.name,
    shortName: input.shortName,
    swiftCode: input.swiftCode,
    description: input.description,
    createdById: userId,
    updatedById: userId,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  banks.push(newBank);
  await recordAudit(
    AuditAction.CREATE,
    newBank.id,
    userId,
    userName,
    undefined,
    { ...newBank },
  );
  return { success: true, data: newBank, message: "Bank created successfully" };
}

export async function update(
  id: string,
  input: UpdateBankInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Bank>> {
  const idx = banks.findIndex((b) => b.id === id);
  if (idx === -1) return { success: false, error: "Bank not found" };
  const old = { ...banks[idx] };
  banks[idx] = {
    ...banks[idx],
    ...input,
    updatedById: userId,
    updatedAt: now(),
  };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...banks[idx],
  });
  return {
    success: true,
    data: banks[idx],
    message: "Bank updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Bank>> {
  const idx = banks.findIndex((b) => b.id === id);
  if (idx === -1) return { success: false, error: "Bank not found" };
  const old = { ...banks[idx] };
  banks[idx].isActive = false;
  banks[idx].updatedById = userId;
  banks[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...banks[idx],
  });
  return {
    success: true,
    data: banks[idx],
    message: "Bank deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Bank>> {
  const idx = banks.findIndex((b) => b.id === id);
  if (idx === -1) return { success: false, error: "Bank not found" };
  const old = { ...banks[idx] };
  banks[idx].isArchived = true;
  banks[idx].isActive = false;
  banks[idx].updatedById = userId;
  banks[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...banks[idx],
  });
  return {
    success: true,
    data: banks[idx],
    message: "Bank archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Bank>> {
  const idx = banks.findIndex((b) => b.id === id);
  if (idx === -1) return { success: false, error: "Bank not found" };
  const old = { ...banks[idx] };
  banks[idx].isArchived = false;
  banks[idx].isActive = true;
  banks[idx].updatedById = userId;
  banks[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...banks[idx],
  });
  return {
    success: true,
    data: banks[idx],
    message: "Bank restored successfully",
  };
}

export async function search(query: string): Promise<ServiceResult<Bank[]>> {
  const q = query.toLowerCase();
  const results = banks.filter(
    (b) =>
      !b.isArchived &&
      (b.name.toLowerCase().includes(q) || b.code?.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}
