// ----------------------------------------------------------------------------
// KONEL ERP — Supplier Service
// ----------------------------------------------------------------------------
// Manages Supplier CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";
import { AuditAction } from "@/services/audit/auditLog";

const suppliers: Supplier[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `supp-${Date.now()}-${idCounter}`;
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
    module: "SUPPLIER",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<Supplier>> {
  let filtered = [...suppliers];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.supplierCode.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((s) => s.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((s) => s.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<Supplier>> {
  const supplier = suppliers.find((s) => s.id === id);
  if (!supplier) return { success: false, error: "Supplier not found" };
  return { success: true, data: supplier };
}

export async function create(
  input: CreateSupplierInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Supplier>> {
  const ts = now();
  const newSupplier: Supplier = {
    id: nextId(),
    supplierCode: input.supplierCode,
    name: input.name,
    contactPerson: input.contactPerson,
    tin: input.tin,
    vatRegistered: input.vatRegistered ?? false,
    phone: input.phone,
    email: input.email,
    address: input.address,
    city: input.city,
    region: input.region,
    paymentTerms: input.paymentTerms,
    defaultBankId: input.defaultBankId,
    defaultBankAccountId: input.defaultBankAccountId,
    taxCodeId: input.taxCodeId,
    remarks: input.remarks,
    createdById: userId,
    updatedById: userId,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  suppliers.push(newSupplier);
  await recordAudit(
    AuditAction.CREATE,
    newSupplier.id,
    userId,
    userName,
    undefined,
    { ...newSupplier },
  );
  return {
    success: true,
    data: newSupplier,
    message: "Supplier created successfully",
  };
}

export async function update(
  id: string,
  input: UpdateSupplierInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Supplier>> {
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return { success: false, error: "Supplier not found" };
  const old = { ...suppliers[idx] };
  suppliers[idx] = {
    ...suppliers[idx],
    ...input,
    updatedById: userId,
    updatedAt: now(),
  };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...suppliers[idx],
  });
  return {
    success: true,
    data: suppliers[idx],
    message: "Supplier updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Supplier>> {
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return { success: false, error: "Supplier not found" };
  const old = { ...suppliers[idx] };
  suppliers[idx].isActive = false;
  suppliers[idx].updatedById = userId;
  suppliers[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...suppliers[idx],
  });
  return {
    success: true,
    data: suppliers[idx],
    message: "Supplier deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Supplier>> {
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return { success: false, error: "Supplier not found" };
  const old = { ...suppliers[idx] };
  suppliers[idx].isArchived = true;
  suppliers[idx].isActive = false;
  suppliers[idx].updatedById = userId;
  suppliers[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...suppliers[idx],
  });
  return {
    success: true,
    data: suppliers[idx],
    message: "Supplier archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Supplier>> {
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return { success: false, error: "Supplier not found" };
  const old = { ...suppliers[idx] };
  suppliers[idx].isArchived = false;
  suppliers[idx].isActive = true;
  suppliers[idx].updatedById = userId;
  suppliers[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...suppliers[idx],
  });
  return {
    success: true,
    data: suppliers[idx],
    message: "Supplier restored successfully",
  };
}

export async function search(
  query: string,
): Promise<ServiceResult<Supplier[]>> {
  const q = query.toLowerCase();
  const results = suppliers.filter(
    (s) =>
      !s.isArchived &&
      (s.name.toLowerCase().includes(q) ||
        s.supplierCode.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}
