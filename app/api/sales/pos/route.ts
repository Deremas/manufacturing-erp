import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanAccessLocation } from "@/services/sales/sales-access.service";
import { postPointOfSaleSale } from "@/services/sales/pos.service";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    assertUserCanAccessLocation(user, body.locationId);
    const result = await postPointOfSaleSale(body, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });

    return NextResponse.json({ item: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to post POS sale",
      },
      { status: 400 },
    );
  }
}
