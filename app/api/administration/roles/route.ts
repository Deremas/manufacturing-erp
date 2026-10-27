import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";

function splitPermissionKey(value: string): { module: string; action: string } {
  const [module, ...actionParts] = value.split(".");
  return { module: module?.trim() ?? "", action: actionParts.join(".").trim() ?? "" };
}

async function resolvePermissionIds(permissionKeys: string[]) {
  if (permissionKeys.length === 0) return [];
  const normalized = permissionKeys
    .map((value) => splitPermissionKey(value))
    .filter((item) => item.module && item.action);

  const rows = await sql<
    Array<{ id: string; module: string; action: string }>
  >`
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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkPermission(user, "administration.role.create")) return NextResponse.json({ error: "Forbidden: missing permission administration.role.create" }, { status: 403 });
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    const resolvedPermissions = await resolvePermissionIds(
      permissions.map((value: string) => String(value)),
    );

    const created = await sql.begin(async (tx) => {
      const roleRows = await tx<
        Array<{ id: string; publicId: number }>
      >`
        INSERT INTO "Role" (
          "name",
          "description",
          "isSystem",
          "isActive",
          "isArchived",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${name},
          ${body.description?.trim() || null},
          false,
          ${body.isActive ?? true},
          false,
          NOW(),
          NOW()
        )
        RETURNING id, "publicId"
      `;

      const createdRole = roleRows[0];
      if (!createdRole) return null;

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
            ${createdRole.id},
            ${permission.id},
            ${permission.module},
            ${permission.action},
            false
          )
        `;
      }

      return createdRole;
    });

    if (!created) {
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: created.id, publicId: created.publicId });
  } catch (error) {
    console.error("Failed to create role", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
