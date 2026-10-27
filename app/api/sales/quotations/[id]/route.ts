import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanAccessLocation, assertUserCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { assertUserCanManageQuotationAction } from "@/services/sales/sales-commercial-access.service";
import { getSalesQuotationById, updateSalesQuotation } from "@/services/sales/quotation.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertUserCanManageQuotationAction(user, "view");
    const { id } = await params;
    const item = await getSalesQuotationById(id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    if (!item) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load quotation" },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertUserCanManageQuotationAction(user, "edit");
    const { id } = await params;
    const body = await request.json();
    assertUserCanUseSalesChannel(user, body.channel);
    assertUserCanAccessLocation(user, body.locationId);

    const item = await updateSalesQuotation(id, body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update quotation" },
      { status: 400 },
    );
  }
}
