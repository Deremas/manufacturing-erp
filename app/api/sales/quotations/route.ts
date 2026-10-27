import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanAccessLocation, assertUserCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { assertUserCanManageQuotationAction } from "@/services/sales/sales-commercial-access.service";
import { createSalesQuotation, listSalesQuotations } from "@/services/sales/quotation.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertUserCanManageQuotationAction(user, "view");
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    if (channel) {
      assertUserCanUseSalesChannel(user, channel);
    }

    const items = await listSalesQuotations({
      accessibleLocationIds: user.accessibleLocationIds,
      channel,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load quotations" },
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
    assertUserCanManageQuotationAction(user, "create");
    const body = await request.json();
    assertUserCanUseSalesChannel(user, body.channel);
    assertUserCanAccessLocation(user, body.locationId);

    const item = await createSalesQuotation(body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save quotation" },
      { status: 400 },
    );
  }
}
