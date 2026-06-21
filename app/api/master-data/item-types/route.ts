import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
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
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description ?? "",
        isActive: row.isActive,
      })),
    );
  } catch (error) {
    console.error("Failed to load item types", error);
    return NextResponse.json({ error: "Failed to load item types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      INSERT INTO "ItemType" (
        code,
        name,
        description,
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${code},
        ${name},
        ${body.description?.trim() || null},
        ${body.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: rows[0]?.id });
  } catch (error) {
    console.error("Failed to create item type", error);
    return NextResponse.json({ error: "Failed to create item type" }, { status: 500 });
  }
}
