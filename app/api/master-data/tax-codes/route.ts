import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql<
      Array<{
        id: string;
        code: string | null;
        taxName: string;
        taxType: string;
        rate: number;
        isActive: boolean;
      }>
    >`
      SELECT id, code, "taxName", "taxType", rate, "isActive"
      FROM "TaxCode"
      WHERE "isArchived" = false
      ORDER BY "taxName" ASC
    `;

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        code: row.code ?? "",
        taxName: row.taxName,
        taxType: row.taxType,
        rate: row.rate,
        isActive: row.isActive,
      })),
    );
  } catch (error) {
    console.error("Failed to load tax codes", error);
    return NextResponse.json({ error: "Failed to load tax codes" }, { status: 500 });
  }
}
