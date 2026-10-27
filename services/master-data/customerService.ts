import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  CreateCustomerInput,
  Customer,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  UpdateCustomerInput,
} from "@/types/master-data";

type CustomerRow = {
  id: string;
  customerCode: string;
  name: string;
  customerType: string | null;
  tin: string | null;
  vatRegistered: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  creditLimit: number | null;
  paymentTerms: string | null;
  defaultPriceListId: string | null;
  defaultSalesLocationId: string | null;
  taxCodeId: string | null;
  remarks: string | null;
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

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    customerCode: row.customerCode,
    name: row.name,
    customerType: row.customerType ?? undefined,
    tin: row.tin ?? undefined,
    vatRegistered: row.vatRegistered,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    creditLimit: row.creditLimit ?? 0,
    paymentTerms: row.paymentTerms ?? undefined,
    defaultPriceListId: row.defaultPriceListId ?? undefined,
    defaultSalesLocationId: row.defaultSalesLocationId ?? undefined,
    taxCodeId: row.taxCodeId ?? undefined,
    remarks: row.remarks ?? undefined,
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

async function getCustomerRowById(id: string, isArchived = false) {
  const rows = await sql<CustomerRow[]>`
    SELECT
      id,
      "customerCode",
      name,
      "customerType",
      tin,
      "vatRegistered",
      phone,
      email,
      address,
      city,
      region,
      "creditLimit",
      "paymentTerms",
      "defaultPriceListId",
      "defaultSalesLocationId",
      "taxCodeId",
      remarks,
      "createdById",
      "updatedById",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    FROM "Customer"
    WHERE id = ${id}
      AND "isArchived" = ${isArchived}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<Customer>> {
  const rows = await sql<CustomerRow[]>`
    SELECT
      id,
      "customerCode",
      name,
      "customerType",
      tin,
      "vatRegistered",
      phone,
      email,
      address,
      city,
      region,
      "creditLimit",
      "paymentTerms",
      "defaultPriceListId",
      "defaultSalesLocationId",
      "taxCodeId",
      remarks,
      "createdById",
      "updatedById",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    FROM "Customer"
    WHERE "isArchived" = false
    ORDER BY name ASC
  `;

  const customers = rows.map(mapCustomer);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = customers.filter((customer) => {
    if (params?.isActive !== undefined && customer.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [customer.name, customer.customerCode, customer.phone, customer.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<Customer>> {
  const row = await getCustomerRowById(id);
  if (!row) {
    return { success: false, error: "Customer not found" };
  }
  return { success: true, data: mapCustomer(row) };
}

export async function create(input: CreateCustomerInput, userId: string, userName: string): Promise<ServiceResult<Customer>> {
  try {
    const name = normalizeString(input.name);
    const customerCode = normalizeString(input.customerCode);
    if (!name || !customerCode) {
      return { success: false, error: "Customer code and name are required" };
    }

    const rows = await sql<CustomerRow[]>`
      INSERT INTO "Customer" (
        "customerCode",
        name,
        "customerType",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "creditLimit",
        "paymentTerms",
        "defaultPriceListId",
        "defaultSalesLocationId",
        "taxCodeId",
        remarks,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${customerCode},
        ${name},
        ${normalizeString(input.customerType)},
        ${normalizeString(input.tin)},
        ${input.vatRegistered ?? false},
        ${normalizeString(input.phone)},
        ${normalizeString(input.email)},
        ${normalizeString(input.address)},
        ${normalizeString(input.city)},
        ${normalizeString(input.region)},
        ${Number(input.creditLimit ?? 0)},
        ${normalizeString(input.paymentTerms)},
        ${normalizeString(input.defaultPriceListId)},
        ${normalizeString(input.defaultSalesLocationId)},
        ${normalizeString(input.taxCodeId)},
        ${normalizeString(input.remarks)},
        ${userId},
        ${userId},
        ${input.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        "customerCode",
        name,
        "customerType",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "creditLimit",
        "paymentTerms",
        "defaultPriceListId",
        "defaultSalesLocationId",
        "taxCodeId",
        remarks,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const customer = mapCustomer(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "CUSTOMER",
      recordId: customer.id,
      newValue: customer as unknown as Record<string, unknown>,
    });

    return { success: true, data: customer, message: "Customer created successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create customer" };
  }
}

export async function update(id: string, input: UpdateCustomerInput, userId: string, userName: string): Promise<ServiceResult<Customer>> {
  try {
    const existing = await getCustomerRowById(id);
    if (!existing) {
      return { success: false, error: "Customer not found" };
    }

    const rows = await sql<CustomerRow[]>`
      UPDATE "Customer"
      SET
        "customerCode" = ${Object.prototype.hasOwnProperty.call(input, "customerCode") ? normalizeString(input.customerCode) : existing.customerCode},
        name = ${Object.prototype.hasOwnProperty.call(input, "name") ? normalizeString(input.name) : existing.name},
        "customerType" = ${Object.prototype.hasOwnProperty.call(input, "customerType") ? normalizeString(input.customerType) : existing.customerType},
        tin = ${Object.prototype.hasOwnProperty.call(input, "tin") ? normalizeString(input.tin) : existing.tin},
        "vatRegistered" = ${Object.prototype.hasOwnProperty.call(input, "vatRegistered") ? input.vatRegistered ?? false : existing.vatRegistered},
        phone = ${Object.prototype.hasOwnProperty.call(input, "phone") ? normalizeString(input.phone) : existing.phone},
        email = ${Object.prototype.hasOwnProperty.call(input, "email") ? normalizeString(input.email) : existing.email},
        address = ${Object.prototype.hasOwnProperty.call(input, "address") ? normalizeString(input.address) : existing.address},
        city = ${Object.prototype.hasOwnProperty.call(input, "city") ? normalizeString(input.city) : existing.city},
        region = ${Object.prototype.hasOwnProperty.call(input, "region") ? normalizeString(input.region) : existing.region},
        "creditLimit" = ${Object.prototype.hasOwnProperty.call(input, "creditLimit") ? Number(input.creditLimit ?? 0) : existing.creditLimit},
        "paymentTerms" = ${Object.prototype.hasOwnProperty.call(input, "paymentTerms") ? normalizeString(input.paymentTerms) : existing.paymentTerms},
        "defaultPriceListId" = ${Object.prototype.hasOwnProperty.call(input, "defaultPriceListId") ? normalizeString(input.defaultPriceListId) : existing.defaultPriceListId},
        "defaultSalesLocationId" = ${Object.prototype.hasOwnProperty.call(input, "defaultSalesLocationId") ? normalizeString(input.defaultSalesLocationId) : existing.defaultSalesLocationId},
        "taxCodeId" = ${Object.prototype.hasOwnProperty.call(input, "taxCodeId") ? normalizeString(input.taxCodeId) : existing.taxCodeId},
        remarks = ${Object.prototype.hasOwnProperty.call(input, "remarks") ? normalizeString(input.remarks) : existing.remarks},
        "updatedById" = ${userId},
        "isActive" = ${Object.prototype.hasOwnProperty.call(input, "isActive") ? input.isActive ?? true : existing.isActive},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        "customerCode",
        name,
        "customerType",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "creditLimit",
        "paymentTerms",
        "defaultPriceListId",
        "defaultSalesLocationId",
        "taxCodeId",
        remarks,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const customer = mapCustomer(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "CUSTOMER",
      recordId: customer.id,
      oldValue: mapCustomer(existing) as unknown as Record<string, unknown>,
      newValue: customer as unknown as Record<string, unknown>,
    });

    return { success: true, data: customer, message: "Customer updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update customer" };
  }
}

export async function deactivate(id: string, userId: string, userName: string): Promise<ServiceResult<Customer>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(id: string, userId: string, userName: string): Promise<ServiceResult<Customer>> {
  try {
    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Customer not found" };
    }

    await sql`
      UPDATE "Customer"
      SET "isArchived" = true, "isActive" = false, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "CUSTOMER",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: { isArchived: true, isActive: false },
    });

    return { success: true, data: { ...existing.data, isArchived: true, isActive: false }, message: "Customer archived successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive customer" };
  }
}

export async function restore(id: string, userId: string, userName: string): Promise<ServiceResult<Customer>> {
  try {
    const rows = await sql<CustomerRow[]>`
      UPDATE "Customer"
      SET "isArchived" = false, "isActive" = true, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING
        id,
        "customerCode",
        name,
        "customerType",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "creditLimit",
        "paymentTerms",
        "defaultPriceListId",
        "defaultSalesLocationId",
        "taxCodeId",
        remarks,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    if (!rows[0]) {
      return { success: false, error: "Customer not found" };
    }

    const customer = mapCustomer(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "CUSTOMER",
      recordId: id,
      newValue: customer as unknown as Record<string, unknown>,
    });

    return { success: true, data: customer, message: "Customer restored successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore customer" };
  }
}

export async function search(query: string): Promise<ServiceResult<Customer[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
