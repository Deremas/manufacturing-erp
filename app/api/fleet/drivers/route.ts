import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { createFleetDriver, getFleetDrivers } from "@/services/fleet/fleet.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: await getFleetDrivers() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const item = await createFleetDriver(body);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create driver" }, { status: 400 });
  }
}
