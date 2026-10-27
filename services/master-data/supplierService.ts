import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  CreateSupplierInput,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  Supplier,
  UpdateSupplierInput,
} from "@/types/master-data";

type SupplierRow = {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string | null;
  tin: string | null;
  vatRegistered: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  paymentTerms: string | null;
  defaultBankId: string | null;
  defaultBankAccountId: string | null;
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

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    supplierCode: row.supplierCode,
    name: row.name,
    contactPerson: row.contactPerson ?? undefined,
    tin: row.tin ?? undefined,
    vatRegistered: row.vatRegistered,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    paymentTerms: row.paymentTerms ?? undefined,
    defaultBankId: row.defaultBankId ?? undefined,
    defaultBankAccountId: row.defaultBankAccountId ?? undefined,
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

async function getSupplierRowById(id: string, isArchived = false) {
  const rows = await sql<SupplierRow[]>`
    SELECT
      id,
      "supplierCode",
      name,
      "contactPerson",
      tin,
      "vatRegistered",
      phone,
      email,
      address,
      city,
      region,
      "paymentTerms",
      "defaultBankId",
      "defaultBankAccountId",
      "taxCodeId",
      remarks,
      "createdById",
      "updatedById",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    FROM "Supplier"
    WHERE id = ${id}
      AND "isArchived" = ${isArchived}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<Supplier>> {
  const rows = await sql<SupplierRow[]>`
    SELECT
      id,
      "supplierCode",
      name,
      "contactPerson",
      tin,
      "vatRegistered",
      phone,
      email,
      address,
      city,
      region,
      "paymentTerms",
      "defaultBankId",
      "defaultBankAccountId",
      "taxCodeId",
      remarks,
      "createdById",
      "updatedById",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    FROM "Supplier"
    WHERE "isArchived" = false
    ORDER BY name ASC
  `;

  const suppliers = rows.map(mapSupplier);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = suppliers.filter((supplier) => {
    if (params?.isActive !== undefined && supplier.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [supplier.name, supplier.supplierCode, supplier.contactPerson, supplier.email, supplier.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<Supplier>> {
  const row = await getSupplierRowById(id);
  if (!row) {
    return { success: false, error: "Supplier not found" };
  }
  return { success: true, data: mapSupplier(row) };
}

export async function create(input: CreateSupplierInput, userId: string, userName: string): Promise<ServiceResult<Supplier>> {
  try {
    const name = normalizeString(input.name);
    const supplierCode = normalizeString(input.supplierCode);
    if (!name || !supplierCode) {
      return { success: false, error: "Supplier code and name are required" };
    }

    const rows = await sql<SupplierRow[]>`
      INSERT INTO "Supplier" (
        "supplierCode",
        name,
        "contactPerson",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "paymentTerms",
        "defaultBankId",
        "defaultBankAccountId",
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
        ${supplierCode},
        ${name},
        ${normalizeString(input.contactPerson)},
        ${normalizeString(input.tin)},
        ${input.vatRegistered ?? false},
        ${normalizeString(input.phone)},
        ${normalizeString(input.email)},
        ${normalizeString(input.address)},
        ${normalizeString(input.city)},
        ${normalizeString(input.region)},
        ${normalizeString(input.paymentTerms)},
        ${normalizeString(input.defaultBankId)},
        ${normalizeString(input.defaultBankAccountId)},
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
        "supplierCode",
        name,
        "contactPerson",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "paymentTerms",
        "defaultBankId",
        "defaultBankAccountId",
        "taxCodeId",
        remarks,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const supplier = mapSupplier(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "SUPPLIER",
      recordId: supplier.id,
      newValue: supplier as unknown as Record<string, unknown>,
    });

    return { success: true, data: supplier, message: "Supplier created successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create supplier" };
  }
}

