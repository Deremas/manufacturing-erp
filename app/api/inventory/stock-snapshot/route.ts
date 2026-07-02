import { NextResponse } from "next/server";

import { getInventoryStockSnapshot } from "@/services/inventory/inventory-insights.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const locationId = searchParams.get("locationId");

  if (!itemId || !locationId) {
    return NextResponse.json({ error: "itemId and locationId are required" }, { status: 400 });
  }

  const snapshot = await getInventoryStockSnapshot(itemId, locationId);
  if (!snapshot) {
    return NextResponse.json({ error: "Stock snapshot not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
