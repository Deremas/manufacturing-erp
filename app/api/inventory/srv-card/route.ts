import { NextResponse } from "next/server";

import { getSrvCard } from "@/services/inventory/srv-card.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId")?.trim();
  if (!itemId) {
    return NextResponse.json({ error: "Select an item to generate the SRV card." }, { status: 400 });
  }

  try {
    const card = await getSrvCard({
      itemId,
      dateFrom: searchParams.get("dateFrom")?.trim() || undefined,
      dateTo: searchParams.get("dateTo")?.trim() || undefined,
    });
    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate the SRV card." },
      { status: 400 },
    );
  }
}
