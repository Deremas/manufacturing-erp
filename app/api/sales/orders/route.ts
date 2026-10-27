import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanAccessLocation, assertUserCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { assertUserCanManageSalesOrderAction } from "@/services/sales/sales-commercial-access.service";
import { createSalesOrder, listSalesOrders } from "@/services/sales/sales-order.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertUserCanManageSalesOrderAction(user, "view");
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    if (channel) {
      assertUserCanUseSalesChannel(user, channel);
    }

    const items = await listSalesOrders({
      accessibleLocationIds: user.accessibleLocationIds,
      channel,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load sales orders" },
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
    assertUserCanManageSalesOrderAction(user, "create");
    const body = await request.json();
    assertUserCanUseSalesChannel(user, body.channel);
    assertUserCanAccessLocation(user, body.locationId);

    const item = await createSalesOrder(body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save sales order" },
      { status: 400 },
    );
  }
}
