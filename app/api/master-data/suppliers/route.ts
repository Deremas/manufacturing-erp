import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO "Supplier" (
        "supplierCode",
        name,
        "contactPerson",
        phone,
        email,
        address,
        city,
        region,
        "paymentTerms",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${body.supplierCode?.trim() || null},
        ${name},
        ${body.contactPerson?.trim() || null},
        ${body.phone?.trim() || null},
        ${body.email?.trim() || null},
        ${body.address?.trim() || null},
        ${body.city?.trim() || null},
        ${body.region?.trim() || null},
        ${body.paymentTerms?.trim() || null},
        ${body.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: rows[0]?.id });
  } catch (error) {
    console.error("Failed to create supplier", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
