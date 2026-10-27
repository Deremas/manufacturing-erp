import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { updateFleetTripReconciliation } from "@/services/fleet/fleet.service";

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
    const body = (await request.json()) as { decision?: string; note?: string };

    const item = await updateFleetTripReconciliation(
      id,
      {
        decision: String(body.decision ?? ""),
        note: body.note ?? "",
      },
      {
        userId: user.id,
        accessibleLocationIds: user.accessibleLocationIds,
      },
    );

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update trip reconciliation" },
      { status: 400 },
    );
  }
}
