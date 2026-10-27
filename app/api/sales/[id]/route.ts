import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { getSaleById } from "@/services/sales/sales.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const item = await getSaleById(id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });
    if (!item) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load sale",
      },
      { status: 400 },
    );
  }
}
