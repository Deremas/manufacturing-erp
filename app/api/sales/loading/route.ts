import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  assertUserCanAccessLocation,
  assertUserCanManageLoadingAction,
  assertUserCanUseSalesChannel,
} from "@/services/sales/sales-access.service";
import {
  createLoadingOrder,
  listLoadingOrders,
} from "@/services/sales/loading-order.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");

  try {
    if (channel) {
      assertUserCanUseSalesChannel(user, channel);
    }

    const items = await listLoadingOrders({
      accessibleLocationIds: user.accessibleLocationIds,
      channel,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load loading orders",
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
    assertUserCanManageLoadingAction(user, "create");
    assertUserCanUseSalesChannel(user, body.channel);
    assertUserCanAccessLocation(user, body.fromLocationId);

    const item = await createLoadingOrder(body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save loading order",
      },
      { status: 400 },
    );
  }
}
