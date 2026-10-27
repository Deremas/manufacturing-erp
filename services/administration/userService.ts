import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";
import type {
  CreateUserInput,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  UpdateUserInput,
  User,
} from "@/types/administration";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";

type UserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  role: string | null;
  roleId: string | null;
  roleName: string | null;
  isSystem: boolean;
  isActive: boolean;
  lastLogin: Date | null;
  language: string | null;
  dateFormat: string | null;
  itemsPerPage: number | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  locationId: string | null;
  locationName: string | null;
  isDefault: boolean | null;
};

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLocationIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function groupUsers(rows: UserRow[]): User[] {
  const grouped = new Map<string, User>();

  for (const row of rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username ?? undefined,
        phone: row.phone ?? undefined,
        role: row.roleName ?? row.role ?? "",
        roleId: row.roleId ?? undefined,
        roleName: row.roleName ?? row.role ?? undefined,
        avatar: row.avatar ?? undefined,
        isActive: row.isActive,
        isArchived: false,
        language: row.language ?? "en",
        dateFormat: row.dateFormat ?? "DD/MM/YYYY",
        itemsPerPage: row.itemsPerPage ?? 25,
        lastLogin: row.lastLogin?.toISOString(),
        permissions: [],
        locations: [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
    }

    const entry = grouped.get(row.id)!;
    if (row.locationName) {
      entry.locations.push(row.locationName);
    }
  }

  return [...grouped.values()];
}

