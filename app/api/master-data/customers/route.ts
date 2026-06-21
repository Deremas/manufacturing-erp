import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO "Customer" (
        "customerCode",
        name,
        phone,
        email,
        address,
        city,
        region,
        "creditLimit",
        "paymentTerms",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${body.customerCode?.trim() || null},
        ${name},
        ${body.phone?.trim() || null},
        ${body.email?.trim() || null},
        ${body.address?.trim() || null},
        ${body.city?.trim() || null},
        ${body.region?.trim() || null},
        ${Number(body.creditLimit ?? 0)},
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
    console.error("Failed to create customer", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
