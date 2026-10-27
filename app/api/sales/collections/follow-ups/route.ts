import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { createCollectionFollowUp, listCollectionFollowUps } from "@/services/sales/collections.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listCollectionFollowUps({
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load collection follow-ups",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const item = await createCollectionFollowUp(
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
        error: error instanceof Error ? error.message : "Failed to save collection follow-up",
      },
      { status: 400 },
    );
  }
}