function paginate<T>(items: T[], params?: QueryParams): PaginatedResult<T> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const start = (page - 1) * limit;
  const filtered = items.slice(start, start + limit);
  return {
    items: filtered,
    total: items.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

async function getUserRowsById(id: string, includeArchived = false) {
  return sql<UserRow[]>`
    SELECT
      u.id,
      u.name,
      u.email,
      u.username,
      u.phone,
      u.role,
      u."roleId",
      r.name AS "roleName",
      COALESCE(r."isSystem", false) AS "isSystem",
      u."isActive",
      u."lastLogin",
      u.language,
      u."dateFormat",
      u."itemsPerPage",
      u.avatar,
      u."createdAt",
      u."updatedAt",
      ul."locationId",
      l."locationName",
      ul."isDefault"
    FROM "User" u
    LEFT JOIN "Role" r ON r.id = u."roleId"
    LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
    LEFT JOIN "Location" l ON l.id = ul."locationId"
    WHERE u.id = ${id}
      AND u."isArchived" = ${includeArchived}
    ORDER BY ul."isDefault" DESC, l."locationName" ASC
  `;
}

async function getRoleInfo(roleId: string | null) {
  if (!roleId) {
    return null;
  }

  const rows = await sql<Array<{ id: string; name: string }>>`
    SELECT id, name
    FROM "Role"
    WHERE id = ${roleId}
      AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function validateLocationIds(locationIds: string[]) {
  if (locationIds.length === 0) {
    return true;
  }

  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "Location"
    WHERE id = ANY(${locationIds}::text[])
      AND "isArchived" = false
      AND "isActive" = true
  `;

  return (rows[0]?.count ?? 0) === locationIds.length;
}

async function getAccessibleLocationIds(id: string) {
  const rows = await sql<Array<{ locationId: string }>>`
    SELECT "locationId"
    FROM "UserLocation"
    WHERE "userId" = ${id}
    ORDER BY "isDefault" DESC, "createdAt" ASC
  `;

  return rows.map((row) => row.locationId);
}

export async function getAll(params?: QueryParams): Promise<PaginatedResult<User>> {
  const rows = await sql<UserRow[]>`
    SELECT
      u.id,
      u.name,
      u.email,
      u.username,
      u.phone,
      u.role,
      u."roleId",
      r.name AS "roleName",
      COALESCE(r."isSystem", false) AS "isSystem",
      u."isActive",
      u."lastLogin",
      u.language,
      u."dateFormat",
      u."itemsPerPage",
      u.avatar,
      u."createdAt",
      u."updatedAt",
      ul."locationId",
      l."locationName",
      ul."isDefault"
    FROM "User" u
    LEFT JOIN "Role" r ON r.id = u."roleId"
    LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
    LEFT JOIN "Location" l ON l.id = ul."locationId"
    WHERE u."isArchived" = false
    ORDER BY u.name ASC, ul."isDefault" DESC, l."locationName" ASC
  `;

  const users = groupUsers(rows);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const filtered = users.filter((user) => {
    if (params?.isActive !== undefined && user.isActive !== params.isActive) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [user.name, user.email, user.username, user.role]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return paginate(filtered, params);
}

export async function getById(id: string): Promise<ServiceResult<User>> {
  const rows = await getUserRowsById(id);
  const user = groupUsers(rows)[0];
  if (!user) {
    return { success: false, error: "User not found" };
  }
  return { success: true, data: user };
}

export async function getByEmail(email: string): Promise<ServiceResult<User>> {
  const normalized = email.trim().toLowerCase();
  const rows = await sql<UserRow[]>`
    SELECT
      u.id,
      u.name,
      u.email,
      u.username,
      u.phone,
      u.role,
      u."roleId",
      r.name AS "roleName",
      COALESCE(r."isSystem", false) AS "isSystem",
      u."isActive",
      u."lastLogin",
      u.language,
      u."dateFormat",
      u."itemsPerPage",
      u.avatar,
      u."createdAt",
      u."updatedAt",
      ul."locationId",
      l."locationName",
      ul."isDefault"
    FROM "User" u
    LEFT JOIN "Role" r ON r.id = u."roleId"
    LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
    LEFT JOIN "Location" l ON l.id = ul."locationId"
    WHERE u."isArchived" = false
      AND LOWER(u.email) = ${normalized}
    ORDER BY ul."isDefault" DESC, l."locationName" ASC
  `;

  const user = groupUsers(rows)[0];
  if (!user) {
    return { success: false, error: "User not found" };
  }
  return { success: true, data: user };
}

export async function create(
  input: CreateUserInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  try {
    const name = normalizeString(input.name);
    const email = normalizeString(input.email)?.toLowerCase() ?? null;
    const username = normalizeString(input.username);
    const password = normalizeString(input.password);
    const role = await getRoleInfo(normalizeString(input.roleId));
    const locationIds = normalizeLocationIds(input.locations ?? []);

    if (!name || !email || !password) {
      return { success: false, error: "Name, email, and password are required" };
    }

    if (locationIds.length > 0 && !(await validateLocationIds(locationIds))) {
      return { success: false, error: "One or more assigned locations are invalid" };
    }

    const existing = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE "isArchived" = false
        AND (
          email = ${email}
          OR (${username}::text IS NOT NULL AND username = ${username})
        )
      LIMIT 1
    `;

    if (existing[0]) {
      return { success: false, error: "A user with the same email or username already exists" };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultLocationId = locationIds[0] ?? null;

    const created = await sql.begin(async (tx) => {
      const rows = await tx<
        Array<{
          id: string;
        }>
      >`
        INSERT INTO "User" (
          name,
          email,
          username,
          password,
          language,
          "dateFormat",
          "itemsPerPage",
          role,
          phone,
          avatar,
          "isActive",
          "isArchived",
          "createdAt",
          "updatedAt",
          "roleId"
        )
        VALUES (
          ${name},
          ${email},
          ${username},
          ${passwordHash},
          ${normalizeString(input.language) ?? "en"},
          ${normalizeString(input.dateFormat) ?? "DD/MM/YYYY"},
          ${Number(input.itemsPerPage ?? 25)},
          ${role?.name ?? "user"},
          ${normalizeString(input.phone)},
          ${normalizeString(input.avatar)},
          ${input.isActive ?? true},
          false,
          NOW(),
          NOW(),
          ${role?.id ?? null}
        )
        RETURNING id
      `;

      const createdId = rows[0]?.id;
      if (!createdId) {
        throw new Error("Failed to create user");
      }

      for (const locationId of locationIds) {
        await tx`
          INSERT INTO "UserLocation" (
            "userId",
            "locationId",
            "assignedUserId",
            "isDefault",
            "createdAt"
          )
          VALUES (
            ${createdId},
            ${locationId},
            ${userId},
            ${locationId === defaultLocationId},
            NOW()
          )
        `;
      }

      return createdId;
    });

    const result = await getById(created);
    if (!result.success || !result.data) {
      return { success: false, error: "Created user could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "USER",
      recordId: result.data.id,
      newValue: {
        name: result.data.name,
        email: result.data.email,
        username: result.data.username,
        roleId: result.data.roleId,
        locations: result.data.locations,
      },
    });

    return { success: true, data: result.data, message: "User created successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

export async function update(
  id: string,
  input: UpdateUserInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  try {
    const existingRows = await sql<
      Array<{
        id: string;
        name: string;
        email: string;
        username: string | null;
        password: string | null;
        phone: string | null;
        roleId: string | null;
        isActive: boolean;
        language: string | null;
        dateFormat: string | null;
        itemsPerPage: number | null;
        avatar: string | null;
      }>
    >`
      SELECT
        id,
        name,
        email,
        username,
        password,
        phone,
        "roleId",
        "isActive",
        language,
        "dateFormat",
        "itemsPerPage",
        avatar
      FROM "User"
      WHERE id = ${id}
        AND "isArchived" = false
      LIMIT 1
    `;

    const existing = existingRows[0];
    if (!existing) {
      return { success: false, error: "User not found" };
    }

    const currentUser = (await getById(id)).data;
    const roleInput = Object.prototype.hasOwnProperty.call(input, "roleId")
      ? normalizeString(input.roleId)
      : existing.roleId;
    const role = await getRoleInfo(roleInput);
    if (roleInput && !role) {
      return { success: false, error: "Selected role was not found" };
    }

    const name = Object.prototype.hasOwnProperty.call(input, "name")
      ? normalizeString(input.name)
      : existing.name;
    const email = Object.prototype.hasOwnProperty.call(input, "email")
      ? normalizeString(input.email)?.toLowerCase() ?? null
      : existing.email;
    const username = Object.prototype.hasOwnProperty.call(input, "username")
      ? normalizeString(input.username)
      : existing.username;

    if (!name || !email) {
      return { success: false, error: "Name and email are required" };
    }

    const duplicate = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE id <> ${id}
        AND "isArchived" = false
        AND (
          email = ${email}
          OR (${username}::text IS NOT NULL AND username = ${username})
        )
      LIMIT 1
    `;

    if (duplicate[0]) {
      return { success: false, error: "A user with the same email or username already exists" };
    }

    const nextLocationIds = Object.prototype.hasOwnProperty.call(input, "locations")
      ? normalizeLocationIds(input.locations ?? [])
      : await getAccessibleLocationIds(id);

    if (nextLocationIds.length > 0 && !(await validateLocationIds(nextLocationIds))) {
      return { success: false, error: "One or more assigned locations are invalid" };
    }

    const password = normalizeString(input.password);
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : existing.password;
    const defaultLocationId = nextLocationIds[0] ?? null;

    await sql.begin(async (tx) => {
      await tx`
        UPDATE "User"
        SET
          name = ${name},
          email = ${email},
          username = ${username},
          password = ${passwordHash},
          language = ${Object.prototype.hasOwnProperty.call(input, "language")
            ? normalizeString(input.language)
            : existing.language},
          "dateFormat" = ${Object.prototype.hasOwnProperty.call(input, "dateFormat")
            ? normalizeString(input.dateFormat)
            : existing.dateFormat},
          "itemsPerPage" = ${Object.prototype.hasOwnProperty.call(input, "itemsPerPage")
            ? Number(input.itemsPerPage ?? 25)
            : existing.itemsPerPage},
          role = ${role?.name ?? null},
          phone = ${Object.prototype.hasOwnProperty.call(input, "phone")
            ? normalizeString(input.phone)
            : existing.phone},
          avatar = ${Object.prototype.hasOwnProperty.call(input, "avatar")
            ? normalizeString(input.avatar)
            : existing.avatar},
          "isActive" = ${Object.prototype.hasOwnProperty.call(input, "isActive")
            ? input.isActive ?? true
            : existing.isActive},
          "updatedAt" = NOW(),
          "roleId" = ${role?.id ?? existing.roleId}
        WHERE id = ${id}
      `;

      if (Object.prototype.hasOwnProperty.call(input, "locations")) {
        await tx`DELETE FROM "UserLocation" WHERE "userId" = ${id}`;

        for (const locationId of nextLocationIds) {
          await tx`
            INSERT INTO "UserLocation" (
              "userId",
              "locationId",
              "assignedUserId",
              "isDefault",
              "createdAt"
            )
            VALUES (
              ${id},
              ${locationId},
              ${userId},
              ${locationId === defaultLocationId},
              NOW()
            )
          `;
        }
      }
    });

    const result = await getById(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Updated user could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "USER",
      recordId: id,
      oldValue: currentUser as unknown as Record<string, unknown>,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "User updated successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user",
    };
  }
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  try {
    const existing = await getById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "User not found" };
    }

    await sql`
      UPDATE "User"
      SET
        "isArchived" = true,
        "isActive" = false,
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
    `;

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.DELETE,
      module: "USER",
      recordId: id,
      oldValue: existing.data as unknown as Record<string, unknown>,
      newValue: { isArchived: true, isActive: false },
    });

    return {
      success: true,
      data: { ...existing.data, isArchived: true, isActive: false },
      message: "User archived successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive user",
    };
  }
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<User>> {
  try {
    const rows = await sql`
      UPDATE "User"
      SET
        "isArchived" = false,
        "isActive" = true,
        "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = true
      RETURNING id
    `;

    if (!rows[0]?.id) {
      return { success: false, error: "User not found" };
    }

    const result = await getById(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Restored user could not be loaded" };
    }

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "USER",
      recordId: id,
      newValue: result.data as unknown as Record<string, unknown>,
    });

    return { success: true, data: result.data, message: "User restored successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore user",
    };
  }
}

export async function search(query: string): Promise<ServiceResult<User[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}