export async function update(id: string, input: UpdateSupplierInput, userId: string, userName: string): Promise<ServiceResult<Supplier>> {
  try {
    const existing = await getSupplierRowById(id);
    if (!existing) {
      return { success: false, error: "Supplier not found" };
    }

    const rows = await sql<SupplierRow[]>`
      UPDATE "Supplier"
      SET
        "supplierCode" = ${Object.prototype.hasOwnProperty.call(input, "supplierCode") ? normalizeString(input.supplierCode) : existing.supplierCode},
        name = ${Object.prototype.hasOwnProperty.call(input, "name") ? normalizeString(input.name) : existing.name},
        "contactPerson" = ${Object.prototype.hasOwnProperty.call(input, "contactPerson") ? normalizeString(input.contactPerson) : existing.contactPerson},
        tin = ${Object.prototype.hasOwnProperty.call(input, "tin") ? normalizeString(input.tin) : existing.tin},
        "vatRegistered" = ${Object.prototype.hasOwnProperty.call(input, "vatRegistered") ? input.vatRegistered ?? false : existing.vatRegistered},
        phone = ${Object.prototype.hasOwnProperty.call(input, "phone") ? normalizeString(input.phone) : existing.phone},
        email = ${Object.prototype.hasOwnProperty.call(input, "email") ? normalizeString(input.email) : existing.email},
        address = ${Object.prototype.hasOwnProperty.call(input, "address") ? normalizeString(input.address) : existing.address},
        city = ${Object.prototype.hasOwnProperty.call(input, "city") ? normalizeString(input.city) : existing.city},
        region = ${Object.prototype.hasOwnProperty.call(input, "region") ? normalizeString(input.region) : existing.region},
        "paymentTerms" = ${Object.prototype.hasOwnProperty.call(input, "paymentTerms") ? normalizeString(input.paymentTerms) : existing.paymentTerms},
        "defaultBankId" = ${Object.prototype.hasOwnProperty.call(input, "defaultBankId") ? normalizeString(input.defaultBankId) : existing.defaultBankId},
        "defaultBankAccountId" = ${Object.prototype.hasOwnProperty.call(input, "defaultBankAccountId") ? normalizeString(input.defaultBankAccountId) : existing.defaultBankAccountId},
        "taxCodeId" = ${Object.prototype.hasOwnProperty.call(input, "taxCodeId") ? normalizeString(input.taxCodeId) : existing.taxCodeId},
        remarks = ${Object.prototype.hasOwnProperty.call(input, "remarks") ? normalizeString(input.remarks) : existing.remarks},
        "updatedById" = ${userId},
        "isActive" = ${Object.prototype.hasOwnProperty.call(input, "isActive") ? input.isActive ?? true : existing.isActive},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        "supplierCode",
        name,
        "contactPerson",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "paymentTerms",
        "defaultBankId",
        "defaultBankAccountId",
        "taxCodeId",
        remarks,
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const supplier = mapSupplier(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "SUPPLIER",
      recordId: supplier.id,
      oldValue: mapSupplier(existing) as unknown as Record<string, unknown>,
      newValue: supplier as unknown as Record<string, unknown>,
    });

    return { success: true, data: supplier, message: "Supplier updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update supplier" };
  }
}

export async function deactivate(id: string, userId: string, userName: string): Promise<ServiceResult<Supplier>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(id: string, userId: string, userName: string): Promise<ServiceResult<Supplier>> {
  try {
    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Supplier not found" };
    }

    await sql`
      UPDATE "Supplier"
      SET "isArchived" = true, "isActive" = false, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "SUPPLIER",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: { isArchived: true, isActive: false },
    });

    return { success: true, data: { ...existing.data, isArchived: true, isActive: false }, message: "Supplier archived successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive supplier" };
  }
}

export async function restore(id: string, userId: string, userName: string): Promise<ServiceResult<Supplier>> {
  try {
    const rows = await sql<SupplierRow[]>`
      UPDATE "Supplier"
      SET "isArchived" = false, "isActive" = true, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING
        id,
        "supplierCode",
        name,
        "contactPerson",
        tin,
        "vatRegistered",
        phone,
        email,
        address,
        city,
        region,
        "paymentTerms",
        "defaultBankId",
        "defaultBankAccountId",
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
      return { success: false, error: "Supplier not found" };
    }

    const supplier = mapSupplier(rows[0]);
    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "SUPPLIER",
      recordId: id,
      newValue: supplier as unknown as Record<string, unknown>,
    });

    return { success: true, data: supplier, message: "Supplier restored successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore supplier" };
  }
}

export async function search(query: string): Promise<ServiceResult<Supplier[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
