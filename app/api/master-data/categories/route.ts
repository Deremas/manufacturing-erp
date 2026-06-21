import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql<
      Array<{
        id: string;
        code: string | null;
        name: string;
        parentCategoryId: string | null;
        parentCategoryName: string | null;
        description: string | null;
        displayOrder: number | null;
        isActive: boolean;
      }>
    >`
      SELECT
        c.id,
        c.code,
        c.name,
        c."parentCategoryId",
        p.name AS "parentCategoryName",
        c.description,
        c."displayOrder",
        c."isActive"
      FROM "Category" c
      LEFT JOIN "Category" p ON p.id = c."parentCategoryId"
      WHERE c."isArchived" = false
      ORDER BY c.name ASC
    `;

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        code: row.code ?? "",
        name: row.name,
        parentCategoryId: row.parentCategoryId ?? "",
        parentCategoryName: row.parentCategoryName ?? "",
        description: row.description ?? "",
        displayOrder: row.displayOrder ?? 0,
        isActive: row.isActive,
      })),
    );
  } catch (error) {
    console.error("Failed to load categories", error);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const rows = await sql<
      Array<{
        id: string;
      }>
    >`
      INSERT INTO "Category" (
        "code",
        "name",
        "parentCategoryId",
        "description",
        "displayOrder",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${body.code?.trim() || null},
        ${name},
        ${body.parentCategoryId?.trim() || null},
        ${body.description?.trim() || null},
        ${Number(body.displayOrder ?? 0)},
        ${body.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: rows[0]?.id });
  } catch (error) {
    console.error("Failed to create category", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
