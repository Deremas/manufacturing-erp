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
    .filter((item): item is { id: string; module: string; action: string } =>
      Boolean(item.id),
    );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const updated = await sql.begin(async (tx) => {
      const roleCheck = await tx<Array<{ isSystem: boolean }>>`
        SELECT "isSystem"
        FROM "Role"
        WHERE id = ${id} AND "isArchived" = false
        LIMIT 1
      `;
      const isSystem = roleCheck[0]?.isSystem ?? false;

      const roleRows = await tx<
        Array<{ id: string }>
      >`
        UPDATE "Role"
        SET
          "name" = ${name},
          "description" = ${body.description?.trim() || null},
          "isActive" = ${isSystem ? true : body.isActive ?? true},
          "updatedAt" = NOW()
        WHERE id = ${id} AND "isArchived" = false
        RETURNING id
      `;

      if (!roleRows[0]?.id) return null;

      await tx`
        DELETE FROM "RolePermission"
        WHERE "roleId" = ${id}
      `;

      const permissionSource = isSystem
        ? await tx<Array<{ id: string; module: string; action: string }>>`
            SELECT id, module, action
            FROM "Permission"
            WHERE "isArchived" = false
          `
        : await resolvePermissionIds(
            Array.isArray(body.permissions) ? body.permissions : [],
          );

      for (const permission of permissionSource) {
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

      return id;
    });

    if (!updated) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: updated });
  } catch (error) {
    console.error("Failed to update role", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await sql.begin(async (tx) => {
      const roleRows = await tx<Array<{ isSystem: boolean }>>`
        SELECT "isSystem"
        FROM "Role"
        WHERE id = ${id} AND "isArchived" = false
        LIMIT 1
      `;

      const role = roleRows[0];
      if (!role) return null;
      if (role.isSystem) {
        return "forbidden";
      }

      await tx`
        UPDATE "Role"
        SET "isArchived" = true, "updatedAt" = NOW()
        WHERE id = ${id}
      `;

      await tx`
        UPDATE "RolePermission"
        SET "isArchived" = true
        WHERE "roleId" = ${id}
      `;

      return id;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (deleted === "forbidden") {
      return NextResponse.json(
        { error: "System roles cannot be deleted" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, id: deleted });
  } catch (error) {
    console.error("Failed to delete role", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 },
    );
  }
}
