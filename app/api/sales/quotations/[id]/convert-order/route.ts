import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanManageQuotationAction, assertUserCanManageSalesOrderAction } from "@/services/sales/sales-commercial-access.service";
import { convertQuotationToSalesOrder } from "@/services/sales/sales-order.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertUserCanManageQuotationAction(user, "convert");
    assertUserCanManageSalesOrderAction(user, "create");
    const { id } = await params;
    const item = await convertQuotationToSalesOrder(id, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to convert quotation" }, { status: 400 });
  }
}
