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
        customerCode: string;
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        city: string | null;
        region: string | null;
        creditLimit: number | null;
        paymentTerms: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        id,
        "customerCode",
        name,
        phone,
        email,
        address,
        city,
        region,
        "creditLimit",
        "paymentTerms",
        "isActive"
      FROM "Customer"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      customerCode: row.customerCode ?? "",
      name: row.name,
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
      city: row.city ?? "",
      region: row.region ?? "",
      creditLimit: row.creditLimit ?? 0,
      paymentTerms: row.paymentTerms ?? "",
      isActive: row.isActive,
    });
  } catch (error) {
    console.error("Failed to load customer", error);
    return NextResponse.json({ error: "Failed to load customer" }, { status: 500 });
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
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const rows = await sql<Array<{ id: string }>>`
      UPDATE "Customer"
      SET
        "customerCode" = ${body.customerCode?.trim() || null},
        name = ${name},
        phone = ${body.phone?.trim() || null},
        email = ${body.email?.trim() || null},
        address = ${body.address?.trim() || null},
        city = ${body.city?.trim() || null},
        region = ${body.region?.trim() || null},
        "creditLimit" = ${Number(body.creditLimit ?? 0)},
        "paymentTerms" = ${body.paymentTerms?.trim() || null},
        "isActive" = ${body.isActive ?? true},
        "updatedAt" = NOW()
      WHERE id = ${id} AND "isArchived" = false
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Failed to update customer", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
