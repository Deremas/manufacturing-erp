import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanManageSalesOrderAction } from "@/services/sales/sales-commercial-access.service";
import { cancelSalesOrder } from "@/services/sales/sales-order.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertUserCanManageSalesOrderAction(user, "cancel");
    const { id } = await params;
    const body = await request.json();
    const item = await cancelSalesOrder(
      id,
      { userId: user.id, userName: user.name ?? user.email ?? "System User" },
      String(body.reason ?? ""),
    );
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to cancel sales order" }, { status: 400 });
  }
}
