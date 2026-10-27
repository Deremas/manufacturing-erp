import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanAccessLocation } from "@/services/sales/sales-access.service";
import { createPostedSalesReturn, getSaleById, listSalesReturns } from "@/services/sales/sales.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listSalesReturns({
      accessibleLocationIds: user.accessibleLocationIds,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load sales returns",
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
    if (body.saleId) {
      const sale = await getSaleById(body.saleId, {
        accessibleLocationIds: user.accessibleLocationIds,
      });
      if (!sale) {
        return NextResponse.json({ error: "Sale not found" }, { status: 404 });
      }
    }
    const item = await createPostedSalesReturn(body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to post sales return",
      },
      { status: 400 },
    );
  }
}
