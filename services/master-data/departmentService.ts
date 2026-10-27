import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  CreateDepartmentInput,
  Department,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  UpdateDepartmentInput,
} from "@/types/master-data";

type DepartmentRow = {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  parentDepartmentName: string | null;
  description: string | null;
  locationId: string | null;
  managerId: string | null;
  managerName: string | null;
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

function mapDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    parentDepartmentId: row.parentDepartmentId ?? undefined,
    parentDepartmentName: row.parentDepartmentName ?? undefined,
    description: row.description ?? undefined,
    locationId: row.locationId ?? undefined,
    managerId: row.managerId ?? undefined,
    managerName: row.managerName ?? undefined,
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

async function getDepartmentRowById(id: string, isArchived = false) {
  const rows = await sql<DepartmentRow[]>`
    SELECT
      d.id,
      d.name,
      d.code,
      d."parentDepartmentId",
      p.name AS "parentDepartmentName",
      d.description,
      d."locationId",
      d."managerId",
      u.name AS "managerName",
      d."createdById",
      d."updatedById",
      d."isActive",
      d."isArchived",
      d."createdAt",
      d."updatedAt"
    FROM "Department" d
    LEFT JOIN "Department" p ON p.id = d."parentDepartmentId"
    LEFT JOIN "User" u ON u.id = d."managerId"
    WHERE d.id = ${id}
      AND d."isArchived" = ${isArchived}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<Department>> {
  const rows = await sql<DepartmentRow[]>`
    SELECT
      d.id,
      d.name,
      d.code,
      d."parentDepartmentId",
      p.name AS "parentDepartmentName",
      d.description,
      d."locationId",
      d."managerId",
      u.name AS "managerName",
      d."createdById",
      d."updatedById",
      d."isActive",
      d."isArchived",
      d."createdAt",
      d."updatedAt"
    FROM "Department" d
    LEFT JOIN "Department" p ON p.id = d."parentDepartmentId"
    LEFT JOIN "User" u ON u.id = d."managerId"
    WHERE d."isArchived" = false
    ORDER BY d.name ASC
  `;

  const departments = rows.map(mapDepartment);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = departments.filter((department) => {
    if (params?.isActive !== undefined && department.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [department.name, department.code, department.managerName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<Department>> {
  const row = await getDepartmentRowById(id);
  if (!row) {
    return { success: false, error: "Department not found" };
  }
  return { success: true, data: mapDepartment(row) };
}

export async function create(_input: CreateDepartmentInput, _userId: string, _userName: string): Promise<ServiceResult<Department>> {
  try {
    const input = _input;
    const userId = _userId;
    const userName = _userName;
    const name = normalizeString(input.name);
    const code = normalizeString(input.code);
    if (!name || !code) {
      return { success: false, error: "Department name and code are required" };
    }

    const rows = await sql<DepartmentRow[]>`
      INSERT INTO "Department" (
        name,
        code,
        "parentDepartmentId",
        description,
        "locationId",
        "managerId",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${name},
        ${code},
        ${normalizeString(input.parentDepartmentId)},
        ${normalizeString(input.description)},
        ${normalizeString(input.locationId)},
        ${normalizeString(input.managerId)},
        ${userId},
        ${userId},
        ${input.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        name,
        code,
        "parentDepartmentId",
        NULL::text AS "parentDepartmentName",
        description,
        "locationId",
        "managerId",
        NULL::text AS "managerName",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const result = await getById(rows[0].id);
    if (!result.success || !result.data) {
      return { success: false, error: "Created department could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "DEPARTMENT",
      recordId: result.data.id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Department created successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create department" };
  }
}

export async function update(id: string, input: UpdateDepartmentInput, userId: string, userName: string): Promise<ServiceResult<Department>> {
  try {
    const existing = await getDepartmentRowById(id);
    if (!existing) {
      return { success: false, error: "Department not found" };
    }

    const rows = await sql<DepartmentRow[]>`
      UPDATE "Department"
      SET
        name = ${Object.prototype.hasOwnProperty.call(input, "name") ? normalizeString(input.name) : existing.name},
        code = ${Object.prototype.hasOwnProperty.call(input, "code") ? normalizeString(input.code) : existing.code},
        "parentDepartmentId" = ${Object.prototype.hasOwnProperty.call(input, "parentDepartmentId") ? normalizeString(input.parentDepartmentId) : existing.parentDepartmentId},
        description = ${Object.prototype.hasOwnProperty.call(input, "description") ? normalizeString(input.description) : existing.description},
        "locationId" = ${Object.prototype.hasOwnProperty.call(input, "locationId") ? normalizeString(input.locationId) : existing.locationId},
        "managerId" = ${Object.prototype.hasOwnProperty.call(input, "managerId") ? normalizeString(input.managerId) : existing.managerId},
        "updatedById" = ${userId},
        "isActive" = ${Object.prototype.hasOwnProperty.call(input, "isActive") ? input.isActive ?? true : existing.isActive},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        name,
        code,
        "parentDepartmentId",
        NULL::text AS "parentDepartmentName",
        description,
        "locationId",
        "managerId",
        NULL::text AS "managerName",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
    `;

    const result = await getById(rows[0].id);
    if (!result.success || !result.data) {
      return { success: false, error: "Updated department could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "DEPARTMENT",
      recordId: result.data.id,
      oldValue: mapDepartment(existing) as unknown as Record<string, unknown>,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Department updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update department" };
  }
}

export async function deactivate(id: string, userId: string, userName: string): Promise<ServiceResult<Department>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(id: string, userId: string, userName: string): Promise<ServiceResult<Department>> {
  try {
    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Department not found" };
    }

    await sql`
      UPDATE "Department"
      SET "isArchived" = true, "isActive" = false, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "DEPARTMENT",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: { isArchived: true, isActive: false },
    });

    return { success: true, data: { ...existing.data, isArchived: true, isActive: false }, message: "Department archived successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive department" };
  }
}

export async function restore(id: string, userId: string, userName: string): Promise<ServiceResult<Department>> {
  try {
    const rows = await sql<Array<{ id: string }>>`
      UPDATE "Department"
      SET "isArchived" = false, "isActive" = true, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING id
    `;

    if (!rows[0]?.id) {
      return { success: false, error: "Department not found" };
    }

    const result = await getById(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Restored department could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "DEPARTMENT",
      recordId: id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Department restored successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore department" };
  }
}

export async function search(query: string): Promise<ServiceResult<Department[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
