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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await sql<
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
    WHERE u."isArchived" = false
    ORDER BY u.name ASC, ul."isDefault" DESC, l."locationName" ASC
  `;

  const grouped = new Map<string, {
    id: string;
    name: string;
    email: string;
    username: string | null;
    phone: string | null;
    roleId: string | null;
    role: string | null;
    isActive: boolean;
    isSystem: boolean;
    lastLogin: string | null;
    createdAt: string;
    updatedAt: string;
    defaultLocationId: string | null;
    accessibleLocationIds: string[];
    locations: Array<{ id: string; code: string; name: string; isDefault: boolean }>;
    salesAllowPermissions: string[];
    salesDenyPermissions: string[];
  }>();

  for (const row of items) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username,
        phone: row.phone,
        roleId: row.roleId,
        role: row.roleName ?? row.roleLabel,
        isActive: row.isActive,
        isSystem: row.isSystem,
        salesAllowPermissions: row.salesAllowPermissions ?? [],
        salesDenyPermissions: row.salesDenyPermissions ?? [],
        lastLogin: row.lastLogin?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        defaultLocationId: null,
        accessibleLocationIds: [],
        locations: [],
      });
    }

    const entry = grouped.get(row.id)!;
    if (row.locationId && row.locationCode && row.locationName) {
      entry.accessibleLocationIds.push(row.locationId);
      entry.locations.push({
        id: row.locationId,
        code: row.locationCode,
        name: row.locationName,
        isDefault: Boolean(row.isDefault),
      });
      if (row.isDefault) {
        entry.defaultLocationId = row.locationId;
      }
    }
  }

  return NextResponse.json({
    items: Array.from(grouped.values()),
  });
}

export async function POST(request: Request) {
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
    const body = (await request.json()) as Record<string, unknown>;
    const name = normalizeString(body.name);
    const email = normalizeString(body.email)?.toLowerCase() ?? null;
    const username = normalizeString(body.username);
    const phone = normalizeString(body.phone);
    const password = normalizeString(body.password);
    const roleId = normalizeString(body.roleId);
    const defaultLocationId = normalizeString(body.defaultLocationId);
    const accessibleLocationIds = normalizeLocationIds(body.accessibleLocationIds);
    const accessibleDepartmentIds = normalizeLocationIds(body.accessibleDepartmentIds);
    const salesAllowPermissions = normalizePermissionOverrides(body.salesAllowPermissions);
    const salesDenyPermissions = normalizePermissionOverrides(body.salesDenyPermissions);
    const isActive = body.isActive !== false;

    if (!name || !email || !roleId || !password) {
      return NextResponse.json(
        { error: "Name, email, role, and password are required." },
        { status: 400 },
      );
    }

    const roleRows = await sql<Array<{ id: string; name: string }>>`
      SELECT id, name
      FROM "Role"
      WHERE id = ${roleId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `;
    const role = roleRows[0];

    if (!role) {
      return NextResponse.json({ error: "Selected role was not found." }, { status: 400 });
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

    const existing = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE "isArchived" = false
        AND (
          email = ${email}
          OR (${username ?? null}::text IS NOT NULL AND username = ${username ?? null})
        )
      LIMIT 1
    `;

    if (existing[0]) {
      return NextResponse.json(
        { error: "A user with the same email or username already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await sql.begin(async (tx) => {
      const userRows = await tx<
        Array<{
          id: string;
          name: string;
          email: string;
          username: string | null;
          roleId: string | null;
          isActive: boolean;
          publicId: number;
        }>
      >`
        INSERT INTO "User" (
          name,
          email,
          username,
          phone,
          password,
          "roleId",
          role,
          "isActive",
          "salesAllowPermissions",
          "salesDenyPermissions",
          "isArchived",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${name},
          ${email},
          ${username},
          ${phone},
          ${passwordHash},
          ${role.id},
          ${role.name},
          ${isActive},
          ${salesAllowPermissions},
          ${salesDenyPermissions},
          false,
          NOW(),
          NOW()
        )
        RETURNING id, name, email, username, "roleId", "isActive", "publicId"
      `;

      const user = userRows[0];
      if (!user) {
        throw new Error("Failed to create user.");
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
            ${user.id},
            ${locationId},
            ${currentUser.id},
            ${locationId === defaultLocationId},
            NOW()
          )
        `;
      }
      for (const departmentId of accessibleDepartmentIds) {
        await tx`INSERT INTO "UserDepartment" (id, "userId", "departmentId", "isDefault", "createdAt") VALUES (${crypto.randomUUID()}, ${user.id}, ${departmentId}, false, NOW())`;
      }

      return user;
    });

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: AuditAction.CREATE,
      module: "USER",
      recordId: created.id,
      newValue: {
        name: created.name,
        email: created.email,
        username: created.username,
        roleId: created.roleId,
        isActive: created.isActive,
        defaultLocationId,
        accessibleLocationIds: locationIds,
        accessibleDepartmentIds,
        salesAllowPermissions,
        salesDenyPermissions,
      },
    });

    return NextResponse.json({ id: created.id, publicId: created.publicId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create user.",
      },
      { status: 500 },
    );
  }
}
