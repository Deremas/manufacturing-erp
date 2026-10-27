import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { archiveVehicle, updateVehicle } from "@/services/fleet/fleet.service";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = await context.params;
    const item = await updateVehicle(id, body);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update vehicle" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await archiveVehicle(id);
  return NextResponse.json({ success: true });
}
