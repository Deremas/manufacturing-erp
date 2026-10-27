import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createFuelRecord, getFuelRecords } from "@/services/fleet/fleet.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getFuelRecords({ accessibleLocationIds: user.accessibleLocationIds });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const item = await createFuelRecord(body, {
      userId: user.id,
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create fuel record" },
      { status: 400 },
    );
  }
}
