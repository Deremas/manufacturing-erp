import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
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
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        code: row.code ?? "",
        name: row.name,
        abbreviation: row.abbreviation,
        type: row.type ?? "",
        decimalPrecision: row.decimalPrecision ?? 0,
        isActive: row.isActive,
      })),
    );
  } catch (error) {
    console.error("Failed to load units", error);
    return NextResponse.json({ error: "Failed to load units" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      INSERT INTO "Unit" (
        "code",
        "name",
        "abbreviation",
        "type",
        "decimalPrecision",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${body.code?.trim() || null},
        ${name},
        ${abbreviation},
        ${body.type?.trim() || null},
        ${Number(body.decimalPrecision ?? 0)},
        ${body.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: rows[0]?.id });
  } catch (error) {
    console.error("Failed to create unit", error);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}
