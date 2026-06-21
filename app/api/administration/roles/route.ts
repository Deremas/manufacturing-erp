import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

function splitPermissionKey(value: string): { module: string; action: string } {
  const [module, action] = value.split(".");
  return { module: module?.trim() ?? "", action: action?.trim() ?? "" };
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
        Array<{ id: string }>
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
        RETURNING id
      `;

      const roleId = roleRows[0]?.id;
      if (!roleId) return null;

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

    return NextResponse.json({ success: true, id: created });
  } catch (error) {
    console.error("Failed to create role", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
