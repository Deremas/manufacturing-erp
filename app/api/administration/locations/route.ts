import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const locationCode = String(body.locationCode ?? "").trim();
    const locationName = String(body.locationName ?? "").trim();
    const locationType = String(body.locationType ?? "").trim();
    if (!locationCode || !locationName || !locationType) {
      return NextResponse.json(
        { error: "Location code, name, and type are required" },
        { status: 400 },
      );
    }

    const rows = await sql<Array<{ id: string; publicId: number }>>`
      INSERT INTO "Location" (
        "locationCode",
        "locationName",
        "locationType",
        address,
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${locationCode},
        ${locationName},
        ${locationType},
        ${String(body.address ?? "").trim() || null},
        ${body.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING id, "publicId"
    `;

    const created = rows[0];
    if (!created) {
      return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, id: created.id, publicId: created.publicId },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create location", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
