// ----------------------------------------------------------------------------
// KONEL ERP — Role Service
// ----------------------------------------------------------------------------
// Manages Role CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  Role,
  CreateRoleInput,
  UpdateRoleInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/administration";
import { AuditAction } from "@/services/audit/auditLog";

const roles: Role[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `role-${Date.now()}-${idCounter}`;
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
    module: "ROLE",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<Role>> {
  let filtered = [...roles];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((r) => r.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((r) => r.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<Role>> {
  const role = roles.find((r) => r.id === id);
  if (!role) return { success: false, error: "Role not found" };
  return { success: true, data: role };
}

export async function create(
  input: CreateRoleInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  const ts = now();
  const newRole: Role = {
    id: nextId(),
    name: input.name,
    description: input.description,
    permissions: input.permissions ?? [],
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  roles.push(newRole);
  await recordAudit(
    AuditAction.CREATE,
    newRole.id,
    userId,
    userName,
    undefined,
    { ...newRole },
  );
  return { success: true, data: newRole, message: "Role created successfully" };
}

export async function update(
  id: string,
  input: UpdateRoleInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  const idx = roles.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, error: "Role not found" };
  const old = { ...roles[idx] };
  roles[idx] = { ...roles[idx], ...input, updatedAt: now() };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...roles[idx],
  });
  return {
    success: true,
    data: roles[idx],
    message: "Role updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  const idx = roles.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, error: "Role not found" };
  const old = { ...roles[idx] };
  roles[idx].isActive = false;
  roles[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...roles[idx],
  });
  return {
    success: true,
    data: roles[idx],
    message: "Role deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  const idx = roles.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, error: "Role not found" };
  const old = { ...roles[idx] };
  roles[idx].isArchived = true;
  roles[idx].isActive = false;
  roles[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...roles[idx],
  });
  return {
    success: true,
    data: roles[idx],
    message: "Role archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  const idx = roles.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, error: "Role not found" };
  const old = { ...roles[idx] };
  roles[idx].isArchived = false;
  roles[idx].isActive = true;
  roles[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...roles[idx],
  });
  return {
    success: true,
    data: roles[idx],
    message: "Role restored successfully",
  };
}

export async function search(query: string): Promise<ServiceResult<Role[]>> {
  const q = query.toLowerCase();
  const results = roles.filter(
    (r) => !r.isArchived && r.name.toLowerCase().includes(q),
  );
  return { success: true, data: results };
}
