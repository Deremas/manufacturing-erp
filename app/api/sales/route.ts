import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanAccessLocation, assertUserCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { createPostedSale, listSales } from "@/services/sales/sales.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    if (channel) {
      assertUserCanUseSalesChannel(user, channel);
    }
    const items = await listSales({
      accessibleLocationIds: user.accessibleLocationIds,
      channel,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load sales",
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
    assertUserCanAccessLocation(user, body.locationId);
    if (body.channel) {
      assertUserCanUseSalesChannel(user, body.channel);
    }
    const result = await createPostedSale(body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });

    return NextResponse.json({ item: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to post sale",
      },
      { status: 400 },
    );
  }
}
