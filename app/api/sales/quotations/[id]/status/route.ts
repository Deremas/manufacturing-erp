import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { assertUserCanManageQuotationAction } from "@/services/sales/sales-commercial-access.service";
import { transitionSalesQuotation } from "@/services/sales/quotation.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status ?? "").trim().toUpperCase();
    const action = status === "ACCEPTED" ? "accept" : status === "REJECTED" ? "reject" : "edit";
    assertUserCanManageQuotationAction(user, action);
    if (!["SENT", "ACCEPTED", "REJECTED", "EXPIRED"].includes(status)) {
      throw new Error("Unsupported quotation status action");
    }
    const item = await transitionSalesQuotation(
      id,
      status as "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED",
      { userId: user.id, userName: user.name ?? user.email ?? "System User" },
      body.comment ? String(body.comment) : null,
    );
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update quotation" }, { status: 400 });
  }
}
