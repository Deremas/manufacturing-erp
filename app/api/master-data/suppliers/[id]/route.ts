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
        supplierCode: string;
        name: string;
        contactPerson: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        city: string | null;
        region: string | null;
        paymentTerms: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        id,
        "supplierCode",
        name,
        "contactPerson",
        phone,
        email,
        address,
        city,
        region,
        "paymentTerms",
        "isActive"
      FROM "Supplier"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      supplierCode: row.supplierCode ?? "",
      name: row.name,
      contactPerson: row.contactPerson ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
      city: row.city ?? "",
      region: row.region ?? "",
      paymentTerms: row.paymentTerms ?? "",
      isActive: row.isActive,
    });
  } catch (error) {
    console.error("Failed to load supplier", error);
    return NextResponse.json({ error: "Failed to load supplier" }, { status: 500 });
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
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const rows = await sql<Array<{ id: string }>>`
      UPDATE "Supplier"
      SET
        "supplierCode" = ${body.supplierCode?.trim() || null},
        name = ${name},
        "contactPerson" = ${body.contactPerson?.trim() || null},
        phone = ${body.phone?.trim() || null},
        email = ${body.email?.trim() || null},
        address = ${body.address?.trim() || null},
        city = ${body.city?.trim() || null},
        region = ${body.region?.trim() || null},
        "paymentTerms" = ${body.paymentTerms?.trim() || null},
        "isActive" = ${body.isActive ?? true},
        "updatedAt" = NOW()
      WHERE id = ${id} AND "isArchived" = false
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Failed to update supplier", error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}
