import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { createAndPostBankTransfer, listBankTransfers } from "@/services/finance/bank-transfer.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await listBankTransfers() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const item = await createAndPostBankTransfer({
      ...body,
      amount: Number(body.amount),
      createdById: user.id,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to post bank transfer" }, { status: 400 });
  }
}
