import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  assertUserCanAccessLocation,
  assertUserCanManageLoadingAction,
  assertUserCanUseSalesChannel,
} from "@/services/sales/sales-access.service";
import {
  getLoadingOrderById,
  updateLoadingOrder,
} from "@/services/sales/loading-order.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const item = await getLoadingOrderById(id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });
    if (!item) {
      return NextResponse.json({ error: "Loading order not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load loading order",
      },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    assertUserCanManageLoadingAction(user, "create");
    assertUserCanUseSalesChannel(user, body.channel);
    assertUserCanAccessLocation(user, body.fromLocationId);

    const existing = await getLoadingOrderById(id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });
    if (!existing) {
      return NextResponse.json({ error: "Loading order not found" }, { status: 404 });
    }

    const item = await updateLoadingOrder(id, body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update loading order",
      },
      { status: 400 },
    );
  }
}
