import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanManageSalesOrderAction } from "@/services/sales/sales-commercial-access.service";
import { approveSalesOrder, rejectSalesOrder } from "@/services/sales/sales-order.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertUserCanManageSalesOrderAction(user, "approve");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "approve").trim().toLowerCase();
    const comment = body.comment ? String(body.comment) : null;

    const item = action === "reject"
      ? await rejectSalesOrder(id, {
          userId: user.id,
          userName: user.name ?? user.email ?? "System User",
        }, comment)
      : await approveSalesOrder(id, {
          userId: user.id,
          userName: user.name ?? user.email ?? "System User",
        }, comment);

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update approval" },
      { status: 400 },
    );
  }
}
