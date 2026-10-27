import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { updateCollectionFollowUp } from "@/services/sales/collections.service";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const item = await updateCollectionFollowUp(
      id,
      body,
      {
        userId: user.id,
        userName: user.name ?? user.email ?? "System User",
      },
      {
        accessibleLocationIds: user.accessibleLocationIds,
      },
    );

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update collection follow-up",
      },
      { status: 400 },
    );
  }
}
