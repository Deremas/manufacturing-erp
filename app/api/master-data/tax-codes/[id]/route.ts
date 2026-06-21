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
        taxName: string;
        taxType: string;
        rate: number;
        description: string | null;
        appliesTo: string | null;
        isDefault: boolean;
        isActive: boolean;
      }>
    >`
      SELECT id, code, "taxName", "taxType", rate, description, "appliesTo", "isDefault", "isActive"
      FROM "TaxCode"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Tax code not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      code: row.code ?? "",
      taxName: row.taxName,
      taxType: row.taxType,
      rate: row.rate,
      description: row.description ?? "",
      appliesTo: row.appliesTo ?? "BOTH",
      isDefault: row.isDefault,
      isActive: row.isActive,
    });
  } catch (error) {
    console.error("Failed to load tax code", error);
    return NextResponse.json({ error: "Failed to load tax code" }, { status: 500 });
  }
}
