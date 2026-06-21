import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await sql<
      Array<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, code, name, description, "isActive"
      FROM "ItemType"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Item type not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive,
    });
  } catch (error) {
    console.error("Failed to load item type", error);
    return NextResponse.json({ error: "Failed to load item type" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? "").trim();
    if (!name || !code) {
      return NextResponse.json(
        { error: "Item type name and code are required" },
        { status: 400 },
      );
    }

    const rows = await sql<Array<{ id: string }>>`
      UPDATE "ItemType"
      SET
        code = ${code},
        name = ${name},
        description = ${body.description?.trim() || null},
        "isActive" = ${body.isActive ?? true},
        "updatedAt" = NOW()
      WHERE id = ${id} AND "isArchived" = false
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Item type not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Failed to update item type", error);
    return NextResponse.json({ error: "Failed to update item type" }, { status: 500 });
  }
}
