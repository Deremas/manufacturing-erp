import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanManageLoadingAction } from "@/services/sales/sales-access.service";
import {
  confirmLoadingOrderSale,
  getLoadingOrderById,
} from "@/services/sales/loading-order.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          lines?: Array<{
            loadingOrderItemId?: string;
            quantity?: number;
          }>;
        }
      | null;

    assertUserCanManageLoadingAction(user, "confirm");
    const existing = await getLoadingOrderById(id, {
      accessibleLocationIds: user.accessibleLocationIds,
    });
    if (!existing) {
      return NextResponse.json({ error: "Loading order not found" }, { status: 404 });
    }

    const item = await confirmLoadingOrderSale(
      id,
      body
        ? {
            lines: (body.lines ?? []).map((line) => ({
              loadingOrderItemId: String(line.loadingOrderItemId ?? ""),
              quantity: Number(line.quantity ?? 0),
            })),
          }
        : undefined,
      {
        userId: user.id,
        userName: user.name ?? user.email ?? "System User",
      },
    );

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to confirm loading order sale",
      },
      { status: 400 },
    );
  }
}
