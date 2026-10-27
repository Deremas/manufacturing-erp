import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { voidSalesCreditNote } from "@/services/sales/credit-note.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const item = await voidSalesCreditNote(
      id,
      {
        userId: user.id,
        userName: user.name ?? user.email ?? "System User",
      },
      {
        reason: body.reason,
      },
      {
        accessibleLocationIds: user.accessibleLocationIds,
      },
    );

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to void credit note",
      },
      { status: 400 },
    );
  }
}
