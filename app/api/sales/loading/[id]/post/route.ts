import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  assertUserCanManageLoadingAction,
} from "@/services/sales/sales-access.service";
import {
  getLoadingOrderById,
  postLoadingOrder,
} from "@/services/sales/loading-order.service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    assertUserCanManageLoadingAction(user, "create");

    const existing = await getLoadingOrderById(id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });
    if (!existing) {
      return NextResponse.json({ error: "Loading order not found" }, { status: 404 });
    }

    const item = await postLoadingOrder(id, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to reserve loading order stock",
      },
      { status: 400 },
    );
  }
}
