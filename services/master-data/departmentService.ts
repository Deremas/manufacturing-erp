// ----------------------------------------------------------------------------
// KONEL ERP — Department Service
// ----------------------------------------------------------------------------
// Manages Department CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";
import { AuditAction } from "@/services/audit/auditLog";

const departments: Department[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `dept-${Date.now()}-${idCounter}`;
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
    module: "DEPARTMENT",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<Department>> {
  let filtered = [...departments];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((d) => d.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((d) => d.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<Department>> {
  const dept = departments.find((d) => d.id === id);
  if (!dept) return { success: false, error: "Department not found" };
  return { success: true, data: dept };
}

export async function create(
  input: CreateDepartmentInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Department>> {
  const ts = now();
  const newDept: Department = {
    id: nextId(),
    name: input.name,
    code: input.code,
    parentDepartmentId: input.parentDepartmentId,
    description: input.description,
    locationId: input.locationId,
    managerId: input.managerId,
    createdById: userId,
    updatedById: userId,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  departments.push(newDept);
  await recordAudit(
    AuditAction.CREATE,
    newDept.id,
    userId,
    userName,
    undefined,
    { ...newDept },
  );
  return {
    success: true,
    data: newDept,
    message: "Department created successfully",
  };
}

export async function update(
  id: string,
  input: UpdateDepartmentInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Department>> {
  const idx = departments.findIndex((d) => d.id === id);
  if (idx === -1) return { success: false, error: "Department not found" };
  const old = { ...departments[idx] };
  departments[idx] = {
    ...departments[idx],
    ...input,
    updatedById: userId,
    updatedAt: now(),
  };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...departments[idx],
  });
  return {
    success: true,
    data: departments[idx],
    message: "Department updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Department>> {
  const idx = departments.findIndex((d) => d.id === id);
  if (idx === -1) return { success: false, error: "Department not found" };
  const old = { ...departments[idx] };
  departments[idx].isActive = false;
  departments[idx].updatedById = userId;
  departments[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...departments[idx],
  });
  return {
    success: true,
    data: departments[idx],
    message: "Department deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Department>> {
  const idx = departments.findIndex((d) => d.id === id);
  if (idx === -1) return { success: false, error: "Department not found" };
  const old = { ...departments[idx] };
  departments[idx].isArchived = true;
  departments[idx].isActive = false;
  departments[idx].updatedById = userId;
  departments[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...departments[idx],
  });
  return {
    success: true,
    data: departments[idx],
    message: "Department archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Department>> {
  const idx = departments.findIndex((d) => d.id === id);
  if (idx === -1) return { success: false, error: "Department not found" };
  const old = { ...departments[idx] };
  departments[idx].isArchived = false;
  departments[idx].isActive = true;
  departments[idx].updatedById = userId;
  departments[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...departments[idx],
  });
  return {
    success: true,
    data: departments[idx],
    message: "Department restored successfully",
  };
}

export async function search(
  query: string,
): Promise<ServiceResult<Department[]>> {
  const q = query.toLowerCase();
  const results = departments.filter(
    (d) =>
      !d.isArchived &&
      (d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}
