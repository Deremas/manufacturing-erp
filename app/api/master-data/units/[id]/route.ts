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
        code: string | null;
        name: string;
        abbreviation: string;
        type: string | null;
        decimalPrecision: number | null;
        isActive: boolean;
      }>
    >`
      SELECT id, code, name, abbreviation, type, "decimalPrecision", "isActive"
      FROM "Unit"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      code: row.code ?? "",
      name: row.name,
      abbreviation: row.abbreviation,
      type: row.type ?? "",
      decimalPrecision: row.decimalPrecision ?? 0,
      isActive: row.isActive,
    });
  } catch (error) {
    console.error("Failed to load unit", error);
    return NextResponse.json({ error: "Failed to load unit" }, { status: 500 });
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
    const abbreviation = String(body.abbreviation ?? "").trim();
    if (!name || !abbreviation) {
      return NextResponse.json(
        { error: "Unit name and abbreviation are required" },
        { status: 400 },
      );
    }

    const rows = await sql<Array<{ id: string }>>`
      UPDATE "Unit"
      SET
        code = ${body.code?.trim() || null},
        name = ${name},
        abbreviation = ${abbreviation},
        type = ${body.type?.trim() || null},
        "decimalPrecision" = ${Number(body.decimalPrecision ?? 0)},
        "isActive" = ${body.isActive ?? true},
        "updatedAt" = NOW()
      WHERE id = ${id} AND "isArchived" = false
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Failed to update unit", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}
