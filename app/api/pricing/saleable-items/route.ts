import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { getSaleableItems } from "@/services/master-data/priceListService";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getSaleableItems();
  return NextResponse.json({ items });
}
