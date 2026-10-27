import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import type { Location, Role, User } from "@/features/administration/types";

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: Array<{
    id: string;
    module: string;
    action: string;
    label: string;
  }>;
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildEffectivePermissions(input: {
  isSystem: boolean;
  rolePermissions: string[];
  allowPermissions: string[];
  denyPermissions: string[];
}) {
  if (input.isSystem) {
    return ["*"];
  }

  const denied = new Set(input.denyPermissions);
  return Array.from(
    new Set([...input.rolePermissions, ...input.allowPermissions]),
  )
    .filter((permission) => !denied.has(permission))
    .sort();
}

export async function getRoles(): Promise<Role[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        publicId: number;
        name: string;
        description: string | null;
        isSystem: boolean;
        isActive: boolean;
        permissionsCount: number;
        usersCount: number;
      }>
    >`
      SELECT
        r.id,
        r."publicId",
        r.name,
        r.description,
        r."isSystem",
        r."isActive",
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

    return rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      description: row.description ?? "",
      isSystem: row.isSystem,
      permissions: [],
      isActive: row.isActive,
      permissionsCount: row.permissionsCount,
      usersCount: row.usersCount,
    }));
  } catch {
    return [];
  }
}

export async function getRoleById(key: string): Promise<Role | null> {
  try {
    const roleRows = await sql<
      Array<{
        id: string;
        publicId: number;
        name: string;
        description: string | null;
        isSystem: boolean;
        isActive: boolean;
        permissionsCount: number;
        usersCount: number;
      }>
    >`
      SELECT
        r.id,
        r."publicId",
        r.name,
        r.description,
        r."isSystem",
        r."isActive",
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
      WHERE ${isPublicIdParam(key) ? sql`r."publicId" = ${Number(key)}` : sql`r.id = ${key}`}
        AND r."isArchived" = false
      LIMIT 1
    `;

    const role = roleRows[0];
    if (!role) return null;

    const permissionRows = await sql<
      Array<{
        permissionId: string;
        module: string;
        action: string;
      }>
    >`
      SELECT
        rp.permission AS "permissionId",
        rp.module,
        rp.action
      FROM "RolePermission" rp
      WHERE rp."roleId" = ${role.id} AND rp."isArchived" = false
      ORDER BY rp.module ASC, rp.action ASC
    `;

    const userRows = await sql<
      Array<{
        id: string;
        name: string;
        email: string | null;
      }>
    >`
      SELECT id, name, email
      FROM "User"
      WHERE "roleId" = ${role.id} AND "isArchived" = false
      ORDER BY name ASC
    `;

    return {
      id: role.id,
      publicId: role.publicId,
      name: role.name,
      description: role.description ?? "",
      isSystem: role.isSystem,
      permissions: permissionRows.map((row) => `${row.module}.${row.action}`),
      isActive: role.isActive,
      permissionsCount: role.permissionsCount,
      usersCount: role.usersCount,
      users: userRows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email ?? undefined,
      })),
    };
  } catch {
    return null;
  }
}

export async function getPermissionGroups(): Promise<PermissionGroup[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        module: string;
        action: string;
        label: string | null;
      }>
    >`
      SELECT id, module, action, label
      FROM "Permission"
      WHERE "isArchived" = false
      ORDER BY module ASC, action ASC
    `;

    const groups = new Map<string, PermissionGroup>();
    for (const row of rows) {
      if (!groups.has(row.module)) {
        groups.set(row.module, {
          module: row.module,
          label: titleCase(row.module),
          permissions: [],
        });
      }
      groups.get(row.module)?.permissions.push({
        id: row.id,
        module: row.module,
        action: row.action,
        label:
          row.label ?? `${titleCase(row.module)} ${titleCase(row.action)}`,
      });
    }

    return [...groups.values()];
  } catch {
    return [];
  }
}

export async function getLocations(): Promise<Location[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        locationCode: string;
        locationName: string;
        locationType: string;
        address: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "locationCode", "locationName", "locationType", address, "isActive"
      FROM "Location"
      WHERE "isArchived" = false
      ORDER BY "locationName" ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      locationCode: row.locationCode,
      locationName: row.locationName,
      locationType: row.locationType,
      address: row.address ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        publicId: number;
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
        salesAllowPermissions: string[] | null;
        salesDenyPermissions: string[] | null;
        permissionsCount: number;
        locationsCount: number;
      }>
    >`
      SELECT
        u.id,
        u."publicId",
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
        u."salesAllowPermissions",
        u."salesDenyPermissions",
        COALESCE((
          SELECT COUNT(*)
          FROM "RolePermission" rp
          WHERE rp."roleId" = u."roleId" AND rp."isArchived" = false
        ), 0)::int AS "permissionsCount",
        COALESCE((
          SELECT COUNT(*)
          FROM "UserLocation" ul
          WHERE ul."userId" = u.id
        ), 0)::int AS "locationsCount"
      FROM "User" u
      LEFT JOIN "Role" r ON r.id = u."roleId"
      WHERE u."isArchived" = false
      ORDER BY u.name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      email: row.email,
      username: row.username ?? undefined,
      phone: row.phone ?? "",
      role: row.roleName ?? row.role ?? "",
      roleId: row.roleId ?? undefined,
      avatar: undefined,
      isActive: row.isActive,
      isSystem: row.isSystem,
      lastLogin: row.lastLogin?.toISOString(),
      permissions: [],
      salesAllowPermissions: row.salesAllowPermissions ?? [],
      salesDenyPermissions: row.salesDenyPermissions ?? [],
      locations: [],
      createdAt: row.lastLogin?.toISOString() ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getUserById(key: string): Promise<User | null> {
  try {
    const userRows = await sql<
      Array<{
        id: string;
        publicId: number;
        name: string;
        email: string;
        username: string | null;
        phone: string | null;
        role: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        roleId: string | null;
        isSystem: boolean;
        salesAllowPermissions: string[] | null;
        salesDenyPermissions: string[] | null;
      }>
    >`
      SELECT
        u.id,
        u."publicId",
        u.name,
        u.email,
        u.username,
        u.phone,
        u.role,
        u."roleId",
        COALESCE(r."isSystem", false) AS "isSystem",
        u."isActive",
        u."lastLogin",
        u."salesAllowPermissions",
        u."salesDenyPermissions"
      FROM "User" u
      LEFT JOIN "Role" r ON r.id = u."roleId"
      WHERE ${isPublicIdParam(key) ? sql`u."publicId" = ${Number(key)}` : sql`u.id = ${key}`}
        AND u."isArchived" = false
      LIMIT 1
    `;

    const user = userRows[0];
    if (!user) return null;

    const roleNameRows = user.roleId
      ? await sql<Array<{ name: string }>>`
          SELECT "name"
          FROM "Role"
          WHERE "id" = ${user.roleId}
          LIMIT 1
        `
      : [];

    const rolePermissionRows = user.roleId
      ? await sql<Array<{ module: string; action: string }>>`
          SELECT rp.module, rp.action
          FROM "RolePermission" rp
          WHERE rp."roleId" = ${user.roleId} AND rp."isArchived" = false
          ORDER BY rp.module ASC, rp.action ASC
        `
      : [];

    const locationRows = await sql<Array<{ locationName: string }>>`
      SELECT l."locationName"
      FROM "UserLocation" ul
      INNER JOIN "Location" l ON l.id = ul."locationId"
      WHERE ul."userId" = ${user.id}
      ORDER BY l."locationName" ASC
    `;

    const defaultLocationRows = await sql<Array<{ locationId: string }>>`
      SELECT "locationId"
      FROM "UserLocation"
      WHERE "userId" = ${user.id} AND "isDefault" = true
      LIMIT 1
    `;

    const accessibleLocationRows = await sql<Array<{ locationId: string }>>`
      SELECT "locationId"
      FROM "UserLocation"
      WHERE "userId" = ${user.id}
      ORDER BY "isDefault" DESC, "createdAt" ASC
    `;

    return {
      id: user.id,
      publicId: user.publicId,
      name: user.name,
      email: user.email,
      username: user.username ?? undefined,
      phone: user.phone ?? "",
      role: roleNameRows[0]?.name ?? user.role ?? "",
      roleId: user.roleId ?? undefined,
      avatar: undefined,
      isActive: user.isActive,
      isSystem: user.isSystem,
      lastLogin: user.lastLogin?.toISOString(),
      permissions: buildEffectivePermissions({
        isSystem: user.isSystem,
        rolePermissions: rolePermissionRows.map((row) => `${row.module}.${row.action}`),
        allowPermissions: user.salesAllowPermissions ?? [],
        denyPermissions: user.salesDenyPermissions ?? [],
      }),
      salesAllowPermissions: user.salesAllowPermissions ?? [],
      salesDenyPermissions: user.salesDenyPermissions ?? [],
      locations: locationRows.map((row) => row.locationName),
      defaultLocationId: defaultLocationRows[0]?.locationId,
      accessibleLocationIds: accessibleLocationRows.map((row) => row.locationId),
      createdAt: user.lastLogin?.toISOString() ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getAuditLogs(): Promise<
  Array<{
    id: string;
    dateTime: string;
    user: string;
    module: string;
    action: string;
    entity: string;
    description: string;
    ipAddress: string;
    oldValue?: string;
    newValue?: string;
    userAgent?: string;
  }>
> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        timestamp: Date;
        userName: string;
        module: string;
        action: string;
        recordId: string | null;
        oldValue: string | null;
        newValue: string | null;
        ipAddress: string | null;
        userAgent: string | null;
      }>
    >`
      SELECT
        al.id,
        al.timestamp,
        u.name AS "userName",
        al.module,
        al.action,
        al."recordId",
        al."oldValue",
        al."newValue",
        al."ipAddress",
        al."userAgent"
      FROM "AuditLog" al
      INNER JOIN "User" u ON u.id = al."userId"
      WHERE al."isArchived" = false
      ORDER BY al.timestamp DESC
      LIMIT 200
    `;

    return rows.map((row) => ({
      id: row.id,
      dateTime: row.timestamp.toISOString(),
      user: row.userName,
      module: row.module,
      action: row.action,
      entity: row.recordId ?? "Record",
      description: row.action,
      ipAddress: row.ipAddress ?? "",
      oldValue: row.oldValue ?? undefined,
      newValue: row.newValue ?? undefined,
      userAgent: row.userAgent ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function getDocumentNumberings(): Promise<
  Array<{
    id: string;
    module: string;
    documentType: string;
    prefix: string;
    currentNumber: number;
    padding: number;
    resetRule: string;
    includeYear: boolean;
    includeMonth: boolean;
    includeLocation: boolean;
    preview: string;
    isActive: boolean;
  }>
> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        prefix: string;
        description: string | null;
        prefixFormat: string;
        separator: string;
        yearFormat: string;
        monthFormat: string;
        dayFormat: string;
        sequenceLength: number;
        currentSequence: number;
        isActive: boolean;
      }>
    >`
      SELECT
        id,
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive"
      FROM "DocumentNumbering"
      WHERE "isArchived" = false
      ORDER BY prefix ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      module: "General",
      documentType: row.description ?? row.prefix,
      prefix: row.prefix,
      currentNumber: row.currentSequence,
      padding: row.sequenceLength,
      resetRule: row.prefixFormat,
      includeYear: row.yearFormat !== "",
      includeMonth: row.monthFormat !== "",
      includeLocation: row.dayFormat !== "",
      preview: `${row.prefix}-${String(row.currentSequence).padStart(row.sequenceLength, "0")}`,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}
