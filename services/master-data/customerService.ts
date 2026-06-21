// ----------------------------------------------------------------------------
// KONEL ERP — Customer Service
// ----------------------------------------------------------------------------
// Manages Customer CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";
import { AuditAction } from "@/services/audit/auditLog";

const customers: Customer[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `cust-${Date.now()}-${idCounter}`;
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
    module: "CUSTOMER",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<Customer>> {
  let filtered = [...customers];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((c) => c.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((c) => c.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<Customer>> {
  const customer = customers.find((c) => c.id === id);
  if (!customer) return { success: false, error: "Customer not found" };
  return { success: true, data: customer };
}

export async function create(
  input: CreateCustomerInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Customer>> {
  const ts = now();
  const newCustomer: Customer = {
    id: nextId(),
    customerCode: input.customerCode,
    name: input.name,
    customerType: input.customerType,
    tin: input.tin,
    vatRegistered: input.vatRegistered ?? false,
    phone: input.phone,
    email: input.email,
    address: input.address,
    city: input.city,
    region: input.region,
    creditLimit: input.creditLimit ?? 0,
    paymentTerms: input.paymentTerms,
    defaultPriceListId: input.defaultPriceListId,
    defaultSalesLocationId: input.defaultSalesLocationId,
    taxCodeId: input.taxCodeId,
    remarks: input.remarks,
    createdById: userId,
    updatedById: userId,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  customers.push(newCustomer);
  await recordAudit(
    AuditAction.CREATE,
    newCustomer.id,
    userId,
    userName,
    undefined,
    { ...newCustomer },
  );
  return {
    success: true,
    data: newCustomer,
    message: "Customer created successfully",
  };
}

export async function update(
  id: string,
  input: UpdateCustomerInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Customer>> {
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return { success: false, error: "Customer not found" };
  const old = { ...customers[idx] };
  customers[idx] = {
    ...customers[idx],
    ...input,
    updatedById: userId,
    updatedAt: now(),
  };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...customers[idx],
  });
  return {
    success: true,
    data: customers[idx],
    message: "Customer updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Customer>> {
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return { success: false, error: "Customer not found" };
  const old = { ...customers[idx] };
  customers[idx].isActive = false;
  customers[idx].updatedById = userId;
  customers[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...customers[idx],
  });
  return {
    success: true,
    data: customers[idx],
    message: "Customer deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Customer>> {
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return { success: false, error: "Customer not found" };
  const old = { ...customers[idx] };
  customers[idx].isArchived = true;
  customers[idx].isActive = false;
  customers[idx].updatedById = userId;
  customers[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...customers[idx],
  });
  return {
    success: true,
    data: customers[idx],
    message: "Customer archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Customer>> {
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return { success: false, error: "Customer not found" };
  const old = { ...customers[idx] };
  customers[idx].isArchived = false;
  customers[idx].isActive = true;
  customers[idx].updatedById = userId;
  customers[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...customers[idx],
  });
  return {
    success: true,
    data: customers[idx],
    message: "Customer restored successfully",
  };
}

export async function search(
  query: string,
): Promise<ServiceResult<Customer[]>> {
  const q = query.toLowerCase();
  const results = customers.filter(
    (c) =>
      !c.isArchived &&
      (c.name.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}
