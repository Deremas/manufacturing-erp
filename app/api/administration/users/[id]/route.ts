import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";

function isAdminRole(role?: string | null) {
  const normalized = String(role ?? "").trim().toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "super admin" ||
    normalized === "superadmin" ||
    normalized === "system administrator"
  );
}

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

function normalizePermissionOverrides(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0 && entry.startsWith("sales.")),
    ),
  ).sort();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rows = await sql<
    Array<{
      id: string;
      name: string;
      email: string;
      username: string | null;
      phone: string | null;
      roleId: string | null;
      roleName: string | null;
      roleLabel: string | null;
      isActive: boolean;
      isSystem: boolean;
      salesAllowPermissions: string[] | null;
      salesDenyPermissions: string[] | null;
      lastLogin: Date | null;
      createdAt: Date;
      updatedAt: Date;
      locationId: string | null;
      locationCode: string | null;
      locationName: string | null;
      isDefault: boolean | null;
    }>
  >`
    SELECT
      u.id,
      u.name,
      u.email,
      u.username,
      u.phone,
      u."roleId",
      r.name AS "roleName",
      u.role AS "roleLabel",
      COALESCE(r."isSystem", false) AS "isSystem",
      u."isActive",
      u."salesAllowPermissions",
      u."salesDenyPermissions",
      u."lastLogin",
      u."createdAt",
      u."updatedAt",
      ul."locationId",
      l."locationCode",
      l."locationName",
      ul."isDefault"
    FROM "User" u
    LEFT JOIN "Role" r ON r.id = u."roleId"
    LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
    LEFT JOIN "Location" l ON l.id = ul."locationId"
    WHERE u.id = ${id}
      AND u."isArchived" = false
    ORDER BY ul."isDefault" DESC, l."locationName" ASC
  `;

  const firstRow = rows[0];
  if (!firstRow) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const locations = rows
    .filter((row) => row.locationId && row.locationCode && row.locationName)
    .map((row) => ({
      id: row.locationId as string,
      code: row.locationCode as string,
      name: row.locationName as string,
      isDefault: Boolean(row.isDefault),
    }));

  return NextResponse.json({
    item: {
      id: firstRow.id,
      name: firstRow.name,
      email: firstRow.email,
      username: firstRow.username,
      phone: firstRow.phone,
      roleId: firstRow.roleId,
      role: firstRow.roleName ?? firstRow.roleLabel,
      isActive: firstRow.isActive,
      isSystem: firstRow.isSystem,
      salesAllowPermissions: firstRow.salesAllowPermissions ?? [],
      salesDenyPermissions: firstRow.salesDenyPermissions ?? [],
      defaultLocationId: locations.find((location) => location.isDefault)?.id ?? null,
      accessibleLocationIds: locations.map((location) => location.id),
      locations,
      lastLogin: firstRow.lastLogin?.toISOString() ?? null,
      createdAt: firstRow.createdAt.toISOString(),
      updatedAt: firstRow.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminRole(currentUser.role)) {
    return NextResponse.json(
      { error: "Only administrators can manage users" },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const existingRows = await sql<
      Array<{
        id: string;
      name: string;
      email: string;
      username: string | null;
      phone: string | null;
      password: string | null;
      roleId: string | null;
      isActive: boolean;
      salesAllowPermissions: string[] | null;
      salesDenyPermissions: string[] | null;
      locationId: string | null;
      isDefault: boolean | null;
    }>
    >`
      SELECT
        u.id,
        u.name,
        u.email,
        u.username,
        u.phone,
        u.password,
        u."roleId",
        u."isActive",
        u."salesAllowPermissions",
        u."salesDenyPermissions",
        ul."locationId",
        ul."isDefault"
      FROM "User" u
      LEFT JOIN "UserLocation" ul ON ul."userId" = u.id
      WHERE u.id = ${id}
        AND u."isArchived" = false
      ORDER BY ul."isDefault" DESC, ul."createdAt" ASC
    `;
    const existingUser = existingRows[0];

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const existingLocationIds = existingRows
      .map((row) => row.locationId)
      .filter((value): value is string => Boolean(value));
    const existingDefaultLocationId =
      existingRows.find((row) => row.isDefault && row.locationId)?.locationId ?? null;
    const existingDepartmentRows = await sql<Array<{ departmentId: string }>>`SELECT "departmentId" FROM "UserDepartment" WHERE "userId" = ${id}`;
    const existingDepartmentIds = existingDepartmentRows.map((row) => row.departmentId);

    const roleIdProvided = Object.prototype.hasOwnProperty.call(body, "roleId");
    const roleId = roleIdProvided ? normalizeString(body.roleId) : existingUser.roleId;
    const roleRows = roleId
      ? await sql<Array<{ id: string; name: string }>>`
          SELECT id, name
          FROM "Role"
          WHERE id = ${roleId}
            AND "isArchived" = false
          LIMIT 1
        `
      : [];
    const role = roleRows[0] ?? null;

    if (roleIdProvided && roleId && !role) {
      return NextResponse.json({ error: "Selected role was not found." }, { status: 400 });
    }

    const name =
      Object.prototype.hasOwnProperty.call(body, "name")
        ? normalizeString(body.name)
        : existingUser.name;
    const email =
      Object.prototype.hasOwnProperty.call(body, "email")
        ? normalizeString(body.email)?.toLowerCase() ?? null
        : existingUser.email;
    const username =
      Object.prototype.hasOwnProperty.call(body, "username")
        ? normalizeString(body.username)
        : existingUser.username;
    const phone =
      Object.prototype.hasOwnProperty.call(body, "phone")
        ? normalizeString(body.phone)
        : existingUser.phone;
    const password = normalizeString(body.password);
    const isActive =
      Object.prototype.hasOwnProperty.call(body, "isActive")
        ? body.isActive === true
        : existingUser.isActive;
    const defaultLocationId = Object.prototype.hasOwnProperty.call(body, "defaultLocationId")
      ? normalizeString(body.defaultLocationId)
      : existingDefaultLocationId;
    const accessibleLocationIds = Object.prototype.hasOwnProperty.call(
      body,
      "accessibleLocationIds",
    )
      ? normalizeLocationIds(body.accessibleLocationIds)
      : existingLocationIds;
    const accessibleDepartmentIds = Object.prototype.hasOwnProperty.call(body, "accessibleDepartmentIds")
      ? normalizeLocationIds(body.accessibleDepartmentIds)
      : existingDepartmentIds;
    const salesAllowPermissions = Object.prototype.hasOwnProperty.call(body, "salesAllowPermissions")
      ? normalizePermissionOverrides(body.salesAllowPermissions)
      : existingUser.salesAllowPermissions ?? [];
    const salesDenyPermissions = Object.prototype.hasOwnProperty.call(body, "salesDenyPermissions")
      ? normalizePermissionOverrides(body.salesDenyPermissions)
      : existingUser.salesDenyPermissions ?? [];

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 },
      );
    }

    const locationIds = defaultLocationId
      ? Array.from(new Set([...accessibleLocationIds, defaultLocationId]))
      : accessibleLocationIds;

    if (locationIds.length > 0) {
      const locationCountRows = await sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "Location"
        WHERE id = ANY(${locationIds}::text[])
          AND "isArchived" = false
          AND "isActive" = true
      `;
      const locationCount = locationCountRows[0]?.count ?? 0;

      if (locationCount !== locationIds.length) {
        return NextResponse.json(
          { error: "One or more selected locations were not found." },
          { status: 400 },
        );
      }
    }
    if (accessibleDepartmentIds.length > 0) {
      const rows = await sql<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "Department" WHERE id = ANY(${accessibleDepartmentIds}::text[]) AND "isArchived" = false AND "isActive" = true`;
      if ((rows[0]?.count ?? 0) !== accessibleDepartmentIds.length) return NextResponse.json({ error: "One or more selected departments were not found." }, { status: 400 });
    }

    const duplicate = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE id <> ${id}
        AND "isArchived" = false
        AND (
          email = ${email}
          OR (${username ?? null}::text IS NOT NULL AND username = ${username ?? null})
        )
      LIMIT 1
    `;

    if (duplicate[0]) {
      return NextResponse.json(
        { error: "A user with the same email or username already exists." },
        { status: 409 },
      );
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    const updated = await sql.begin(async (tx) => {
      const userRows = await tx<
        Array<{
          id: string;
          name: string;
          email: string;
          username: string | null;
          roleId: string | null;
          isActive: boolean;
        }>
      >`
        UPDATE "User"
        SET
          name = ${name},
          email = ${email},
          username = ${username},
          phone = ${phone},
          "isActive" = ${isActive},
          "salesAllowPermissions" = ${salesAllowPermissions},
          "salesDenyPermissions" = ${salesDenyPermissions},
          "roleId" = ${role?.id ?? roleId},
          role = ${role?.name ?? null},
          password = ${passwordHash ?? existingUser.password ?? null},
          "updatedAt" = NOW()
        WHERE id = ${id}
        RETURNING id, name, email, username, "roleId", "isActive"
      `;

      const user = userRows[0];
      if (!user) {
        throw new Error("Failed to update user.");
      }

      if (Object.prototype.hasOwnProperty.call(body, "accessibleLocationIds")) {
        await tx`DELETE FROM "UserLocation" WHERE "userId" = ${id}`;

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
              ${id},
              ${locationId},
              ${currentUser.id},
              ${locationId === defaultLocationId},
              NOW()
            )
          `;
        }
      }
      if (Object.prototype.hasOwnProperty.call(body, "accessibleDepartmentIds")) {
        await tx`DELETE FROM "UserDepartment" WHERE "userId" = ${id}`;
        for (const departmentId of accessibleDepartmentIds) {
          await tx`INSERT INTO "UserDepartment" (id, "userId", "departmentId", "isDefault", "createdAt") VALUES (${crypto.randomUUID()}, ${id}, ${departmentId}, false, NOW())`;
        }
      }

      return user;
    });

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: AuditAction.UPDATE,
      module: "USER",
      recordId: updated.id,
      oldValue: {
        name: existingUser.name,
        email: existingUser.email,
        username: existingUser.username,
        roleId: existingUser.roleId,
        isActive: existingUser.isActive,
        defaultLocationId: existingDefaultLocationId,
        accessibleLocationIds: existingLocationIds,
        accessibleDepartmentIds: existingDepartmentIds,
        salesAllowPermissions: existingUser.salesAllowPermissions ?? [],
        salesDenyPermissions: existingUser.salesDenyPermissions ?? [],
      },
      newValue: {
        name: updated.name,
        email: updated.email,
        username: updated.username,
        roleId: updated.roleId,
        isActive: updated.isActive,
        defaultLocationId,
        accessibleLocationIds: locationIds,
        accessibleDepartmentIds,
        salesAllowPermissions,
        salesDenyPermissions,
      },
    });

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update user.",
      },
      { status: 500 },
    );
  }
}
