import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { createCustomerReceipt, listCustomerReceipts } from "@/services/sales/accounts-receivable.service";
import { assertUserCanAccessLocation } from "@/services/sales/sales-access.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listCustomerReceipts({
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load customer receipts",
      },
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
    const body = await request.json();
    assertUserCanAccessLocation(user, body.locationId);

    const item = await createCustomerReceipt(body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    }, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to post customer receipt",
      },
      { status: 400 },
    );
  }
}
