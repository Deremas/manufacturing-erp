// ----------------------------------------------------------------------------
// KONEL ERP — User Service
// ----------------------------------------------------------------------------
// Manages User CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/administration";
import { AuditAction } from "@/services/audit/auditLog";

const users: User[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `user-${Date.now()}-${idCounter}`;
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
    module: "USER",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<User>> {
  let filtered = [...users];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((u) => u.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((u) => u.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<User>> {
  const user = users.find((u) => u.id === id);
  if (!user) return { success: false, error: "User not found" };
  return { success: true, data: user };
}

export async function getByEmail(email: string): Promise<ServiceResult<User>> {
  const user = users.find((u) => u.email === email);
  if (!user) return { success: false, error: "User not found" };
  return { success: true, data: user };
}

export async function create(
  input: CreateUserInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  const ts = now();
  const newUser: User = {
    id: nextId(),
    name: input.name,
    email: input.email,
    username: input.username,
    password: input.password,
    language: input.language ?? "en",
    dateFormat: input.dateFormat ?? "DD/MM/YYYY",
    itemsPerPage: input.itemsPerPage ?? 25,
    role: "user",
    roleId: input.roleId,
    phone: input.phone,
    avatar: input.avatar,
    permissions: input.permissions ?? [],
    locations: input.locations ?? [],
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  users.push(newUser);
  await recordAudit(
    AuditAction.CREATE,
    newUser.id,
    userId,
    userName,
    undefined,
    { ...newUser },
  );
  return { success: true, data: newUser, message: "User created successfully" };
}

export async function update(
  id: string,
  input: UpdateUserInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return { success: false, error: "User not found" };
  const old = { ...users[idx] };
  users[idx] = { ...users[idx], ...input, updatedAt: now() };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...users[idx],
  });
  return {
    success: true,
    data: users[idx],
    message: "User updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return { success: false, error: "User not found" };
  const old = { ...users[idx] };
  users[idx].isActive = false;
  users[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...users[idx],
  });
  return {
    success: true,
    data: users[idx],
    message: "User deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return { success: false, error: "User not found" };
  const old = { ...users[idx] };
  users[idx].isArchived = true;
  users[idx].isActive = false;
  users[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...users[idx],
  });
  return {
    success: true,
    data: users[idx],
    message: "User archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return { success: false, error: "User not found" };
  const old = { ...users[idx] };
  users[idx].isArchived = false;
  users[idx].isActive = true;
  users[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...users[idx],
  });
  return {
    success: true,
    data: users[idx],
    message: "User restored successfully",
  };
}

export async function search(query: string): Promise<ServiceResult<User[]>> {
  const q = query.toLowerCase();
  const results = users.filter(
    (u) =>
      !u.isArchived &&
      (u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}
