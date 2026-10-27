import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { getCustomerReceiptById, updateCustomerReceipt } from "@/services/sales/accounts-receivable.service";
import { assertUserCanAccessLocation } from "@/services/sales/sales-access.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const item = await getCustomerReceiptById(id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    if (!item) {
      return NextResponse.json({ error: "Customer receipt not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load customer receipt",
      },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    assertUserCanAccessLocation(user, body.locationId);

    const item = await updateCustomerReceipt(
      id,
      body,
      {
        userId: user.id,
        userName: user.name ?? user.email ?? "System User",
      },
      {
        accessibleLocationIds: user.accessibleLocationIds,
      },
    );

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update customer receipt",
      },
      { status: 400 },
    );
  }
}
