import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  archiveFleetTrip,
  getFleetTripById,
  updateFleetTrip,
} from "@/services/fleet/fleet.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getFleetTripById(id, { accessibleLocationIds: user.accessibleLocationIds });
  if (!item) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

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
    const item = await updateFleetTrip(id, body, {
      userId: user.id,
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update trip" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await archiveFleetTrip(id, {
      userId: user.id,
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to archive trip" },
      { status: 400 },
    );
  }
}
