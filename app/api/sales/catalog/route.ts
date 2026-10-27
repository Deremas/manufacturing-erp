import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanAccessLocation, assertUserCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { getPosCatalog } from "@/services/sales/pos.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const saleDate = searchParams.get("saleDate");
  const locationId = searchParams.get("locationId");
  const channel = searchParams.get("channel");
  const customerId = searchParams.get("customerId");
  const agentId = searchParams.get("agentId");
  const customerGroup = searchParams.get("customerGroup");

  if (!saleDate || !locationId) {
    return NextResponse.json(
      { error: "saleDate and locationId are required" },
      { status: 400 },
    );
  }

  try {
    assertUserCanAccessLocation(user, locationId);
    if (channel) {
      assertUserCanUseSalesChannel(user, channel);
    }

    const catalog = await getPosCatalog({
      saleDate,
      locationId,
      channel,
      customerId,
      agentId,
      customerGroup,
    });

    return NextResponse.json(catalog);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load sales catalog",
      },
      { status: 400 },
    );
  }
}
