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
      WHERE c.id = ${id} AND c."isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      code: row.code ?? "",
      name: row.name,
      parentCategoryId: row.parentCategoryId ?? "",
      parentCategoryName: row.parentCategoryName ?? "",
      description: row.description ?? "",
      displayOrder: row.displayOrder ?? 0,
      isActive: row.isActive,
    });
  } catch (error) {
    console.error("Failed to load category", error);
    return NextResponse.json({ error: "Failed to load category" }, { status: 500 });
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
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const rows = await sql<
      Array<{
        id: string;
      }>
    >`
      UPDATE "Category"
      SET
        "code" = ${body.code?.trim() || null},
        "name" = ${name},
        "parentCategoryId" = ${body.parentCategoryId?.trim() || null},
        description = ${body.description?.trim() || null},
        "displayOrder" = ${Number(body.displayOrder ?? 0)},
        "isActive" = ${body.isActive ?? true},
        "updatedAt" = NOW()
      WHERE id = ${id} AND "isArchived" = false
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Failed to update category", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}
