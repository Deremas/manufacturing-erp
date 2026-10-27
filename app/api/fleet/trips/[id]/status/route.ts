import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { transitionFleetTripStatus } from "@/services/fleet/fleet.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: string };
    const rawStatus = String(body.status ?? "").trim().toUpperCase();

    if (
      rawStatus !== "PLANNED" &&
      rawStatus !== "ASSIGNED" &&
      rawStatus !== "LOADING" &&
      rawStatus !== "DISPATCHED" &&
      rawStatus !== "IN_TRANSIT" &&
      rawStatus !== "ARRIVED" &&
      rawStatus !== "COMPLETED" &&
      rawStatus !== "CANCELLED"
    ) {
      return NextResponse.json({ error: "Invalid trip status" }, { status: 400 });
    }

    const item = await transitionFleetTripStatus(id, rawStatus, {
      userId: user.id,
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update trip status",
      },
      { status: 400 },
    );
  }
}
