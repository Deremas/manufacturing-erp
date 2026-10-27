import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { createVehicle, getVehicles } from "@/services/fleet/fleet.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: await getVehicles() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const item = await createVehicle(body);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create vehicle" }, { status: 400 });
  }
}
