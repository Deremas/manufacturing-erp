import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
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
      UPDATE "Location"
      SET
        "locationCode" = ${locationCode},
        "locationName" = ${locationName},
        "locationType" = ${locationType},
        address = ${String(body.address ?? "").trim() || null},
        "isActive" = ${body.isActive ?? true},
        "updatedAt" = NOW()
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`}
        AND "isArchived" = false
      RETURNING id, "publicId"
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: rows[0].id,
      publicId: rows[0].publicId,
    });
  } catch (error) {
    console.error("Failed to update location", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
