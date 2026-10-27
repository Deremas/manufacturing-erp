import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { getPriceListUsage } from "@/services/master-data/priceListService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const items = await getPriceListUsage(id);
  return NextResponse.json({ items });
}
