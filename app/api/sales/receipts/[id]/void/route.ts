import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { voidCustomerReceipt } from "@/services/sales/accounts-receivable.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id } = await context.params;

    const item = await voidCustomerReceipt(
      id,
      {
        userId: user.id,
        userName: user.name ?? user.email ?? "System User",
      },
      {
        reason: typeof body.reason === "string" ? body.reason : null,
      },
      {
        accessibleLocationIds: user.accessibleLocationIds,
      },
    );

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to void customer receipt",
      },
      { status: 400 },
    );
  }
}
