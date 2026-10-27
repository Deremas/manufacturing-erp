import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { getItemPrice } from "@/services/pricing/pricing.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = String(searchParams.get("itemId") ?? "").trim();
  const channel = String(searchParams.get("channel") ?? "").trim();
  const date = String(searchParams.get("date") ?? "").trim();

  if (!itemId || !channel || !date) {
    return NextResponse.json(
      { error: "itemId, channel, and date are required" },
      { status: 400 },
    );
  }

  try {
    const item = await getItemPrice(
      itemId,
      channel,
      date,
      Number(searchParams.get("quantity") ?? 1),
      {
        customerId: searchParams.get("customerId"),
        locationId: searchParams.get("locationId"),
        customerGroup: searchParams.get("customerGroup"),
        agentId: searchParams.get("agentId"),
      },
    );

    const locationId = searchParams.get("locationId");
    let availableQty: number | undefined;
    if (locationId) {
      const stockRows = await sql<Array<{ availableQuantity: number }>>`
        SELECT COALESCE("availableQuantity", 0) AS "availableQuantity"
        FROM "StockBalance"
        WHERE "itemId" = ${itemId}
          AND "locationId" = ${locationId}
          AND "isArchived" = false
        LIMIT 1
      `;
      availableQty = Number(stockRows[0]?.availableQuantity ?? 0);
    }

    return NextResponse.json({ item: { ...item, availableQty } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to resolve item price",
      },
      { status: 400 },
    );
  }
}
