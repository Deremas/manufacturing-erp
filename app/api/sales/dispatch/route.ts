import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { listSalesDispatches } from "@/services/sales/sales-dispatch.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const items = await listSalesDispatches({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: url.searchParams.get("channel"),
      tripId: url.searchParams.get("tripId"),
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dispatch register" },
      { status: 400 },
    );
  }
}
