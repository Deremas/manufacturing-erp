import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { createSalesInvoiceFromDispatch } from "@/services/sales/sales-invoice.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const item = await createSalesInvoiceFromDispatch(id, {
      userId: user.id,
      userName: user.name ?? user.email ?? "System User",
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice from dispatch" },
      { status: 400 },
    );
  }
}
