import { sql } from "@/lib/db";
import type {
  CreateRoleInput,
  PaginatedResult,
  QueryParams,
  Role,
  ServiceResult,
  UpdateRoleInput,
} from "@/types/administration";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissionsCount: number;
  usersCount: number;
};

function splitPermissionKey(value: string): { module: string; action: string } {
  const [module, action] = value.split(".");
  return { module: module?.trim() ?? "", action: action?.trim() ?? "" };
}

function mapRole(row: RoleRow, permissions: string[] = []): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    permissions,
    isActive: row.isActive,
    isArchived: row.isArchived,
    isSystem: row.isSystem,
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

async function getRoleRowById(id: string, includeArchived = false) {
  const rows = await sql<RoleRow[]>`
    SELECT
      r.id,
      r.name,
      r.description,
      r."isSystem",
      r."isActive",
      r."isArchived",
      r."createdAt",
      r."updatedAt",
      COALESCE((
        SELECT COUNT(*)
        FROM "RolePermission" rp
        WHERE rp."roleId" = r.id AND rp."isArchived" = false
      ), 0)::int AS "permissionsCount",
      COALESCE((
        SELECT COUNT(*)
        FROM "User" u
        WHERE u."roleId" = r.id AND u."isArchived" = false
      ), 0)::int AS "usersCount"
    FROM "Role" r
    WHERE r.id = ${id}
      AND r."isArchived" = ${includeArchived}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getPermissionsForRole(roleId: string) {
  const rows = await sql<Array<{ module: string; action: string }>>`
    SELECT module, action
    FROM "RolePermission"
    WHERE "roleId" = ${roleId}
      AND "isArchived" = false
    ORDER BY module ASC, action ASC
  `;

  return rows.map((row) => `${row.module}.${row.action}`);
}

async function resolvePermissionIds(permissionKeys: string[]) {
  if (permissionKeys.length === 0) {
    return [];
  }

  const normalized = permissionKeys
    .map((value) => splitPermissionKey(value))
    .filter((item) => item.module && item.action);

  const rows = await sql<Array<{ id: string; module: string; action: string }>>`
    SELECT id, module, action
    FROM "Permission"
    WHERE "isArchived" = false
  `;

  const lookup = new Map(
    rows.map((row) => [`${row.module}.${row.action}`, row.id]),
  );

  return normalized
    .map((item) => ({
      id: lookup.get(`${item.module}.${item.action}`),
      module: item.module,
      action: item.action,
    }))
    .filter(
      (item): item is { id: string; module: string; action: string } =>
        Boolean(item.id),
    );
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<Role>> {
  const rows = await sql<RoleRow[]>`
    SELECT
      r.id,
      r.name,
      r.description,
      r."isSystem",
      r."isActive",
      r."isArchived",
      r."createdAt",
      r."updatedAt",
      COALESCE((
        SELECT COUNT(*)
        FROM "RolePermission" rp
        WHERE rp."roleId" = r.id AND rp."isArchived" = false
      ), 0)::int AS "permissionsCount",
      COALESCE((
        SELECT COUNT(*)
        FROM "User" u
        WHERE u."roleId" = r.id AND u."isArchived" = false
      ), 0)::int AS "usersCount"
    FROM "Role" r
    WHERE r."isArchived" = false
    ORDER BY r.name ASC
  `;

  const roles = rows.map((row) => mapRole(row));
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = roles.filter((role) => {
    if (params?.isActive !== undefined && role.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [role.name, role.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<Role>> {
  const row = await getRoleRowById(id);
  if (!row) {
    return { success: false, error: "Role not found" };
  }

  const permissions = await getPermissionsForRole(id);
  return { success: true, data: mapRole(row, permissions) };
}

export async function create(
  input: CreateRoleInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  try {
    const name = String(input.name ?? "").trim();
    if (!name) {
      return { success: false, error: "Role name is required" };
    }

    const permissions = Array.isArray(input.permissions) ? input.permissions : [];
    const resolvedPermissions = await resolvePermissionIds(permissions);

    const createdId = await sql.begin(async (tx) => {
      const rows = await tx<Array<{ id: string }>>`
        INSERT INTO "Role" (
          name,
          description,
          "isSystem",
          "isActive",
          "isArchived",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${name},
          ${String(input.description ?? "").trim() || null},
          false,
          ${input.isActive ?? true},
          false,
          NOW(),
          NOW()
        )
        RETURNING id
      `;

      const roleId = rows[0]?.id;
      if (!roleId) {
        throw new Error("Failed to create role");
      }

      for (const permission of resolvedPermissions) {
        await tx`
          INSERT INTO "RolePermission" (
            "id",
            "roleId",
            "permission",
            "module",
            "action",
            "isArchived"
          )
          VALUES (
            ${crypto.randomUUID()},
            ${roleId},
            ${permission.id},
            ${permission.module},
            ${permission.action},
            false
          )
        `;
      }

      return roleId;
    });

    const result = await getById(createdId);
    if (!result.success || !result.data) {
      return { success: false, error: "Created role could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "ROLE",
      recordId: createdId,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Role created successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create role",
    };
  }
}

export async function update(
  id: string,
  input: UpdateRoleInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  try {
    const existingRow = await getRoleRowById(id);
    if (!existingRow) {
      return { success: false, error: "Role not found" };
    }

    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Role not found" };
    }

    const name = String(input.name ?? existingRow.name).trim();
    if (!name) {
      return { success: false, error: "Role name is required" };
    }

    const permissions =
      existingRow.isSystem || !Array.isArray(input.permissions)
        ? existing.data.permissions
        : input.permissions;

    const resolvedPermissions = await resolvePermissionIds(permissions);

    await sql.begin(async (tx) => {
      await tx`
        UPDATE "Role"
        SET
          name = ${name},
          description = ${Object.prototype.hasOwnProperty.call(input, "description")
            ? String(input.description ?? "").trim() || null
            : existingRow.description},
          "isActive" = ${existingRow.isSystem ? true : input.isActive ?? existingRow.isActive},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;

      await tx`
        DELETE FROM "RolePermission"
        WHERE "roleId" = ${id}
      `;

      for (const permission of resolvedPermissions) {
        await tx`
          INSERT INTO "RolePermission" (
            "id",
            "roleId",
            "permission",
            "module",
            "action",
            "isArchived"
          )
          VALUES (
            ${crypto.randomUUID()},
            ${id},
            ${permission.id},
            ${permission.module},
            ${permission.action},
            false
          )
        `;
      }
    });

    const result = await getById(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Updated role could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "ROLE",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Role updated successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  try {
    const existingRow = await getRoleRowById(id);
    if (!existingRow) {
      return { success: false, error: "Role not found" };
    }
    if (existingRow.isSystem) {
      return { success: false, error: "System roles cannot be archived" };
    }

    const existing = await getById(id);

    await sql.begin(async (tx) => {
      await tx`
        UPDATE "Role"
        SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
        WHERE id = ${id}
      `;

      await tx`
        UPDATE "RolePermission"
        SET "isArchived" = true
        WHERE "roleId" = ${id}
      `;
    });

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "ROLE",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown> | undefined,
      newValue: { isArchived: true, isActive: false },
    });

    return {
      success: true,
      data: existing.data ? { ...existing.data, isArchived: true, isActive: false } : undefined,
      message: "Role archived successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive role",
    };
  }
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<Role>> {
  try {
    const rows = await sql<Array<{ id: string }>>`
      UPDATE "Role"
      SET "isArchived" = false, "isActive" = true, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING id
    `;

    if (!rows[0]?.id) {
      return { success: false, error: "Role not found" };
    }

    await sql`
      UPDATE "RolePermission"
      SET "isArchived" = false
      WHERE "roleId" = ${id}
    `;

    const result = await getById(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Restored role could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "ROLE",
      recordId: id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "Role restored successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore role",
    };
  }
}

export async function search(query: string): Promise<ServiceResult<Role[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
